/**
 * Colours for the GitHub language-breakdown bar, matching GitHub's own
 * linguist palette so the segments look familiar. Anything not listed falls
 * back to the muted grey.
 */
export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Astro: '#ff5a03',
  Python: '#3572A5',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Go: '#00ADD8',
  Rust: '#dea584',
  Shell: '#89e051',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Java: '#b07219',
  'C#': '#178600',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  PLpgSQL: '#336790',
  Dockerfile: '#384d54',
};

export const LANGUAGE_FALLBACK = '#9ca3af';
