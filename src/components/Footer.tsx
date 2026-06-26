import { Link } from 'react-router';

/**
 * Site-wide footer shared by every page (Home, About, Privacy).
 *
 * Single source of truth for the footer markup and links. The animated
 * gradient treatment is NOT applied here — it lives only on the home page
 * (see `.home` in app.css). This footer uses static colours so it reads
 * consistently against every page.
 */
function Footer() {
  const date = new Date().getFullYear();

  return (
    <footer>
      <p>
        &copy; 1985-{date}. A{' '}
        <a href="https://www.colouringcode.com">Colouring Code</a> design and
        build. Powered by <a href="https://vite.dev/">Vite</a> and{' '}
        <a href="https://vercel.com">Vercel</a>. <Link to="/about">About</Link>.{' '}
        <Link to="/privacy">Privacy</Link>.
      </p>
    </footer>
  );
}

export default Footer;
