import { BUILD } from '../lib/buildInfo';

/**
 * Build stamp for the colophon — which deploy you're looking at. Inlined at build
 * time, so it's identical on server and client and can't shift during hydration.
 */
export function BuildStamp() {
  return (
    <p className="font-mono text-[0.65rem] text-muted">
      <span aria-hidden="true">// </span>
      {BUILD.version}
      <span aria-hidden="true"> · </span>
      {BUILD.sha}
      <span aria-hidden="true"> · </span>
      {BUILD.date}
    </p>
  );
}
