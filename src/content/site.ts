/** Site-wide constants: identity, links, and hero copy. */

export const SITE = {
  name: 'Jonny Haynes',
  githubUrl: 'https://github.com/jonnyhaynes',
  linkedinUrl: 'https://www.linkedin.com/in/jonnyhaynes/',
  // Assembled from parts at runtime (see Contact) so the literal address never
  // sits in the shipped HTML/JS for scrapers. Order: [user, domain, tld].
  emailParts: ['jonny.d.haynes', 'gmail', 'com'],
  // Resume PDF, built from docs/resume.md by scripts/resume/build-resume.mjs
  // and committed to public/. null would hide the download button (graceful
  // degradation) while it's absent.
  resumeUrl: '/resume.pdf' as string | null,
  hero: {
    microcopy: 'Ey up! I’m Jonny.',
    // Split-flap role board: two flappers, each cycling its own list
    // independently, rendered with the animated-gradient text treatment.
    //
    // Word 1 also decides the article, and "AI" is vowel-led — so the lead-in is
    // no longer a fixed "a": `articles` is a third flapper on the headline's first
    // line, and Hero picks between the two by the first letter of whatever word 1
    // is showing. Every pairing of the two lists reads as a role, which is what
    // lets them cycle independently.
    roleWords: [
      ['Full-Stack', 'Front-End', 'Software', 'AI'],
      ['Developer', 'Engineer', 'Enthusiast'],
    ],
    /** The lead-in's article, flipped to agree with word 1. Index 1 is "an". */
    articles: ['a', 'an'],
    // Tech focus.
    subheadline:
      'Building React, React Native and TypeScript products — with AI woven through the workflow.',
  },
} as const;
