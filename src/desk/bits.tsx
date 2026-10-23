import type { CSSProperties, ReactNode } from 'react';

/** The little named pointer that "edits" an object, with its label pill. */
export function CursorArrow({ ink }: { ink: string }) {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true">
      <path d="M1 1l14 7-6 2-3 6z" fill={ink} stroke="#fff" />
    </svg>
  );
}

export function CursorLabel({
  tone = 'blue',
  style,
  className = '',
  children,
}: {
  tone?: 'blue' | 'yellow';
  style?: CSSProperties;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`clabel ${tone === 'yellow' ? 'ly' : 'lb'} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      <span className="cur">
        <CursorArrow ink={tone === 'yellow' ? '#0B1B4A' : '#1D3FD1'} />
      </span>
      <span className="ltxt">{children}</span>
    </span>
  );
}

/** Inline once: the portrait's blue/yellow treatment is a filter, never a file edit. */
export function DuotoneFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="duo-defs">
      <filter
        id="jh-duo"
        colorInterpolationFilters="sRGB"
        x="0"
        y="0"
        width="100%"
        height="100%"
      >
        <feColorMatrix
          in="SourceGraphic"
          type="matrix"
          values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0"
          result="lum"
        />
        <feComponentTransfer in="lum" result="duo">
          <feFuncR type="table" tableValues="0.031 0.043 0.078 0.114 0.392 0.745 0.961" />
          <feFuncG type="table" tableValues="0.071 0.106 0.176 0.247 0.490 0.804 0.973" />
          <feFuncB type="table" tableValues="0.204 0.290 0.549 0.820 0.922 0.980 1" />
        </feComponentTransfer>
        <feColorMatrix
          in="SourceGraphic"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.5 0.5 -1 0 0"
          result="yraw"
        />
        <feComponentTransfer in="yraw" result="ymask">
          <feFuncA type="linear" slope="6" intercept="-2.3" />
        </feComponentTransfer>
        <feComposite in="ymask" in2="SourceAlpha" operator="in" result="ym2" />
        <feFlood floodColor="#FFD43B" result="yel" />
        <feComposite in="yel" in2="ym2" operator="in" result="ylayer" />
        <feMerge>
          <feMergeNode in="duo" />
          <feMergeNode in="ylayer" />
        </feMerge>
      </filter>
    </svg>
  );
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function MailIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke} strokeWidth={3} aria-hidden="true">
      <path d="M12 4v13M6 11l6 6 6-6" />
    </svg>
  );
}

export function LinkedInIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}

export function GitHubIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3" />
    </svg>
  );
}

export function ResetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </svg>
  );
}

export function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} strokeWidth={2.6} aria-hidden="true">
      <path d="M9 5v14M15 5v14" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} strokeWidth={2.4} aria-hidden="true">
      <path d="M7 4l12 8-12 8z" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} strokeWidth={2.6} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function CloudIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} aria-hidden="true">
      <path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z" />
    </svg>
  );
}

export function SunEventIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" {...stroke} strokeWidth={2.6} aria-hidden="true">
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

export function FlameIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} aria-hidden="true">
      <path d="M12 3s6 5 6 11a6 6 0 0 1-12 0c0-3 2-5 2-5s1 3 3 3c0-4 1-9 1-9z" />
    </svg>
  );
}

export function FootstepsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} aria-hidden="true">
      <path d="M7 4c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM17 8c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5z" />
    </svg>
  );
}

export function HeartIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z" />
    </svg>
  );
}
