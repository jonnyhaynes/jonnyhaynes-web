import type { GitHubProject } from '../../data/github';

/**
 * The Projects terminal's command engine, kept framework-free so the view stays
 * thin (and the parsing is testable in isolation). It turns a raw input string
 * into a list of ScreenLines to print, and reports cwd / side-effects (opening a
 * link) back to the caller.
 *
 * Design notes:
 * - Accepts real shell verbs AND plain English aliases, so a non-engineer can
 *   type "show projects" / "open skillswap" / "back".
 * - Mistyped commands and project names get a did-you-mean suggestion (nearest
 *   by edit distance) rather than a cold "command not found".
 */

/** A chunk of terminal output. Rich variants render as structured blocks. */
export type ScreenLine =
  | { kind: 'echo'; cwd: string | null; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'ls'; projects: GitHubProject[] }
  | { kind: 'detail'; project: GitHubProject }
  | { kind: 'help' }
  | {
      // Text with inline clickable chips (each chip re-runs a command).
      kind: 'hint';
      text: string;
      chips: { label: string; run: string }[];
    };

export type ShellResult = {
  lines: ScreenLine[];
  /** New cwd (project name) or null for the root; undefined = unchanged. */
  cwd?: string | null;
  /** Clear the scrollback before printing `lines`. */
  clear?: boolean;
  /** A URL to open in a new tab, if the command asked to. */
  open?: string;
};

const KNOWN = ['ls', 'cd', 'open', 'cat', 'info', 'help', 'clear', 'whoami'];

/** Plain-English single words/phrases → a canonical command string. */
const ALIASES: Record<string, string> = {
  show: 'ls',
  list: 'ls',
  projects: 'ls',
  'show projects': 'ls',
  menu: 'ls',
  back: 'cd ..',
  exit: 'cd ..',
  up: 'cd ..',
  home: 'cd ..',
  details: 'cat',
  about: 'cat',
  info: 'cat',
  commands: 'help',
  '?': 'help',
  h: 'help',
  reset: 'clear',
};

/** "verb <project>" plain-English forms that mean `cd <project>`. */
const CD_VERBS = /^(view|see|go|open|show|enter|about|details)\s+(.+)$/;

/** Classic Levenshtein edit distance (tiny; inputs are short). */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [
    i,
    ...Array<number>(n).fill(0),
  ]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return d[m][n];
}

const findProject = (projects: GitHubProject[], name: string) =>
  projects.find((p) => p.name.toLowerCase() === name.toLowerCase()) ?? null;

const nearest = <T>(items: T[], key: (t: T) => string, target: string) =>
  items
    .map((item) => ({ item, d: levenshtein(target.toLowerCase(), key(item).toLowerCase()) }))
    .sort((a, b) => a.d - b.d)[0] ?? null;

/**
 * Run a raw command line against the project list at the given cwd.
 * Pure: returns what to print / how state should change; the caller applies it.
 */
export function runCommand(
  raw: string,
  projects: GitHubProject[],
  cwd: string | null,
): ShellResult {
  const echoed: ScreenLine = { kind: 'echo', cwd, text: raw };
  const cmd = normalise(raw.trim(), projects);
  if (!cmd) return { lines: [echoed] };

  const [verb, ...rest] = cmd.split(/\s+/);
  const arg = rest.join(' ').replace(/\/$/, '');
  const out = (lines: ScreenLine[], extra: Partial<ShellResult> = {}) => ({
    lines: [echoed, ...lines],
    ...extra,
  });

  switch (verb.toLowerCase()) {
    case 'ls':
    case 'dir':
      return out([{ kind: 'ls', projects }]);

    case 'help':
      return out([{ kind: 'help' }]);

    case 'clear':
    case 'cls':
      return { lines: [], clear: true };

    case 'cd': {
      if (!arg || arg === '~' || arg === '/' || arg === '..') {
        return out([], { cwd: null });
      }
      const project = findProject(projects, arg);
      if (project) return out([{ kind: 'detail', project }], { cwd: project.name });
      const near = nearest(projects, (p) => p.name, arg);
      const within = near && near.d <= Math.max(3, Math.ceil(near.item.name.length * 0.4));
      return out([
        within
          ? {
              kind: 'hint',
              text: `No project called “${arg}”. Did you mean`,
              chips: [
                { label: `cd ${near.item.name}`, run: `cd ${near.item.name}` },
                { label: 'see all', run: 'ls' },
              ],
            }
          : {
              kind: 'hint',
              text: `No project called “${arg}”.`,
              chips: [{ label: 'See all projects', run: 'ls' }],
            },
      ]);
    }

    case 'cat':
    case 'less': {
      const project = cwd ? findProject(projects, cwd) : arg ? findProject(projects, arg) : null;
      if (project) return out([{ kind: 'detail', project }]);
      return out([
        {
          kind: 'hint',
          text: 'Nothing open yet —',
          chips: [{ label: 'ls', run: 'ls' }],
        },
      ]);
    }

    case 'open': {
      const project = cwd ? findProject(projects, cwd) : null;
      if (!project) {
        return out([{ kind: 'text', text: 'open: open a project first (e.g. cd skillswap).' }]);
      }
      const which = (arg || 'repo').toLowerCase();
      const href = which === 'live' ? project.homepageUrl : project.url;
      if (!href) {
        return out([{ kind: 'text', text: `open: no ${which} link for ${project.name}.` }]);
      }
      return out([{ kind: 'text', text: `opening ${project.name} ${which}… ↗` }], { open: href });
    }

    case 'whoami':
      return out([
        {
          kind: 'hint',
          text: 'jonny — frontend engineer.',
          chips: [{ label: 'ls', run: 'ls' }],
        },
      ]);

    default: {
      // A bare project name typed as a command → cd into it.
      const asProject = findProject(projects, verb);
      if (asProject) return runCommand(`cd ${asProject.name}`, projects, cwd);

      // Did-you-mean: consider BOTH the nearest command and the nearest project
      // name (someone typing "skilswap" means the project, not a command), then
      // suggest whichever is closer and within tolerance.
      const nearCmd = nearest(
        KNOWN.map((k) => ({ k })),
        (x) => x.k,
        verb,
      );
      const nearProj = nearest(projects, (p) => p.name, verb);
      const cmdOk = nearCmd && nearCmd.d <= 2;
      const projOk =
        nearProj && nearProj.d <= Math.max(3, Math.ceil(nearProj.item.name.length * 0.4));

      const suggestion =
        projOk && (!cmdOk || nearProj.d <= nearCmd.d)
          ? { label: `cd ${nearProj.item.name}`, run: `cd ${nearProj.item.name}` }
          : cmdOk
            ? { label: nearCmd.item.k, run: nearCmd.item.k }
            : null;

      return out([
        suggestion
          ? {
              kind: 'hint',
              text: `Not sure what “${verb}” means. Did you mean`,
              chips: [suggestion, { label: 'see all', run: 'ls' }],
            }
          : {
              kind: 'hint',
              text: `Not sure what “${verb}” means — try`,
              chips: [
                { label: 'ls', run: 'ls' },
                { label: 'help', run: 'help' },
              ],
            },
      ]);
    }
  }
}

/** Rewrite plain-English input to a canonical command before parsing. */
function normalise(cmd: string, projects: GitHubProject[]): string {
  const low = cmd.toLowerCase();
  if (ALIASES[low]) return ALIASES[low];
  const verbProject = low.match(CD_VERBS);
  if (verbProject && findProject(projects, verbProject[2].replace(/\/$/, ''))) {
    return `cd ${verbProject[2]}`;
  }
  return cmd;
}

/** Tab-completion: the single project name that uniquely extends `fragment`. */
export function completeProject(
  fragment: string,
  projects: GitHubProject[],
): string | null {
  const matches = projects.filter((p) =>
    p.name.toLowerCase().startsWith(fragment.toLowerCase()),
  );
  return matches.length === 1 ? matches[0].name : null;
}
