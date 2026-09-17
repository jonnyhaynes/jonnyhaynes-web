import type { ComponentType } from 'react';
import type { HeadingKey } from '../theme/copy';
import {
  BookIcon,
  GamepadIcon,
  HeartPulseIcon,
  ProjectsIcon,
  RecordIcon,
  SendIcon,
  SkillsIcon,
} from '../components/icons';

/**
 * The home page's sections, in document order. One list feeds the desktop rail,
 * the mobile/tablet nav in the footer, and the active-section tracking, so the
 * three can't disagree about what sections exist or what they're called.
 *
 * `id` doubles as the `HeadingKey` into the palette-keyed copies, so a section's
 * heading and its nav label can't drift apart. `label` is the accessible name —
 * deliberately plain English, matching the discipline in theme/copy.ts of keeping
 * aria-labels out of the Yorkshire dialect.
 */
export type Section = {
  id: HeadingKey;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

export const SECTIONS: readonly Section[] = [
  { id: 'projects', label: 'Projects', Icon: ProjectsIcon },
  { id: 'skills', label: 'Skills', Icon: SkillsIcon },
  { id: 'listening', label: 'Listening', Icon: RecordIcon },
  { id: 'reading', label: 'Reading', Icon: BookIcon },
  { id: 'gaming', label: 'Gaming', Icon: GamepadIcon },
  { id: 'health', label: 'Health', Icon: HeartPulseIcon },
  { id: 'contact', label: 'Contact', Icon: SendIcon },
];

/** Stable array identity, so effects keyed on the section list don't re-run per render. */
export const SECTION_IDS: readonly string[] = SECTIONS.map((s) => s.id);

/**
 * The href for a section: always an absolute path with the fragment (`/#projects`),
 * never a bare `#projects`.
 *
 * Absolute is unambiguous — there's no relative-resolution question for the router
 * to answer, and the same string works as a plain `<a href>` with JavaScript
 * disabled, where the browser does the fragment scroll itself. The pane's own
 * scrolling is handled in ShellFrame.
 */
export function sectionHref(id: string): string {
  return `/#${id}`;
}
