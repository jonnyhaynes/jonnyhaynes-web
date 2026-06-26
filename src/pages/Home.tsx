import { Link } from 'react-router';

import Footer from '../components/Footer';

function Home() {
  return (
    <div className="layout-fixed">
      <main>
        <article className="home">
          <h1>Jonny Haynes</h1>
          <p>
            A Full-Stack Developer, specialising in React Native, TypeScript &amp; AI workflows.{' '}
            <Link to="/about">Colouring Code</Link> and building award-winning apps.
          </p>
          <p>
            <a href="https://open.spotify.com/artist/4pK7N0CnWUoMVsmL9ds1DD">Plays bass</a>,{' '}
            <a href="https://www.sitwell.cc">rides bikes</a>, enjoys craft beer,
            bourbons and ryes.{' '}
            <a href="https://www.instagram.com/p/v_CVG2i7YT/?taken-by=jonnyhaynes">
              Part time TV
            </a>{' '}
            and radio star. Soulmate to one. Dad to five.{' '}
            <a href="https://en.wikipedia.org/wiki/Yorkshire">Northerner</a>.
          </p>
          <p>I do all my own stunts.</p>
        </article>
      </main>

      <Footer />
    </div>
  );
}

export default Home;
