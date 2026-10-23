import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { CREDENTIALS, PROJECTS, ROLES } from './content';
import { CloseIcon } from './bits';

type DialogProps = {
  cls: 'term' | 'punch' | 'doc';
  labelledBy: string;
  onClose: () => void;
  style?: CSSProperties;
  lanyard?: boolean;
  children: (close: ReactNode) => ReactNode;
};

let scrollLocks = 0;
let lockedScrollY = 0;
let savedBodyStyle: {
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
} | null = null;

function lockPageScroll() {
  scrollLocks += 1;
  if (scrollLocks > 1) return;

  const body = document.body;
  lockedScrollY = window.scrollY;
  savedBodyStyle = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
  };

  body.style.position = 'fixed';
  body.style.top = `-${lockedScrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
}

function unlockPageScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks > 0) return;

  const body = document.body;
  if (savedBodyStyle) {
    body.style.position = savedBodyStyle.position;
    body.style.top = savedBodyStyle.top;
    body.style.left = savedBodyStyle.left;
    body.style.right = savedBodyStyle.right;
    body.style.width = savedBodyStyle.width;
    savedBodyStyle = null;
  }

  window.scrollTo(0, lockedScrollY);
}

/** Overlay, focus trap, Escape-to-close and the initial focus on the close button. */
export function Dialog({ cls, labelledBy, onClose, style, lanyard, children }: DialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lockPageScroll();
    return unlockPageScroll;
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;

    const focusables = Array.from(
      overlayRef.current?.querySelectorAll<HTMLElement>(
        'button, a[href], [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const close = (
    <button
      ref={closeRef}
      type="button"
      className="closeb"
      aria-label="Close"
      onClick={onClose}
    >
      <CloseIcon />
    </button>
  );

  return (
    <div className="overlay" ref={overlayRef} onKeyDown={onKeyDown} style={style}>
      {lanyard && <span className="lanyard" aria-hidden="true" />}
      <div
        className={`dlg ${cls}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children(close)}
      </div>
    </div>
  );
}

export function WorkWindow({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const project = PROJECTS[index];

  return (
    <Dialog cls="term" labelledBy="dlg-h" onClose={onClose}>
      {(close) => (
        <>
          <div className="dhead">
            <div className="dhead-main">
              <h2 id="dlg-h">jonny@yorkshire: ~/work</h2>
            </div>
            {close}
          </div>
          <div className="dbody">
            <div className="tgrid">
              <div className="tls" role="group" aria-label="Projects">
                <p className="tprompt" aria-hidden="true">
                  <span className="tp">$</span>ls ~/work
                </p>
                <p className="tcomment">
                  # {PROJECTS.length} projects — apps, websites and tools
                </p>
                {PROJECTS.map((item, i) => (
                  <button
                    key={item.slug}
                    type="button"
                    className={`titem${i === index ? ' on' : ''}`}
                    aria-pressed={i === index}
                    aria-label={`${item.name} — ${item.short}`}
                    onClick={() => setIndex(i)}
                  >
                    <span className="tname">{item.slug}/</span>
                    <span className="tmeta">{item.short}</span>
                  </button>
                ))}
              </div>

              <div className="tout" aria-live="polite">
                <p className="tprompt" aria-hidden="true">
                  <span className="tp">$</span>cat {project.slug}/README.md
                </p>
                <p className="tkick">
                  {String(index + 1).padStart(2, '0')}/{String(PROJECTS.length).padStart(2, '0')} ·{' '}
                  {project.org} · {project.kind}
                </p>
                <h3 className="ttitle">{project.name}</h3>
                {project.stat && <p className="tstat">{project.stat}</p>}
                <p className="tdesc">{project.desc}</p>
                <p className="tkv">
                  <span className="tk">stack</span>
                  {project.stack.map((tech) => (
                    <span key={tech}>
                      <span className="tbr" aria-hidden="true">
                        [
                      </span>
                      {tech}
                      <span className="tbr" aria-hidden="true">
                        ]
                      </span>
                    </span>
                  ))}
                </p>
                {project.awards.map((award) => (
                  <p className="tkv" key={award.name}>
                    <span className="tk">award</span>
                    <span>
                      <span className="tbr" aria-hidden="true">
                        ★{' '}
                      </span>
                      {award.name}
                    </span>
                  </p>
                ))}
                <div className="tlinks">
                  {project.links.map((link) => (
                    <a
                      key={link.label}
                      className="tlink"
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      open {link.label} <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                </div>
                <p className="tprompt tcaretline" aria-hidden="true">
                  <span className="tp">$</span>
                  <span className="caret" />
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
}

export function JourneyWindow({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const role = ROLES[index];

  const style = {
    '--band': role.badge.band,
    '--bandfg': role.badge.text,
    '--strap': role.badge.strap,
  } as CSSProperties;

  return (
    <Dialog cls="punch" labelledBy="dlg-h" onClose={onClose} style={style} lanyard>
      {(close) => (
        <>
          <div className="dhead">
            <div className="dhead-main">
              <h2 id="dlg-h">A designer who codes.</h2>
              <p>
                Nearly two decades of digital engineering — from semantic HTML in
                2006, through award-winning cross-platform apps, to
                AI-accelerated delivery.
              </p>
            </div>
            {close}
          </div>

          <div className="dbody">
            <div className="pgrid idgrid">
              <div className="rack" role="group" aria-label="My jobs, newest first">
                {ROLES.map((item, i) => (
                  <button
                    key={`${item.org}-${item.title}`}
                    type="button"
                    className={`pc${i === index ? ' on' : ''}`}
                    aria-pressed={i === index}
                    aria-label={`${item.title} at ${item.org}, ${item.years.replace(
                      '—',
                      'to',
                    )}`}
                    onClick={() => setIndex(i)}
                  >
                    <span
                      className="mbband"
                      style={{ background: item.badge.band }}
                      aria-hidden="true"
                    />
                    <span className="mbtext" aria-hidden="true">
                      <span className="pcorg">{item.org}</span>
                      <span className="pctitle">{item.title}</span>
                      <span className="pcno">{item.years}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div>
                <div className="idcard" aria-live="polite">
                  <div className="idtop">
                    <div className="idphoto">
                      <img
                        className="duo"
                        src="/images/jonny-illustration-960.webp"
                        srcSet="/images/jonny-illustration-520.webp 520w, /images/jonny-illustration-960.webp 960w"
                        sizes="150px"
                        alt=""
                        draggable={false}
                      />
                    </div>
                    <dl className="idfields">
                      <div>
                        <dt>Role</dt>
                        <dd className="idrole">{role.title}</dd>
                      </div>
                      <div>
                        <dt>Employer</dt>
                        <dd>{role.org}</dd>
                      </div>
                      <div>
                        <dt>Workplace</dt>
                        <dd>{role.place}</dd>
                      </div>
                      <div className="half">
                        <dt>Issued</dt>
                        <dd>{role.from}</dd>
                      </div>
                      <div className="half">
                        <dt>Valid</dt>
                        <dd>{role.to === null ? 'Still valid' : `Until ${role.to}`}</dd>
                      </div>
                    </dl>
                  </div>

                  {role.access.length > 0 && (
                    <div className="access">
                      <span className="mono access-label">ACCESS</span>
                      {role.access.map((tech) => (
                        <span className="acc" key={tech}>
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {role.points.length > 0 && (
                    <ul className="typed">
                      {role.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <h3 className="mono creds-title">ALSO ON FILE</h3>
                <div className="creds">
                  {CREDENTIALS.map((credential) => (
                    <p
                      className="cred2"
                      key={credential.title}
                      style={
                        'highlight' in credential && credential.highlight
                          ? { background: 'var(--yellow)', borderColor: '#0B1B4A' }
                          : undefined
                      }
                    >
                      {credential.title}
                      <small>{credential.meta}</small>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
}
