import { Link } from 'react-router';

import Footer from '../components/Footer';
import { useCVData } from '../data/cv';
import { useGitHubData } from '../data/github';
import { useSpotifyTop, useNowPlaying } from '../data/spotify';

/**
 * About page scaffold.
 *
 * Sections render from data that will later be baked to static JSON
 * (cv, github, spotify-top, fitbit) plus one live fetch for now-playing.
 * For now everything uses placeholder data so the layout can be built and
 * styled. Each section is designed to degrade gracefully if its data is
 * missing — see the `?.`/fallback patterns below.
 */

type Fitbit = {
  steps: number;
  restingHeartRate: number;
  sleepHours: number;
};

// --- Placeholder data (to be replaced by baked JSON / live fetch) ---------

const fitbit: Fitbit | null = {
  steps: 0,
  restingHeartRate: 0,
  sleepHours: 0,
};

// --------------------------------------------------------------------------

function About() {
  const cv = useCVData();
  const github = useGitHubData();
  const spotify = useSpotifyTop();
  const nowPlaying = useNowPlaying();

  return (
    <div className="layout-flow">
      <main>
        <article>
          <p className="back">
            <Link to="/">&larr; Back to home</Link>
          </p>

          {/* 1. Hero */}
          <header>
            <h1>About {cv?.name ?? 'Jonny Haynes'}</h1>
            {cv?.headline ? <p>{cv.headline}</p> : null}
            {nowPlaying?.isPlaying ? (
              <p>
                🎧 Now playing: <strong>{nowPlaying.title}</strong> — {nowPlaying.artist}
              </p>
            ) : null}
          </header>

          {/* 2. The serious bit — CV */}
          <section aria-labelledby="cv-heading">
            <h2 id="cv-heading">The serious bit</h2>
            {cv ? (
              <>
                {cv.location ? <p className="cv-location">{cv.location}</p> : null}

                {cv.summary.split('. When I am not').map((part, i) =>
                  // Keep the prose readable: the personality tail begins at
                  // "When I am not…" — render it as its own paragraph.
                  i === 0 ? (
                    <p key="bio">{part.endsWith('.') ? part : `${part}.`}</p>
                  ) : (
                    <p key="play">When I am not{part}</p>
                  ),
                )}

                {cv.positions.length ? (
                  <div className="cv-roles">
                    {cv.positions.map((p) => (
                      <div key={`${p.company}-${p.title}`}>
                        <h3>
                          {p.title} · {p.company}
                        </h3>
                        {p.start || p.end ? (
                          <p>
                            {p.start ?? ''} – {p.end ?? 'present'}
                          </p>
                        ) : null}
                        {p.description ? <p>{p.description}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {cv.clients.length ? (
                  <p>
                    Selected work for{' '}
                    {cv.clients.map((c, i) => (
                      <span key={c}>
                        {i > 0 ? (i === cv.clients.length - 1 ? ' and ' : ', ') : ''}
                        {c}
                      </span>
                    ))}
                    .
                  </p>
                ) : null}

                {cv.skills.length ? (
                  <ul className="tags">
                    {cv.skills.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p>The CV is loading. In the meantime, find me on LinkedIn.</p>
            )}
          </section>

          {/* 3. What I build — GitHub */}
          <section aria-labelledby="github-heading">
            <h2 id="github-heading">What I build</h2>
            {github ? (
              <>
                {github.totalContributions != null ? (
                  <p>
                    {github.totalContributions.toLocaleString()} contributions in
                    the last year.
                  </p>
                ) : null}

                {github.languages.length ? (
                  <p>
                    Mostly{' '}
                    {github.languages.map((l, i) => (
                      <span key={l.name}>
                        {i > 0 ? ', ' : ''}
                        {l.name}
                      </span>
                    ))}
                    .
                  </p>
                ) : null}

                {github.repos.length ? (
                  <ul>
                    {github.repos.map((r) => (
                      <li key={r.name}>
                        <a href={r.url}>{r.name}</a>
                        {r.description ? ` — ${r.description}` : ''}
                        {r.language ? ` (${r.language})` : ''}
                        {r.stars > 0 ? ` · ★ ${r.stars}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p>GitHub data is having a moment. Find me on GitHub directly.</p>
            )}
          </section>

          {/* 4. What I listen to — Spotify */}
          <section aria-labelledby="music-heading">
            <h2 id="music-heading">What I listen to</h2>
            {spotify ? (
              <>
                <p>On heavy rotation over the last few weeks:</p>

                {spotify.artists.length ? (
                  <>
                    <h3>Top artists</h3>
                    <ul className="media-grid">
                      {spotify.artists.map((a) => (
                        <li key={a.name}>
                          {a.image ? (
                            <img src={a.image} alt="" width={64} height={64} loading="lazy" />
                          ) : null}
                          {a.url ? <a href={a.url}>{a.name}</a> : a.name}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}

                {spotify.tracks.length ? (
                  <>
                    <h3>Top tracks</h3>
                    <ul className="media-grid">
                      {spotify.tracks.map((t) => (
                        <li key={`${t.title}-${t.artist}`}>
                          {t.albumArt ? (
                            <img src={t.albumArt} alt="" width={64} height={64} loading="lazy" />
                          ) : null}
                          <span>
                            {t.url ? <a href={t.url}>{t.title}</a> : t.title} — {t.artist}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            ) : (
              <p>The music data is between tracks. Catch me on Spotify.</p>
            )}
          </section>

          {/* 5. Keeping moving — Fitbit */}
          <section aria-labelledby="health-heading">
            <h2 id="health-heading">Keeping moving</h2>
            {fitbit ? (
              <ul>
                <li>{fitbit.steps.toLocaleString()} steps</li>
                <li>{fitbit.restingHeartRate} bpm resting</li>
                <li>{fitbit.sleepHours} h sleep</li>
              </ul>
            ) : (
              <p>Health data is taking a rest day.</p>
            )}
          </section>
        </article>
      </main>

      {/* 6. Footer */}
      <Footer />
    </div>
  );
}

export default About;
