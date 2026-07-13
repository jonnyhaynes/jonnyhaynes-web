/** Site-wide constants: identity, links, and hero copy. */

export const SITE = {
  name: 'Jonny Haynes',
  githubUrl: 'https://github.com/jonnyhaynes',
  linkedinUrl: 'https://www.linkedin.com/in/jonnyhaynes/',
  // Assembled from parts at runtime (see Contact) so the literal address never
  // sits in the shipped HTML/JS for scrapers. Order: [user, domain, tld].
  emailParts: ['jonny.d.haynes', 'gmail', 'com'],
  // Resume PDF being rebuilt from docs/resume.md; null hides the download
  // button until the file lands in public/ (graceful degradation).
  resumeUrl: null as string | null,
  hero: {
    microcopy: '// Ey up. I’m Jonny.',
    // Animated-gradient headline (role).
    headline: 'Full-Stack Developer',
    // Tech focus.
    subheadline:
      'Building React, React Native and TypeScript products — with AI woven through the workflow.',
  },
} as const;
