/// <reference types="vite/client" />

/** Build metadata injected by the `define` block in vite.config.ts. */
declare const __BUILD__: {
  version: string;
  sha: string;
  date: string;
};
