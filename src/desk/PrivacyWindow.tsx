import { PrivacyContent } from './PrivacyContent';
import { Dialog } from './Windows';
import { CursorArrow } from './bits';

/** The privacy policy, as a desk window. */
export function PrivacyWindow({ onClose }: { onClose: () => void }) {
  return (
    <Dialog cls="doc" labelledBy="dlg-h" onClose={onClose}>
      {(close) => (
        <>
          <div className="dhead">
            <div className="dhead-main">
              <span className="doc-kicker mono">THE SMALL PRINT</span>
              <h2 id="dlg-h">Privacy.</h2>
              <p>
                This is a small personal website. It doesn’t sell anything, run
                advertising, or build a profile of you. Here is exactly what
                happens when you visit.
              </p>
            </div>
            {close}
            <span className="clabel lb doc-cursor" aria-hidden="true">
              <span className="cur">
                <CursorArrow ink="#1D3FD1" />
              </span>
              <span className="ltxt">Privacy, but readable</span>
            </span>
          </div>
          <div className="dbody">
            <PrivacyContent headingLevel={3} />
          </div>
        </>
      )}
    </Dialog>
  );
}
