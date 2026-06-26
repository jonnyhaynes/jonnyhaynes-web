import Footer from '../components/Footer';

/**
 * About page scaffold.
 *
 * Sections render from data that will later be baked to static JSON
 * (cv, github, spotify-top, fitbit) plus one live fetch for now-playing.
 * For now everything uses placeholder data so the layout can be built and
 * styled. Each section is designed to degrade gracefully if its data is
 * missing — see the `?.`/fallback patterns below.
 */

type Position = {
  title: string;
  company: string;
  start: string;
  end: string | null;
  highlights: string[];
};

type CV = {
  headline: string;
  summary: string;
  positions: Position[];
  skills: string[];
};

type Repo = {
  name: string;
  description: string;
  url: string;
  language: string;
  stars: number;
};

type Track = {
  title: string;
  artist: string;
  albumArt: string | null;
};

type NowPlaying = {
  isPlaying: boolean;
  title: string;
  artist: string;
} | null;

type Fitbit = {
  steps: number;
  restingHeartRate: number;
  sleepHours: number;
};

// --- Placeholder data (to be replaced by baked JSON / live fetch) ---------

const cv: CV = {
  headline: 'Full-Stack Developer — React Native, TypeScript & AI workflows',
  summary:
    'Builds award-winning apps at Colouring Code. Equal parts product thinking and clean code.',
  positions: [
    {
      title: 'Founder & Developer',
      company: 'Colouring Code',
      start: '2015',
      end: null,
      highlights: ['Award-winning mobile apps', 'React Native + TypeScript'],
    },
  ],
  skills: ['React Native', 'TypeScript', 'React', 'Node.js', 'AI workflows'],
};

const repos: Repo[] = [
  {
    name: 'placeholder-repo',
    description: 'Pinned repos will load here from the GitHub bake.',
    url: '#',
    language: 'TypeScript',
    stars: 0,
  },
];

const topArtists: string[] = ['Loading top artists…'];
const topTracks: Track[] = [
  { title: 'Top tracks will load here', artist: 'from the Spotify bake', albumArt: null },
];
const nowPlaying: NowPlaying = null;

const fitbit: Fitbit | null = {
  steps: 0,
  restingHeartRate: 0,
  sleepHours: 0,
};

// --------------------------------------------------------------------------

function About() {
  return (
    <>
      <main>
        <article>
          {/* 1. Hero */}
          <header>
            <h1>About Jonny Haynes</h1>
            <p>{cv.headline}</p>
            {nowPlaying?.isPlaying ? (
              <p>
                🎧 Now playing: <strong>{nowPlaying.title}</strong> — {nowPlaying.artist}
              </p>
            ) : null}
          </header>

          {/* 2. The serious bit — CV */}
          <section aria-labelledby="cv-heading">
            <h2 id="cv-heading">The serious bit</h2>
            <p>{cv.summary}</p>
            {cv.positions.map((p) => (
              <div key={`${p.company}-${p.title}`}>
                <h3>
                  {p.title} · {p.company}
                </h3>
                <p>
                  {p.start} – {p.end ?? 'present'}
                </p>
                <ul>
                  {p.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ))}
            <ul>
              {cv.skills.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>

          {/* 3. What I build — GitHub */}
          <section aria-labelledby="github-heading">
            <h2 id="github-heading">What I build</h2>
            {repos.length ? (
              <ul>
                {repos.map((r) => (
                  <li key={r.name}>
                    <a href={r.url}>{r.name}</a> — {r.description} ({r.language})
                  </li>
                ))}
              </ul>
            ) : (
              <p>GitHub data unavailable right now.</p>
            )}
          </section>

          {/* 4. What I listen to — Spotify */}
          <section aria-labelledby="music-heading">
            <h2 id="music-heading">What I listen to</h2>
            <h3>Top artists</h3>
            <ul>
              {topArtists.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <h3>Top tracks</h3>
            <ul>
              {topTracks.map((t) => (
                <li key={`${t.title}-${t.artist}`}>
                  {t.title} — {t.artist}
                </li>
              ))}
            </ul>
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
    </>
  );
}

export default About;
