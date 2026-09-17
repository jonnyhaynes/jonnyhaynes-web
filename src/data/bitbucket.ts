import { useAsset } from '../lib/assets';

export type BitbucketData = {
  fetchedAt: string;
  /** Pull requests authored by the account and merged, across the counted workspaces. */
  mergedPullRequests: number;
  /**
   * Still-open pull requests. Null when the snapshot predates this field, so the
   * stat is omitted rather than shown as zero.
   */
  openPullRequests: number | null;
  /**
   * Distinct repositories those pull requests landed in. Null when the payload
   * didn't name them, so a schema surprise shows up as a missing stat rather than
   * a wrong one.
   */
  repositories: number | null;
  workspacesCounted: number;
  workspacesFailed: number;
};

/**
 * The baked Bitbucket snapshot — see `scripts/fetch-bitbucket.mjs`.
 *
 * Counts only. The bake deliberately publishes no repository names, workspace
 * slugs or pull-request titles, because the token behind it can read private work
 * repositories.
 *
 * Returns null until the fetch resolves, so callers render nothing rather than a
 * zero, and a failed fetch leaves the stat out entirely.
 */
export function useBitbucketData(): BitbucketData | null {
  return useAsset<BitbucketData>('bitbucket', '/data/bitbucket.json');
}
