import { currentlyBuilding, useGitHubData } from '../data/github';
import { relativeTime } from '../lib/relativeTime';
import { copy } from '../theme/copy';
import { useTheme } from '../theme/useTheme';

/**
 * Compact "currently building" chip — a live activity signal. Renders nothing
 * until data resolves, so it degrades gracefully.
 *
 * Mounted twice (the shell's top row below lg, the hero at lg and up), so callers
 * gate visibility on a *wrapper*, never with a display utility on this element:
 * the class list below sets `inline-flex`, and `.inline-flex` is emitted after
 * `.hidden`, so `hidden` here would lose to it and the chip would render twice.
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
      {/* Truncates rather than pushing the row wider — this sits in the profile
          column at md, which is only ~16rem. */}
      <span className="truncate text-foreground group-hover:text-accent-start">
        {activity.repo}
      </span>
      {when && <span className="hidden text-muted sm:inline">· {when}</span>}
    </a>
  );
}
