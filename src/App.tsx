function App() {
  const date = new Date().getFullYear();

  return (
    <>
      <main>
        <article>
          <h1>Jonny Haynes</h1>
          <p>
            An award-winning decorator of pixels, and{' '}
            <a href="https://www.linkedin.com/in/jonnyhaynes">colourer of code</a>.
          </p>
          <p>
            <a href="https://open.spotify.com/artist/4pK7N0CnWUoMVsmL9ds1DD?si=MMn9uWF2TWKesRCJiNU4tg">Plays bass</a>, <a href="https://www.sitwell.cc">rides bikes</a>, enjoys craft beer,
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

      <footer>
        <p>
          &copy; 1985-{date}. A <a href="https://www.colouringcode.com">Colouring Code</a> design
          and build. Powered by <a href="https://vite.dev/">Vite</a> and{' '}
          <a href="https://vercel.com">Vercel</a>. <a href="/privacy">Privacy</a>.
        </p>
      </footer>
    </>
  );
}

export default App;
