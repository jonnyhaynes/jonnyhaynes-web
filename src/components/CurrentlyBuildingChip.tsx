import { currentlyBuilding, useGitHubData } from '../data/github';
import { relativeTime } from '../lib/relativeTime';

/**
 * Compact "currently building" chip for the header — a live activity signal
 * sitting opposite the theme toggle. Renders nothing until data resolves, so
 * it degrades gracefully.
 */
export function CurrentlyBuildingChip() {
  const activity = currentlyBuilding(useGitHubData());
  if (!activity) return null;

  const when = relativeTime(activity.committedAt);

  return (
    <a
      href={activity.url}
      target="_blank"
      rel="noreferrer noopener"
      title={activity.message ?? undefined}
      className="group inline-flex items-center gap-2 font-mono text-xs text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
    >
      <span
        aria-hidden="true"
        className="animate-pulse font-mono text-accent-start motion-reduce:animate-none"
      >
        _
      </span>
      <span className="text-muted">building</span>
      <span className="text-foreground group-hover:text-accent-start">
        {activity.repo}
      </span>
      {when && <span className="hidden text-muted sm:inline">· {when}</span>}
    </a>
  );
}
