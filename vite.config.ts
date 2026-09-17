import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Build metadata for the footer's colophon. Read at build time and inlined as a
 * literal, so it costs nothing at runtime and is identical on server and client.
 */
function buildInfo() {
  const pkg = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
  ) as { version: string };

  let sha = 'unknown';
  try {
    sha = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    // No git available (a source export, or a build without the repo) — the
    // stamp degrades rather than failing the build.
  }

  return {
    version: `v${pkg.version}`,
    sha,
    date: new Date().toISOString().slice(0, 10),
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD__: JSON.stringify(buildInfo()),
  },
});
