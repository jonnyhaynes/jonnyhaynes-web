/** Site-wide constants: identity, links, and hero copy. */

export const SITE = {
  name: 'Jonny Haynes',
  githubUrl: 'https://github.com/jonnyhaynes',
  linkedinUrl: 'https://www.linkedin.com/in/jonnyhaynes/',
  // Assembled from parts at runtime (see Contact) so the literal address never
  // sits in the shipped HTML/JS for scrapers. Order: [user, domain, tld].
  emailParts: ['jonny.d.haynes', 'gmail', 'com'],
  resumeUrl: '/resume.pdf',
  hero: {
    microcopy: '// Ey up. I’m Jonny.',
    // Animated-gradient headline (role).
    headline: 'Full-Stack Developer',
    // Tech focus.
    subheadline:
      'Building React, React Native and TypeScript products — with AI woven through the workflow.',
  },
} as const;
