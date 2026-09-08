import { InjectionToken } from '@angular/core';

/**
 * Route prefix the drawing screens are mounted under.
 *
 * The same components serve two portals — `/staff/drawings` and
 * `/admin/drawings`. Mirrors BOQ_BASE_PATH: without this, an internal link
 * hardcoded to one portal would send the other portal's user across into it
 * the moment they opened a drawing or pressed Cancel.
 */
export const DRAWING_BASE_PATH = new InjectionToken<string>('DRAWING_BASE_PATH', {
  factory: () => '/staff/drawings',
});
