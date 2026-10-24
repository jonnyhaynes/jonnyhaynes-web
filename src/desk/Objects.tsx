import { useState, type CSSProperties, type ReactNode } from 'react';

import { useGamingData } from '../data/gaming';
import { useNowPlaying, useSpotifyAudiobooks } from '../data/spotify';
import {
  BOOKS,
  GAMES_FALLBACK,
  PROJECTS,
  TRACK_FALLBACK,
} from './content';
import type { HealthData } from '../data/health';
import type { SpotifyAudiobook } from '../data/spotify';
import type { DeskDrag } from './useDeskDrag';
import {
  CursorLabel,
  DevNullIcon,
  DownloadIcon,
  GitHubIcon,
  LinkedInIcon,
  MailIcon,
} from './bits';
import { Watch } from './Watch';

const vars = (style: Record<string, string | number>) => style as CSSProperties;

type ObjectProps = {
  drag: DeskDrag;
  liveId: string | null;
};

/** Shared shell: stacking, selection chrome, handles and the drag affordance. */
function ObjectShell({
  id,
  cls,
  drag,
  liveId,
  children,
}: ObjectProps & { id: string; cls: string; children: ReactNode }) {
  const live = liveId === id;
  return (
    <div
      className={`drag ${cls}${live ? ' is-live' : ''}${
        drag.grabbing === id ? ' grab' : ''
      }`}
      style={drag.styleFor(id)}
      onPointerDown={drag.startMove(id)}
    >
      <div className="ent">
        <span className="frame" aria-hidden="true" />
        {children}
        <span
          className="rs"
          aria-hidden="true"
          onPointerDown={drag.startScale(id)}
        />
        <span
          className="rot"
          aria-hidden="true"
          onPointerDown={drag.startRotate(id)}
        />
      </div>
    </div>
  );
}

export function WorkObject({
  drag,
  liveId,
  onOpen,
}: ObjectProps & { onOpen: () => void }) {
  const open = drag.guarded(onOpen);

  return (
    <ObjectShell id="work" cls="o-work" drag={drag} liveId={liveId}>
      <button
        type="button"
        id="things"
        className="obj"
        aria-haspopup="dialog"
        aria-label={`Selected work — ${PROJECTS.length} projects`}
        aria-describedby="drag-hint"
        onClick={(e) => {
          // Safari doesn't focus a button on click; do it explicitly so focus
          // can be returned here when the window closes.
          e.currentTarget.focus();
          open(e);
        }}
        onKeyDown={drag.key('work')}
      >
        <span className="laptop" aria-hidden="true">
          <span className="lscreen">
            <span className="ls-kicker">
              Design, code &amp; everything between.
            </span>
            <span className="ls-title">
              Good things.
              <br />
              Built properly.
            </span>
            <span className="chips" aria-hidden="true">
              <span className="chip chip-a" />
              <span className="chip chip-b" />
              <span className="chip chip-c" />
            </span>
          </span>
        </span>
        <span className="lbase" />
      </button>
      <CursorLabel
        style={vars({
          right: 6,
          bottom: -32,
          '--gx': '-110px',
          '--gy': '-110px',
        })}
      >
        Selected work · {PROJECTS.length} projects
      </CursorLabel>
    </ObjectShell>
  );
}

export function TurntableObject({ drag, liveId }: ObjectProps) {
  const live = useNowPlaying();
  const playing = live?.isPlaying ?? false;
  const title = live?.title ?? TRACK_FALLBACK.title;
  const artist = live?.artist ?? TRACK_FALLBACK.artist;
  const url = live?.url ?? TRACK_FALLBACK.url;

  const open = drag.guarded(() => {
    window.open(url, '_blank', 'noopener,noreferrer');
  });

  return (
    <ObjectShell id="deck" cls="o-deck" drag={drag} liveId={liveId}>
      <button
        type="button"
        className="obj"
        aria-label={`${playing ? 'Now playing' : 'Last played'}: ${title}, by ${artist}`}
        aria-describedby="drag-hint"
        onClick={open}
        onKeyDown={drag.key('deck')}
      >
        <span className="deck" aria-hidden="true">
          <span className={`platter${playing ? ' spin' : ''}`}>
            <span className="disclabel">
              <b>{title}</b>
              <small>{artist}</small>
            </span>
          </span>
          <span className={`arm${playing ? ' on' : ''}`} aria-hidden="true" />
          <span className="status">
            <i className={playing ? 'on' : ''} />
            {playing ? 'NOW PLAYING' : 'LAST PLAYED'}
            <span className="bpm">33⅓</span>
          </span>
        </span>
      </button>
      <CursorLabel
        tone="yellow"
        style={vars({
          right: -48,
          bottom: 34,
          '--gx': '-120px',
          '--gy': '-90px',
        })}
      >
        On the turntable
      </CursorLabel>
    </ObjectShell>
  );
}

export function CareerObject({
  drag,
  liveId,
  onOpen,
}: ObjectProps & { onOpen: () => void }) {
  const open = drag.guarded(onOpen);

  return (
    <ObjectShell id="career" cls="o-career" drag={drag} liveId={liveId}>
      <button
        type="button"
        className="obj"
        aria-haspopup="dialog"
        aria-label="My journey — 2006 to now"
        aria-describedby="drag-hint"
        onClick={(e) => {
          e.currentTarget.focus();
          open(e);
        }}
        onKeyDown={drag.key('career')}
      >
        <span className="badge" aria-hidden="true">
          <span className="bstrap" aria-hidden="true" />
          <span className="bclip" aria-hidden="true" />
          <span className="bcard">
            <span className="bband">
              <span className="bslot" aria-hidden="true" />
              My journey
            </span>
            <span className="bbody">
              <span className="mono bkick">NOW SERVING AS</span>
              <span className="bjob">Full Stack Developer</span>
              <span className="mono byrs">2006 — now · 6 roles</span>
            </span>
          </span>
        </span>
      </button>
      <CursorLabel
        tone="yellow"
        style={vars({
          right: -58,
          top: 96,
          '--gx': '-100px',
          '--gy': '20px',
        })}
      >
        My journey
      </CursorLabel>
    </ObjectShell>
  );
}

export function GamesObject({ drag, liveId }: ObjectProps) {
  const data = useGamingData();
  const [index, setIndex] = useState(0);

  const games =
    data?.games?.length
      ? data.games.slice(0, 5).map((game, i) => {
          const pc = /\(PC\)\s*$/i.test(game.title);
          return {
            title: game.title.replace(/\s*\(PC\)\s*$/i, ''),
            platform: pc ? 'PC' : game.platform === 'steam' ? 'STEAM' : 'XBOX',
            status: i === 0 ? 'LAST PLAYED' : 'RECENTLY PLAYED',
          };
        })
      : GAMES_FALLBACK;

  const game = games[index] ?? games[0];
  const next = games[(index + 1) % games.length];

  return (
    <ObjectShell id="games" cls="o-games" drag={drag} liveId={liveId}>
      <button
        type="button"
        className="obj"
        aria-label={`${game.status} ${game.title} ${game.platform}. Press for the next game, ${next.title}`}
        aria-describedby="drag-hint"
        onClick={drag.guarded(() => setIndex((i) => (i + 1) % games.length))}
        onKeyDown={drag.key('games')}
      >
        <span className="sd">
          <span className="sdside">
            <span className="sdcontrols">
              <span className="dpad" />
              <span className="stick" />
            </span>
            <span className="pad" />
          </span>
          <span className="sr" aria-live="polite">
            {game.status} {game.title} {game.platform}
          </span>
          <span className="sdscreen" aria-hidden="true">
            <span className="mono sdstatus">{game.status}</span>
            <span className="sdtitle">{game.title}</span>
            <span className="sdfoot">
              <span className="mono">{game.platform}</span>
              <span className="gdots" aria-hidden="true">
                {games.map((g, i) => (
                  <i key={`${g.title}-${i}`} className={i === index ? 'on' : ''} />
                ))}
              </span>
            </span>
          </span>
          <span className="sdside">
            <span className="sdcontrols">
              <span className="stick" />
              <span className="abxy" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
            </span>
            <span className="pad" />
          </span>
        </span>
      </button>
      <CursorLabel
        style={vars({
          left: -40,
          bottom: -20,
          '--gx': '130px',
          '--gy': '-70px',
        })}
      >
        After hours
      </CursorLabel>
    </ObjectShell>
  );
}

type ShelfBook = {
  title: string;
  author: string;
  cover: string;
  ink: string;
};

/** "Letters to Our Sons: The Instant…" → "Letters to Our Sons". */
function shortTitle(title: string) {
  const short = title.split(':')[0].trim();
  return short || title;
}

function shelfBooks(data: SpotifyAudiobook[] | null): ShelfBook[] {
  const latest = data?.slice(0, 3) ?? [];
  const source = latest.length
    ? latest.map((book) => ({
        title: shortTitle(book.title),
        author: book.authors,
      }))
    : BOOKS.map((book) => ({
        title: 'short' in book ? book.short : book.title,
        author: book.author,
      }));

  // Keep the original shelf palette: the fitted titles change, the room doesn't.
  return source.map((book, i) => {
    const colour = BOOKS[i % BOOKS.length];
    return { ...book, cover: colour.cover, ink: colour.ink };
  });
}

export function BooksObject({ drag, liveId }: ObjectProps) {
  const data = useSpotifyAudiobooks();
  const books = shelfBooks(data?.audiobooks ?? null);
  const label = `A few good reads: ${books
    .map((book) => `${book.title} by ${book.author}`)
    .join('; ')}`;
  const offsets = [
    { left: 0, bottom: 0, rotate: -5 },
    { left: 80, bottom: 8, rotate: 1 },
    { left: 158, bottom: 0, rotate: 7 },
  ];

  return (
    <ObjectShell id="books" cls="o-books" drag={drag} liveId={liveId}>
      <div
        className="obj"
        role="group"
        tabIndex={0}
        aria-label={label}
        aria-describedby="drag-hint"
        onKeyDown={drag.key('books')}
      >
        <span className="shelf" aria-hidden="true">
          {books.map((book, i) => {
            const o = offsets[i];
            return (
              <span
                key={book.title}
                className="cover"
                style={{
                  left: o.left,
                  bottom: o.bottom,
                  transform: `rotate(${o.rotate}deg)`,
                  background: book.cover,
                  color: book.ink,
                }}
              >
                <b>{book.title}</b>
                <span>{book.author}</span>
              </span>
            );
          })}
        </span>
      </div>
      <CursorLabel
        style={vars({
          left: -24,
          top: 4,
          '--gx': '110px',
          '--gy': '60px',
        })}
      >
        A few good reads
      </CursorLabel>
    </ObjectShell>
  );
}

export function WatchObject({
  drag,
  liveId,
  data,
  motion,
}: ObjectProps & { data: HealthData | null; motion: boolean }) {
  return (
    <ObjectShell id="watch" cls="o-watch" drag={drag} liveId={liveId}>
      <div
        role="group"
        aria-label="My watch — away from the keyboard"
        aria-describedby="drag-hint"
      >
        <Watch data={data} motion={motion} />
      </div>
      <CursorLabel
        tone="yellow"
        style={vars({
          left: -18,
          top: 236,
          '--gx': '70px',
          '--gy': '-90px',
        })}
      >
        Away from the keyboard
      </CursorLabel>
    </ObjectShell>
  );
}

export function PortraitObject({ drag, liveId }: ObjectProps) {
  return (
    <ObjectShell id="me" cls="o-me" drag={drag} liveId={liveId}>
      <div
        className="me"
        role="img"
        aria-label="Illustration of Jonny Haynes in glasses, a beard and an Ey Up cycling cap"
        tabIndex={0}
        onKeyDown={drag.key('me')}
      >
        <span className="blob" aria-hidden="true" />
        <img
          className="duo"
          src="/images/jonny-illustration-960.webp"
          srcSet="/images/jonny-illustration-520.webp 520w, /images/jonny-illustration-960.webp 960w"
          sizes="240px"
          alt=""
          draggable={false}
        />
      </div>
      <CursorLabel
        style={vars({
          left: -30,
          bottom: 10,
          '--gx': '90px',
          '--gy': '-120px',
        })}
      >
        That’s me
      </CursorLabel>
    </ObjectShell>
  );
}

export function AppIcons({
  drag,
  liveId,
  mailto,
  cvUrl,
  linkedinUrl,
  githubUrl,
  devNullUrl,
}: ObjectProps & {
  mailto: string;
  cvUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  devNullUrl: string;
}) {
  const external = (href: string) => drag.guarded(() => window.open(href, '_blank', 'noopener,noreferrer'));
  const email = drag.guarded(() => {
    window.location.assign(mailto);
  });
  const cv = drag.guarded(() => {
    window.open(cvUrl, '_blank', 'noopener,noreferrer');
  });

  return (
    <>
      <ObjectShell id="email" cls="o-email" drag={drag} liveId={liveId}>
        <button
          type="button"
          className="app"
          aria-label="Email me"
          aria-describedby="drag-hint"
          onClick={email}
          onKeyDown={drag.key('email')}
        >
          <span className="ico ico-email">
            <MailIcon />
          </span>
        </button>
        <CursorLabel
          tone="yellow"
          style={vars({
            left: 54,
            top: 44,
            '--gx': '-30px',
            '--gy': '-30px',
          })}
        >
          Get in touch
        </CursorLabel>
      </ObjectShell>

      <ObjectShell id="cv" cls="o-cv" drag={drag} liveId={liveId}>
        <button
          type="button"
          className="app"
          aria-label="Download my CV (opens in a new tab)"
          aria-describedby="drag-hint"
          onClick={cv}
          onKeyDown={drag.key('cv')}
        >
          <span className="ico ico-cv">
            <span className="cvword">CV</span>
            <DownloadIcon />
          </span>
        </button>
      </ObjectShell>

      <ObjectShell id="linkedin" cls="o-linkedin" drag={drag} liveId={liveId}>
        <button
          type="button"
          className="app"
          aria-label="Jonny on LinkedIn (opens in a new tab)"
          aria-describedby="drag-hint"
          onClick={external(linkedinUrl)}
          onKeyDown={drag.key('linkedin')}
        >
          <span className="ico ico-linkedin">
            <LinkedInIcon />
          </span>
        </button>
      </ObjectShell>

      <ObjectShell id="github" cls="o-github" drag={drag} liveId={liveId}>
        <button
          type="button"
          className="app"
          aria-label="Jonny on GitHub (opens in a new tab)"
          aria-describedby="drag-hint"
          onClick={external(githubUrl)}
          onKeyDown={drag.key('github')}
        >
          <span className="ico ico-github">
            <GitHubIcon />
          </span>
        </button>
      </ObjectShell>

      <ObjectShell id="devnull" cls="o-devnull" drag={drag} liveId={liveId}>
        <button
          type="button"
          className="app"
          aria-label="Jonny on dev/null (opens in a new tab)"
          aria-describedby="drag-hint"
          onClick={external(devNullUrl)}
          onKeyDown={drag.key('devnull')}
        >
          <span className="ico ico-devnull">
            <DevNullIcon />
          </span>
        </button>
      </ObjectShell>
    </>
  );
}
