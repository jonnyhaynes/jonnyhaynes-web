import { useEffect } from 'react';

type Meta = {
  title: string;
  description: string;
  path: string;
};

/**
 * Keeps the document head in step with the route on client-side navigation.
 *
 * Each route ships its own static head, so moving between pages in the SPA would
 * otherwise leave the previous page's title, description and canonical in place.
 * That prerendered head is what a no-JS crawler sees; this only corrects it once
 * the router takes over.
 */
export function useDocumentMeta({ title, description, path }: Meta) {
  useEffect(() => {
    document.title = title;

    const set = (selector: string, attribute: string, value: string) => {
      const element = document.head.querySelector(selector);
      if (element) element.setAttribute(attribute, value);
    };

    set('meta[name="description"]', 'content', description);
    set('meta[property="og:title"]', 'content', title);
    set('meta[property="og:description"]', 'content', description);
    set(
      'meta[property="og:url"]',
      'content',
      `https://www.jonnyhaynes.com${path}`,
    );
    set('meta[name="twitter:title"]', 'content', title);
    set('meta[name="twitter:description"]', 'content', description);
    set('link[rel="canonical"]', 'href', `https://www.jonnyhaynes.com${path}`);
  }, [title, description, path]);
}
