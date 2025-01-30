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

          <link href="https://fonts.googleapis.com/css?family=Oswald:wght@500&display=swap" rel="stylesheet" />

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
                  "https://www.facebook.com/jonnyhaynes",
                  "https://www.instagram.com/jonnyhaynes",
                  "https://github.com/jonnyhaynes",
                  "https://dribbble.com/jonnyhaynes",
                  "https://bsky.app/profile/jonnyhaynes.bsky.social",
                ]
              }
            `}
          </Script>
        </Head>

        <main>
          <article>
            <h1>Jonny Haynes</h1>
            <p>An award-winning decorator of pixels, and <a href="http://www.colouringcode.com">colourer of code</a>.</p>
            <p>Plays bass, <a href="http://www.sitwell.cc">rides bikes</a>, enjoys craft beer, bourbons and ryes. <a href="https://www.instagram.com/p/v_CVG2i7YT/?taken-by=jonnyhaynes">Part time TV</a> and radio star. Soulmate to one. Dad to five. <a href="https://en.wikipedia.org/wiki/Yorkshire">Northerner</a>.</p>
            <p>I do all my own stunts.</p>
          </article>
        </main>

        <footer>
          <p>&copy; 1985-{ date }. A <a href="http://www.colouringcode.com">Colouring Code</a> design and build. Powered by <a href="https://nextjs.org/">Next.js</a> and <a href="https://vercel.com">Vercel</a>.</p>
        </footer>


    </>
  )
}

export default Home;
