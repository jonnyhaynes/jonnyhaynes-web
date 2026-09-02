import { useCallback, useEffect, useRef, useState } from 'react';
import type { GitHubProject } from '../../data/github';
import { useReducedMotion } from '../../lib/useReducedMotion';
import {
  completeProject,
  runCommand,
  type ScreenLine,
  type ShellResult,
} from './shell';

const PROMPT_USER = 'visitor@jonnyhaynes.com';

/** A screen line plus a stable id so React can key the scrollback. */
type Entry = ScreenLine & { id: number };

/**
 * The interactive Projects terminal. Renders a shell window whose commands are
 * handled by `runCommand` (see shell.ts). Drives everything the visitor can do:
 * type commands, click project names / chips, use the quick-command bar, history
 * (↑/↓) and tab-completion. Self-demonstrates on load with an auto-typed demo,
 * and stays fully usable — and animation-free — under prefers-reduced-motion.
 *
 * The accessible source of truth is the sibling sr-only list; this terminal's
 * output is supplementary (announced via aria-live but not the canonical copy).
 */
export function ProjectsTerminal({ projects }: { projects: GitHubProject[] }) {
  const reduced = useReducedMotion();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cwd, setCwd] = useState<string | null>(null);
  const [value, setValue] = useState('');

  const screenRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  const cwdRef = useRef<string | null>(null);
  const history = useRef<string[]>([]);
  const historyIdx = useRef(0);
  const demoCancelled = useRef(false);
  const demoTimers = useRef<number[]>([]);

  // Mirror cwd into a ref so exec() (fired from the demo / delegated clicks)
  // always reads the current value without being re-created on every cwd change.
  useEffect(() => {
    cwdRef.current = cwd;
  }, [cwd]);

  const addEntries = useCallback((lines: ScreenLine[]) => {
    if (lines.length === 0) return;
    setEntries((prev) => [
      ...prev,
      ...lines.map((line) => ({ ...line, id: nextId.current++ })),
    ]);
  }, []);

  const apply = useCallback(
    (result: ShellResult) => {
      if (result.clear) setEntries([]);
      addEntries(result.lines);
      if (result.cwd !== undefined) setCwd(result.cwd);
      if (result.open) window.open(result.open, '_blank', 'noreferrer');
    },
    [addEntries],
  );

  // Run a command string as if typed. Reads cwd from a ref so it's always fresh
  // even when fired from the auto-demo or a delegated click.
  const exec = useCallback(
    (raw: string) => apply(runCommand(raw, projects, cwdRef.current)),
    [apply, projects],
  );

  // Keep the scrollback pinned to the newest line.
  useEffect(() => {
    const el = screenRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  // Boot: greeting, then either an auto-demo (types ls, then cd) or, under
  // reduced motion, an immediate `ls`. All state changes are scheduled on a
  // timer (never synchronous in the effect body) so the boot can't cascade
  // renders. Timers are tracked in a local array and cleared on unmount.
  useEffect(() => {
    const timers = demoTimers.current;
    const schedule = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    schedule(() => {
      addEntries([
        {
          kind: 'hint',
          text: `jsh — jonny shell · ${projects.length} projects · plain English works too (“show projects”, “open skillswap”).`,
          chips: [{ label: 'help', run: 'help' }],
        },
      ]);

      if (reduced) {
        exec('ls');
        return;
      }

      const type = (text: string, done: () => void) => {
        let i = 0;
        const step = () => {
          if (demoCancelled.current) {
            setValue('');
            done();
            return;
          }
          setValue(text.slice(0, i++));
          if (i <= text.length) schedule(step, 55 + (i % 3) * 25);
          else
            schedule(() => {
              setValue('');
              done();
            }, 400);
        };
        step();
      };

      type('ls', () => {
        exec('ls');
        if (demoCancelled.current) return;
        schedule(
          () =>
            type('cd cmux-sentinel', () => {
              if (!demoCancelled.current) exec('cd cmux-sentinel');
            }),
          650,
        );
      });
    }, 400);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
    // Boot once on mount; deps intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelDemo = () => {
    if (demoCancelled.current) return;
    demoCancelled.current = true;
    demoTimers.current.forEach((t) => window.clearTimeout(t));
    setValue('');
  };

  const submit = () => {
    const raw = value;
    if (raw.trim()) {
      history.current.push(raw);
      historyIdx.current = history.current.length;
    }
    exec(raw);
    setValue('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    cancelDemo();
    if (e.key === 'Enter') {
      submit();
    } else if (e.key === 'ArrowUp') {
      if (history.current.length) {
        historyIdx.current = Math.max(0, historyIdx.current - 1);
        setValue(history.current[historyIdx.current] ?? '');
        e.preventDefault();
      }
    } else if (e.key === 'ArrowDown') {
      if (history.current.length) {
        historyIdx.current = Math.min(history.current.length, historyIdx.current + 1);
        setValue(history.current[historyIdx.current] ?? '');
        e.preventDefault();
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = value.split(/\s+/);
      if (parts[0] === 'cd' && parts[1] !== undefined) {
        const done = completeProject(parts[1], projects);
        if (done) setValue(`cd ${done}`);
      }
    }
  };

  const path = cwd ? `~/projects/${cwd}` : '~/projects';
  const placeholder = cwd
    ? 'try: open repo · back · help'
    : 'try: ls · cd skillswap · or plain English';

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--term-border)] bg-[var(--term-screen-bottom)] shadow-[var(--term-shadow)]">
        {/* Title bar */}
        <div className="flex items-center gap-1.5 border-b border-black/45 bg-[var(--term-screen-top)] px-3 py-2.5">
          <span className="size-2.5 rounded-full bg-[var(--term-dot-r)]" />
          <span className="size-2.5 rounded-full bg-[var(--term-dot-y)]" />
          <span className="size-2.5 rounded-full bg-[var(--term-dot-g)]" />
          <span className="ml-2 font-mono text-[0.66rem] tracking-wide text-[var(--term-title)]">
            {PROMPT_USER}: {path}
          </span>
        </div>

        {/* Scrollback */}
        <div
          ref={screenRef}
          aria-live="polite"
          className="h-[27rem] overflow-y-auto px-4 pb-2 pt-4 font-mono text-[0.82rem] leading-relaxed max-sm:h-[24rem] max-sm:text-[0.78rem]"
        >
          {entries.map((entry) => (
            <ScreenLineView key={entry.id} line={entry} onRun={exec} />
          ))}
        </div>

        {/* Prompt row */}
        <div className="flex items-center gap-2 px-4 pb-4 pt-1 font-mono text-[0.82rem]">
          <span className="shrink-0 select-none whitespace-nowrap text-accent-start">
            {PROMPT_USER}
            <span className="text-[color-mix(in_oklch,var(--color-accent-start)_70%,var(--color-foreground))]">
              :{path}
            </span>
            $
          </span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Projects terminal — type a command like ls or cd, or plain English"
            placeholder={placeholder}
            className="min-w-0 flex-1 border-none bg-transparent text-foreground caret-accent-start outline-none placeholder:text-muted/55"
          />
        </div>
      </div>
  );
}

/** Render one scrollback line by kind. */
function ScreenLineView({
  line,
  onRun,
}: {
  line: ScreenLine;
  onRun: (cmd: string) => void;
}) {
  switch (line.kind) {
    case 'echo': {
      const path = line.cwd ? `~/projects/${line.cwd}` : '~/projects';
      return (
        <div className="whitespace-pre-wrap break-words text-foreground">
          <span className="select-none text-accent-start">
            {PROMPT_USER}
            <span className="text-[color-mix(in_oklch,var(--color-accent-start)_70%,var(--color-foreground))]">
              :{path}
            </span>
            ${' '}
          </span>
          {line.text}
        </div>
      );
    }

    case 'text':
      return (
        <div className="mb-2.5 whitespace-pre-wrap break-words text-[var(--term-dim)]">
          {line.text}
        </div>
      );

    case 'ls':
      return (
        <div className="mb-3 mt-0.5 flex flex-col gap-0.5">
          {line.projects.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => onRun(`cd ${p.name}`)}
              className="group flex w-fit items-center gap-2 text-left text-[var(--term-text)] transition-colors hover:text-accent-start focus-visible:text-accent-start focus-visible:outline-none"
            >
              <span className="text-accent-start opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                →
              </span>
              {p.name}/
              {p.isFork && (
                <span className="rounded-full border border-accent-start/45 bg-accent-start/10 px-1.5 text-[0.62rem] uppercase tracking-wider text-accent-start">
                  fork
                </span>
              )}
            </button>
          ))}
        </div>
      );

    case 'detail': {
      const p = line.project;
      const pitch = p.pitch ?? p.description;
      const stack = p.languages.length
        ? p.languages
        : p.language
          ? [p.language]
          : [];
      return (
        <div className="mb-3 mt-0.5 flex flex-col gap-1">
          {pitch && <Row k="pitch" v={pitch} />}
          {stack.length > 0 && <Row k="stack" v={stack.join(', ')} dim />}
          {p.challenge && <Row k="hardest" v={p.challenge} accent />}
          <div className="flex gap-1.5 whitespace-pre-wrap break-words">
            <span className="w-[4.5rem] shrink-0 text-accent-start">links</span>
            <span>
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent-start hover:underline"
              >
                repo↗
              </a>
              {p.homepageUrl && (
                <>
                  {' · '}
                  <a
                    href={p.homepageUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-accent-start hover:underline"
                  >
                    live↗
                  </a>
                </>
              )}
            </span>
          </div>
        </div>
      );
    }

    case 'help':
      return (
        <div className="mb-3 mt-0.5">
          <div className="mb-1.5 text-[var(--term-dim)]">
            Two ways to drive this: real commands, or plain English. Or just click.
          </div>
          <dl className="grid grid-cols-[minmax(9rem,auto)_1fr] gap-x-4 gap-y-1">
            <HelpRow cmd={'ls · “show projects”'} desc="list all projects" />
            <HelpRow
              cmd={'cd <name> · “open skillswap”'}
              desc="open a project (Tab completes; “back” returns)"
            />
            <HelpRow cmd="open [repo|live]" desc="open the current project's links" />
            <HelpRow cmd={'cat · “details”'} desc="show the current project again" />
            <HelpRow cmd="clear · help" desc="clear the screen · this list" />
          </dl>
        </div>
      );

    case 'hint':
      return (
        <div className="mb-2.5 whitespace-pre-wrap break-words text-[var(--term-dim)]">
          {line.text}{' '}
          {line.chips.map((chip, i) => (
            <span key={chip.run}>
              <button
                type="button"
                onClick={() => onRun(chip.run)}
                className="rounded border border-accent-start/35 bg-accent-start/10 px-1.5 text-accent-start transition-colors hover:bg-accent-start/20"
              >
                {chip.label}
              </button>
              {i < line.chips.length - 1 ? ' ' : ''}
            </span>
          ))}
        </div>
      );

    default:
      return null;
  }
}

function Row({
  k,
  v,
  dim,
  accent,
}: {
  k: string;
  v: string;
  dim?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex gap-1.5 whitespace-pre-wrap break-words">
      <span className="w-[4.5rem] shrink-0 text-accent-start">{k}</span>
      <span className={dim ? 'text-[var(--term-dim)]' : accent ? 'text-[var(--term-text)]' : ''}>
        {v}
      </span>
    </div>
  );
}

function HelpRow({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <>
      <dt className="text-accent-start">{cmd}</dt>
      <dd className="m-0 text-[var(--term-dim)]">{desc}</dd>
    </>
  );
}
