import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';

import { useHealthData } from '../data/health';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useReducedMotion } from '../lib/useReducedMotion';
import { useTheme } from '../theme/useTheme';
import {
  CursorLabel,
  DuotoneFilter,
  MoonIcon,
  PauseIcon,
  PlayIcon,
  ResetIcon,
  SunIcon,
} from './bits';
import {
  CV_URL,
  DEV_NULL_URL,
  EMAIL_PARTS,
  GITHUB_URL,
  LINKEDIN_URL,
  randomRole,
} from './content';
import {
  AppIcons,
  BooksObject,
  CareerObject,
  GamesObject,
  PortraitObject,
  TurntableObject,
  WatchObject,
  WorkObject,
} from './Objects';
import { useDeskDrag } from './useDeskDrag';
import { JourneyWindow, WorkWindow } from './Windows';
import { PrivacyWindow } from './PrivacyWindow';
import './desk.css';

const CURSOR_POOL = [
  'work',
  'word',
  'deck',
  'me',
  'watch',
  'career',
  'email',
  'books',
  'games',
];

const vars = (style: Record<string, string | number>) => style as CSSProperties;

export function Desk() {
  useDocumentTitle('Jonny Haynes — Full-Stack Developer');

  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';

  const reduced = useReducedMotion();
  const [motion, setMotion] = useState(() => !reduced);

  const [open, setOpen] = useState<'work' | 'career' | 'privacy' | null>(null);
  const [interacted, setInteracted] = useState(false);
  const [liveId, setLiveId] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const lastLive = useRef<string | null>(null);

  const role = useMemo(() => randomRole(), []);
  const health = useHealthData();
  const year = new Date().getFullYear();

  const drag = useDeskDrag(() => {
    setInteracted(true);
    setLiveId(null);
  });
  const { grabbing } = drag;

  // One cursor at a time: it glides in, clicks, glides home, then a different
  // one goes. Random rhythm, never the same one twice running. Paused while
  // dragging, when a window is open, and when motion is off — the handlers that
  // enter those states clear the live cursor, so the effect only schedules.
  useEffect(() => {
    if (!motion || open !== null || grabbing) return;

    let current: string | null = null;
    let nextAt = Date.now() + 1500 + Math.random() * 2500;

    const timer = window.setInterval(() => {
      if (Date.now() < nextAt) return;

      if (current) {
        current = null;
        setLiveId(null);
        nextAt = Date.now() + 1500 + Math.random() * 5500;
        return;
      }

      let next = CURSOR_POOL[Math.floor(Math.random() * CURSOR_POOL.length)];
      while (next === lastLive.current) {
        next = CURSOR_POOL[Math.floor(Math.random() * CURSOR_POOL.length)];
      }
      lastLive.current = next;
      current = next;
      setLiveId(next);
      nextAt = Date.now() + 2000 + Math.random() * 2500;
    }, 250);

    return () => window.clearInterval(timer);
  }, [motion, open, grabbing]);

  const mailto = useMemo(() => {
    const [user, domain, tld] = EMAIL_PARTS;
    const address = `${user}${String.fromCharCode(64)}${domain}.${tld}`;
    return `mailto:${address}?subject=${encodeURIComponent(
      'Hello from www.jonnyhaynes.com',
    )}`;
  }, []);

  const openWindow = (kind: 'work' | 'career' | 'privacy') => {
    opener.current = document.activeElement as HTMLElement | null;
    setLiveId(null);
    setOpen(kind);
  };

  const closeWindow = () => {
    setOpen(null);
    window.requestAnimationFrame(() => opener.current?.focus());
  };

  const tidyUp = () => {
    drag.reset();
    setInteracted(false);
  };

  return (
    <div
      className={`desk${dark ? ' dark' : ''}${motion ? '' : ' still'}`}
      style={vars({ '--yellow': '#FFD43B' })}
    >
      <a className="skip" href="#things">
        Skip to my stuff
      </a>

      <DuotoneFilter />

      <main
        id="top"
        className="stage"
        aria-hidden={open !== null}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) setInteracted(true);
        }}
        onPointerMove={drag.move}
        onPointerUp={drag.end}
        onPointerCancel={drag.end}
      >
        <p id="drag-hint" className="sr">
          Drag to move, click to open. With it focused, arrow keys move it, plus
          or minus resize it, and the square brackets rotate it.
        </p>

        <div className="controls" role="group" aria-label="Page settings">
          {drag.moved && (
            <button
              type="button"
              className="ctl ctl-ico"
              aria-label="Tidy up — put everything back"
              title="Tidy up"
              onClick={tidyUp}
            >
              <ResetIcon />
            </button>
          )}
          <button
            type="button"
            className="ctl ctl-ico"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggle}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            type="button"
            className="ctl ctl-ico"
            aria-label={motion ? 'Stop animations' : 'Start animations'}
            title={motion ? 'Stop animations' : 'Start animations'}
            onClick={() => {
              setLiveId(null);
              setMotion((on) => !on);
            }}
          >
            {motion ? <PauseIcon /> : <PlayIcon />}
          </button>
        </div>

        {/* Hero */}
        <div className="hero" style={{ zIndex: 1002 }}>
          <span className="eyanchor" aria-hidden="true">
            <span className="eyup">Ey up! I’m</span>
          </span>

          <div
            className={`selbox${liveId === 'word' ? ' is-live' : ''}${
              grabbing === 'word' ? ' grab' : ''
            }`}
            style={drag.styleFor('word', false)}
            onPointerDown={drag.startMove('word')}
          >
            <span className="frame" aria-hidden="true" />
            <span className="h h1" aria-hidden="true" />
            <span className="h h2" aria-hidden="true" />
            <span className="h h3" aria-hidden="true" />

            <CursorLabel
              className="wcur"
              style={vars({
                right: -86,
                top: -14,
                '--gx': '-170px',
                '--gy': '70px',
              })}
            >
              {role.label}
            </CursorLabel>

            <h1 className="word">
              <span className="sr">Ey up! I’m </span>
              <span className="pop">
                <button
                  type="button"
                  className="wordbtn"
                  aria-describedby="drag-hint"
                  onKeyDown={drag.key('word')}
                >
                  Jonny.
                </button>
              </span>
              <span className="sr"> Haynes, {role.sr}.</span>
            </h1>

            <span
              className="rs"
              aria-hidden="true"
              onPointerDown={drag.startScale('word')}
            />
            <span
              className="rot"
              aria-hidden="true"
              onPointerDown={drag.startRotate('word')}
            />
          </div>
        </div>

        <p className={`note${interacted ? ' gone' : ''}`} aria-hidden="true">
          Go on, have a poke around.
          <span>Drag it, stretch it, click it.</span>
        </p>

        <div className="things">
          <WorkObject
            drag={drag}
            liveId={liveId}
            onOpen={() => openWindow('work')}
          />
          <TurntableObject drag={drag} liveId={liveId} />
          <CareerObject
            drag={drag}
            liveId={liveId}
            onOpen={() => openWindow('career')}
          />
          <GamesObject drag={drag} liveId={liveId} />
          <BooksObject drag={drag} liveId={liveId} />
          <WatchObject
            drag={drag}
            liveId={liveId}
            data={health}
            motion={motion}
          />
          <PortraitObject drag={drag} liveId={liveId} />
          <AppIcons
            drag={drag}
            liveId={liveId}
            mailto={mailto}
            cvUrl={CV_URL}
            linkedinUrl={LINKEDIN_URL}
            githubUrl={GITHUB_URL}
            devNullUrl={DEV_NULL_URL}
          />
        </div>
      </main>

      <footer className="legal">
        <span>© 1985–{year} Jonny Haynes</span>
        <span className="legal-sep" aria-hidden="true">
          ·
        </span>
        <Link
          to="/privacy"
          className="legal-link"
          aria-haspopup="dialog"
          onClick={(e) => {
            // Let a modified/new-tab click use the real page; a plain click
            // opens the window.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
              return;
            }
            e.preventDefault();
            e.currentTarget.focus();
            openWindow('privacy');
          }}
        >
          Privacy
        </Link>
      </footer>

      {open === 'work' && <WorkWindow onClose={closeWindow} />}
      {open === 'career' && <JourneyWindow onClose={closeWindow} />}
      {open === 'privacy' && <PrivacyWindow onClose={closeWindow} />}
    </div>
  );
}
