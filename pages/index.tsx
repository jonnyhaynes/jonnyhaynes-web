/* eslint-disable @next/next/inline-script-id */
/* eslint-disable @next/next/no-script-component-in-head */
import type { NextPage } from 'next';
import Head from 'next/head';
import Script from 'next/script'

const Home: NextPage = () => {
  const date = new Date().getFullYear();

  return (
    <>
      <Head>
          <meta charSet="UTF-8" />
          <meta name="robots" content="index, follow" />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

          <link rel="dns-prefetch" href="//www.google-analytics.com" />
          <link rel="dns-prefetch" href="//fonts.googleapis.com" />

          <title>Jonny Haynes - Est. 1985</title>
          <meta name="description" content="" />
          <meta name="author" content="Jonny Haynes" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />

          <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,600|Dosis:400,500" rel="stylesheet" />

          {/* Global site tag (gtag.js) - Google Analytics */}
          <Script async src="https://www.googletagmanager.com/gtag/js?id=G-N7Y43H2XZP"></Script>
          <Script>
            {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());

                gtag('config', 'G-N7Y43H2XZP');
            `}
          </Script>


          <Script type="application/ld+json">
            {`
              {
                "@context": "http://schema.org",
                "@type": "Person",
                "givenName": "Jonny",
                "familyName": "Haynes",
                "sameAs" : [
                  "https://www.twitter.com/jonnyhaynes",
                  "https://www.facebook.com/jonnyhaynes",
                  "https://www.instagram.com/jonnyhaynes",
                  "https://github.com/jonnyhaynes",
                  "https://dribbble.com/jonnyhaynes",
                  "https://mas.to/@jonnyhaynes"
                ]

              }
            `}
          </Script>
        </Head>

        <svg style={{ display: 'none' }} aria-hidden="true">
          <symbol id="svg--twitter" viewBox="0 0 50 50">
            <path d="M48.5,9.5c-0.2,0.1-0.5,0.1-0.7,0.2c-1.5,0.4-1.6-0.1-0.6-1.3c0.5-0.5,0.9-1.1,1.3-1.7c0.8-1.3,0.1-1.9-1.3-1.3c-0.5,0.2-1,0.4-1.6,0.6c-1.5,0.5-3.6-0.3-4.9-1.1c-1.7-1.1-3.5-1.6-5.6-1.6c-3,0-5.5,1.1-7.6,3.2c-2.1,2.1-3.1,4.7-3.1,7.7c0,0.4,0,0.8,0.1,1.3c0.1,0.7-1.1,1.2-2.6,1c-3.3-0.5-6.5-1.5-9.5-3.1c-3-1.6-5.6-3.5-7.9-5.9C3.5,6.4,2,6.5,1.6,8c-0.2,0.9-0.4,1.9-0.4,2.9c0,1.9,0.4,3.6,1.3,5.2C3,16.9,3.5,17.6,4,18.2c1,1.1,0.8,1.7-0.5,1.3s-2.3-1-2.3-0.9c0,0,0,0.1,0,0.1c0,2.6,0.8,4.9,2.4,6.9c1,1.2,2.2,2.2,3.5,2.8c1.4,0.7,2,1.1,1.3,1.2c-0.5,0.1-0.9,0.1-1.4,0.1c-0.3,0-0.7,0-1,0c-0.6,0-0.7,1.1,0.2,2.5c0.7,1.1,1.5,2,2.6,2.8c1.1,0.8,2.2,1.4,3.4,1.8c1.5,0.4,1.8,1.2,0.5,2c-3.3,2-6.9,3-10.9,3c-0.5,0-0.9,0-1.3,0c-0.7,0-0.2,0.6,1.1,1.3c4.3,2.3,9,3.4,14,3.4c3.8,0,7.3-0.6,10.7-1.8c3.3-1.2,6.2-2.9,8.5-4.9c2.4-2.1,4.4-4.4,6.1-7.1c1.7-2.7,3-5.5,3.8-8.4c0.8-2.9,1.3-5.8,1.3-8.8c0-0.3,0-0.5,0-0.7c0-0.4,1-1.5,2.1-2.5c0.5-0.5,1-1,1.5-1.5C50.4,9.6,50,9.1,48.5,9.5z"></path>
          </symbol>
          <symbol id="svg--facebook" viewBox="0 0 50 50">
            <path d="M18.4,9.7c0,1.3,0,6.9,0,6.9h-5V25h5V50h10.4V25h7c0,0,0.7-4,1-8.5c-0.9,0-7.9,0-7.9,0s0-4.9,0-5.8c0-0.9,1.1-2,2.2-2c1.1,0,3.5,0,5.6,0c0-1.1,0-5.1,0-8.8c-2.9,0-6.2,0-7.7,0C18.1,0,18.4,8.4,18.4,9.7z"></path>
          </symbol>
          <symbol id="svg--linkedin" viewBox="0 0 50 50">
            <path d="M6.4,0C3.2,0,0.6,2.7,0.6,6c0,3.3,2.6,6,5.9,6c3.2,0,5.9-2.7,5.9-6C12.3,2.7,9.7,0,6.4,0z M1.4,50h10.1V16.6H1.4V50z M37.3,15.8c-4.9,0-8.2,2.8-9.6,5.4h-0.1v-4.6h-9.7V50H28V33.5c0-4.3,0.8-8.6,6.1-8.6c5.2,0,5.3,5,5.3,8.8V50h10.1V31.7C49.4,22.7,47.5,15.8,37.3,15.8z"></path>
          </symbol>
          <symbol id="svg--pinterest" viewBox="0 0 50 50">
            <path d="M26.2,0C12.2,0,5.1,9.8,5.1,17.9c0,4.9,1.9,9.3,6.1,11c0.7,0.3,1.3,0,1.5-0.7c0.1-0.5,0.5-1.8,0.6-2.3c0.2-0.7,0.1-1-0.4-1.6c-1.2-1.4-2-3.1-2-5.6c0-7.3,5.6-13.7,14.6-13.7c7.9,0,12.3,4.7,12.3,11c0,8.3-3.8,15.3-9.4,15.3c-3.1,0-5.4-2.5-4.7-5.5c0.9-3.6,2.6-7.6,2.6-10.2c0-2.3-1.3-4.3-4-4.3c-3.2,0-5.7,3.2-5.7,7.4c0,2.7,0.9,4.5,0.9,4.5s-3.2,13.3-3.8,15.6c-1.1,4.6-0.2,10.3-0.1,10.9c0,0.3,0.5,0.4,0.7,0.2c0.3-0.4,4.1-4.9,5.3-9.4c0.4-1.3,2.1-7.9,2.1-7.9c1,1.9,4,3.6,7.2,3.6c9.5,0,16-8.4,16-19.7C44.9,7.9,37.5,0,26.2,0z"></path>
          </symbol>
          <symbol id="svg--google" viewBox="0 0 50 50">
            <path d="M13.4,46.1c8.3,0,12.8-4.7,12.8-9.4c0-3.8-1.1-6.1-4.6-8.5c-1.2-0.8-3.4-2.9-3.4-4.1c0-1.4,0.4-2.1,2.5-3.7c2.2-1.7,3.7-4.1,3.7-6.8c0-3.3-1.5-6.5-4.2-7.5h4.1l2.9-2.1H14.2c-5.9,0-11.4,4.4-11.4,9.6c0,5.3,4,9.5,9.9,9.5l1.2,0c-0.4,0.7-0.7,1.6-0.7,2.4c0,1.5,0.8,2.6,1.8,3.6l-2.3,0C5.6,29,0,33.6,0,38.4C0,43.2,6.2,46.1,13.4,46.1z M14.7,21.6c-3.4-0.1-6.6-3.8-7.1-8.2C7,9,9.2,5.6,12.6,5.7c3.4,0.1,6.6,3.6,7.1,8.1C20.3,18.2,18.1,21.7,14.7,21.6z M14.3,30.2c1.2,0,2.3,0.2,3.3,0.5c2.7,1.9,4.7,3,5.2,5.1c0.1,0.4,0.2,0.9,0.2,1.3c0,3.8-2.5,6.8-9.5,6.8c-5,0-8.6-3.2-8.6-7C4.8,33.3,9.2,30.2,14.3,30.2z M40.6,13.2V3.9h-3.1v9.3h-9.4v3.1h9.4v9.5h3.1v-9.5H50v-3.1H40.6z"></path>
          </symbol>
          <symbol id="svg--youtube" viewBox="0 0 50 50">
            <path d="M49.1,13.5c-0.6-2.6-2.8-4.5-5.4-4.8C37.5,8,31.2,8,25,8C18.8,8,12.5,8,6.3,8.7C3.7,9,1.5,10.9,0.9,13.5C0,17.2,0,21.2,0,25c0,3.8,0,7.8,0.9,11.5c0.6,2.6,2.8,4.5,5.4,4.8C12.5,42,18.8,42,25,42c6.2,0,12.5,0,18.7-0.7c2.6-0.3,4.8-2.2,5.4-4.8C50,32.8,50,28.8,50,25C50,21.2,50,17.2,49.1,13.5z M18.6,32.6c0-5.4,0-10.7,0-16.1c5.3,2.7,10.6,5.4,15.9,8.1C29.1,27.2,23.9,29.9,18.6,32.6z"></path>
          </symbol>
          <symbol id="svg--instagram" viewBox="0 0 50 50">
            <path d="M40.2,0H9.6C4.3,0,0,4.3,0,9.6v10.2v20.4c0,5.3,4.3,9.6,9.6,9.6h30.6c5.3,0,9.6-4.3,9.6-9.6V19.8V9.6C49.9,4.3,45.6,0,40.2,0z M43,5.7l1.1,0v1.1v7.4l-8.4,0l0-8.5L43,5.7z M17.8,19.8c1.6-2.2,4.2-3.7,7.1-3.7s5.5,1.4,7.1,3.7c1,1.4,1.7,3.2,1.7,5.1c0,4.8-3.9,8.8-8.8,8.8c-4.8,0-8.8-3.9-8.8-8.8C16.2,23,16.8,21.3,17.8,19.8z M45,40.2c0,2.6-2.1,4.8-4.8,4.8H9.6c-2.6,0-4.8-2.1-4.8-4.8V19.8h7.4c-0.6,1.6-1,3.3-1,5.1c0,7.5,6.1,13.6,13.6,13.6c7.5,0,13.6-6.1,13.6-13.6c0-1.8-0.4-3.5-1-5.1H45V40.2z"></path>
          </symbol>
          <symbol id="svg--share" viewBox="0 0 50 50">
            <path d="M39.8,35.4c-1.9,0-3.5,0.7-4.8,1.9L17.4,26.9c0.1-0.6,0.2-1.2,0.2-1.8c0-0.6-0.1-1.2-0.2-1.8l17.4-10.3c1.3,1.2,3.1,2,5,2c4.1,0,7.4-3.3,7.4-7.5c0-4.2-3.3-7.5-7.4-7.5c-4.1,0-7.4,3.4-7.4,7.5c0,0.6,0.1,1.2,0.2,1.8L15.2,19.7c-1.3-1.3-3.1-2-5-2c-4.1,0-7.4,3.4-7.4,7.5c0,4.2,3.3,7.5,7.4,7.5c1.9,0,3.7-0.8,5-2L32.8,41c-0.1,0.5-0.2,1.1-0.2,1.6c0,4,3.2,7.3,7.2,7.3c4,0,7.2-3.3,7.2-7.3C47,38.6,43.7,35.4,39.8,35.4z"></path>
          </symbol>
          <symbol id="svg--phone" viewBox="0 0 50 50">
            <path d="M49.1,37.8c-1.6-3.1-4-5.6-7.1-7.4c-1.2-0.7-2.3-1-3.5-1c-0.4,0-0.9,0.1-1.3,0.2c-1.4,0.3-2.8,1-4.2,2.1c-0.4,0.3-1,0.5-1.6,0.5c-0.8,0-1.6-0.3-2.2-0.7c-4.1-3.1-7.6-6.5-10.6-10.6C18,20,17.5,18.2,18.4,17c1-1.4,1.7-2.8,2.1-4.2c0.4-1.6,0.1-3.1-0.9-4.8c-1.8-3.1-4.3-5.5-7.4-7.1c-1-0.5-2-0.8-3.1-0.8c-1.7,0-3.3,0.7-4.6,2.1C3.3,3.6,2.2,4.9,1,6.6c-1.1,1.5-1,3.3-1,4.8l0,0c0.1,2,0.9,4.3,2.2,7.1c2.3,4.7,5.6,9.2,10,13.8c0.9,0.9,4.5,4.6,5.5,5.5c4.5,4.4,9,7.7,13.8,10c2.8,1.4,5.1,2.1,7.1,2.2l0,0c0.4,0,0.8,0,1.3,0l0,0c1,0,2.4-0.1,3.6-1c1.7-1.2,3-2.3,4.3-3.5C50,43.3,50.5,40.5,49.1,37.8z"></path>
          </symbol>
          <symbol id="svg--arrow" viewBox="0 0 50 50">
            <path d="M11.1,22.5L33.7,1c1.4-1.4,3.8-1.4,5.2,0c1.4,1.4,1.4,3.6,0,4.9l-20,19l20,19c1.4,1.4,1.4,3.6,0,4.9c-1.4,1.4-3.8,1.4-5.2,0L11.1,27.5C10.4,26.8,10,25.9,10,25C10,24.1,10.4,23.2,11.1,22.5z"></path>
          </symbol>
          <symbol id="svg--menu" viewBox="0 0 8.8 6.2">
            <path d="M6.6,0H0v0.9h6.6V0z M0,2.7v0.9h8.8V2.7H0z M0,6.2h6.6V5.3H0V6.2z" fill="ffffff"></path>
          </symbol>
          <symbol id="svg--close" viewBox="0 0 12.3 12">
            <path d="M12.3 1.5l-1.5-1.5-4.6 4.6-4.7-4.6-1.5 1.5 4.6 4.7-4.3 4.3 1.6 1.5 4.3-4.3 4.3 4.3 1.5-1.5-4.3-4.3z"></path>
          </symbol>
          <symbol id="svg--download" viewBox="0 0 41.6 50">
            <path d="M1,31.1l17.3,17.8c1.4,1.4,3.5,1.4,4.9,0l17.3-17.8c1.4-1.4,1.4-3.6,0-5c-1.4-1.4-3.5-1.4-4.9,0L24.2,37.7V3.6c0-2-1.6-3.6-3.5-3.6c-1.9,0-3.5,1.6-3.5,3.6v34.1L5.9,26c-0.7-0.7-1.6-1-2.4-1S1.7,25.3,1,26C-0.3,27.4-0.3,29.7,1,31.1z"></path>
          </symbol>
          <symbol id="svg--search" viewBox="0 0 79 79">
            <path d="M77.225 66.837L58.33 47.94c2.85-4.68 4.488-10.175 4.488-16.058C62.818 14.802 48.018 0 30.932 0 13.85 0 0 13.85 0 30.934c0 17.083 14.802 31.884 31.884 31.884 5.68 0 11-1.537 15.574-4.21l18.997 18.997c1.86 1.858 4.873 1.858 6.73 0l4.71-4.71c1.862-1.86 1.188-4.2-.67-6.058zM9.52 30.934c0-11.828 9.587-21.416 21.412-21.416 11.83 0 22.37 10.54 22.37 22.367 0 11.828-9.59 21.416-21.418 21.416C20.058 53.3 9.52 42.763 9.52 30.935z"></path>
          </symbol>
          <symbol id="svg--plus" viewBox="0 0 50 50">
            <polygon points="50,21.4 28.6,21.4 28.6,0 21.4,0 21.4,21.4 0,21.4 0,28.6 21.4,28.6 21.4,50 28.6,50 28.6,28.6 50,28.6"/>
          </symbol>
          <symbol id="svg--minus" viewBox="0 0 50 50">
            <polyline points="50,21.4 0,21.4 0,28.6 50,28.6"/>
          </symbol>
        </svg>

          <a href="#content" className="skip-content">skip to main content</a>

          <noscript>
            <div className="no-js">
              <div className="wrap">
                <p>This site requires a JavaScript enabled browser. Please enable Javascript or upgrade your browser to access all the features.</p>
              </div>
            </div>
          </noscript>

          <section className="page">
          <header className="page-header">
          <div className="wrap">
            <h1 className="page__title"><strong>Jonny Haynes</strong> is an award-winning decorator of pixels, and <a href="http://www.colouringcode.com">colourer of code</a>.</h1>
            <p className="page__summary">Plays bass, <a href="http://www.sitwell.cc">rides bikes</a>, enjoys craft beer, bourbons and ryes. <a href="https://www.instagram.com/p/v_CVG2i7YT/?taken-by=jonnyhaynes">Part time TV</a> and radio star. Soulmate to one. Dad to three. <a href="https://en.wikipedia.org/wiki/Yorkshire">Northerner</a>.</p>
            <p className="page__summary">I do all my own stunts.</p>
          </div>
        </header>

        <main className="page-content"></main>

        <footer className="page-footer">
          <div className="wrap">
            <ul>
              <li>
                <a href="http://www.twitter.com/jonnyhaynes">
                  <svg className="social-links__item social-links__item--twitter" role="presentation"><use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="#svg--twitter"></use></svg>
                </a>
              </li>
              <li>
                <a href="https://www.linkedin.com/in/jonnyhaynes">
                  <svg className="social-links__item social-links__item--linkedin" role="presentation"><use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="#svg--linkedin"></use></svg>
                </a>
              </li>
              <li>
                <a href="https://github.com/jonnyhaynes">
                  <svg className="social-links__item social-links__item--github" role="presentation"><use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="#svg--github"></use></svg>
                </a>
              </li>
              <li>
                <a href="http://stackoverflow.com/users/207738/jonny-haynes?tab=profile">
                  <svg className="social-links__item social-links__item--stack-overflow" role="presentation"><use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="#svg--stack-overflow"></use></svg>
                </a>
              </li>
              <li>
                <a href="https://dribbble.com/jonnyhaynes">
                  <svg className="social-links__item social-links__item--dribbble" role="presentation"><use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="#svg--dribbble"></use></svg>
                </a>
              </li>
              <li>
                <a rel="me" href="https://mas.to/@jonnyhaynes">
                  <svg className="social-links__item social-links__item--mastodon" role="presentation"><use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="#svg--mastodon"></use></svg>
                </a>
              </li>
            </ul>
            <p>&copy; 1985-{ date }. A <a href="http://www.colouringcode.com">Colouring Code</a> design and build. Powered by <a href="https://nextjs.org/">Next.js</a> and <a href="https://vercel.com">Vercel</a>.</p>
          </div>
        </footer>
          </section>
    </>
  )
}

export default Home;
