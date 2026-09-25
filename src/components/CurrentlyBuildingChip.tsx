import { currentlyBuilding, useGitHubData } from '../data/github';
import { relativeTime } from '../lib/relativeTime';
import { copy } from '../theme/copy';
import { useTheme } from '../theme/useTheme';

/**
 * Compact "currently building" chip — a live activity signal, showing the
 * most-recently-pushed repo and how long ago that was.
 *
 * Sits beside the Projects title, where the work it describes actually is. It
 * renders nothing until the snapshot resolves, so it degrades to silent rather
 * than to an empty shell.
 *
 * The repo name truncates and the timeframe doesn't, so on a narrow phone the
 * name gives way first and "3 days ago" always survives.
 */
export function CurrentlyBuildingChip() {
  const activity = currentlyBuilding(useGitHubData());
  const { palette } = useTheme();
  if (!activity) return null;

  const when = relativeTime(activity.committedAt);

  return (
    <a
      href={activity.url}
      target="_blank"
      rel="noreferrer noopener"
      title={activity.message ?? undefined}
      className="group inline-flex min-w-0 max-w-full items-center gap-2 font-mono text-xs text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
    >
      <span
        aria-hidden="true"
        className="animate-pulse font-mono text-accent-start motion-reduce:animate-none"
      >
        _
      </span>
      <span className="text-muted">{copy(palette).chip.building}</span>
      {/* Truncates rather than pushing the row wider, and yields to the
          timeframe: the repo name gives way first, so "3 days ago" survives on a
          phone. */}
      <span className="truncate text-foreground group-hover:text-accent-start">
        {activity.repo}
      </span>
      {when && <span className="shrink-0 text-muted">· {when}</span>}
    </a>
  );
}
