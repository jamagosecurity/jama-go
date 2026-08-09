import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Which routes get rendered to HTML at build time.
 *
 * Only the three public pages. A client-rendered Angular app paints nothing
 * until its JavaScript has downloaded, parsed and bootstrapped — on a throttled
 * phone that is seconds of blank screen, which is what held First Contentful
 * Paint and Largest Contentful Paint down. Prerendering ships the finished
 * markup instead, and the JS hydrates it afterwards.
 *
 * Everything else stays client-rendered. The portals sit behind auth guards
 * and are per-user, so there is nothing meaningful to render at build time —
 * and their URLs contain ids that do not exist until a record does.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'contact', renderMode: RenderMode.Prerender },
  { path: 'sifeddine', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
