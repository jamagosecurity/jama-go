import { InjectionToken } from '@angular/core';

/**
 * Route prefix the stock inventory screens are mounted under.
 *
 * The same components serve two portals — `/admin/cameras` for administrators
 * and `/staff/cameras` for staff holding camera.manage. Their internal links
 * were hardcoded to `/admin/cameras`, which bounced a staff user off adminGuard
 * the moment they clicked "Add item" or saved a record. Each mount point
 * provides its own value instead.
 *
 * Mirrors DIA_BASE_PATH, which solved the same problem for the DIA screens.
 */
export const CAMERAS_BASE_PATH = new InjectionToken<string>('CAMERAS_BASE_PATH', {
  factory: () => '/admin/cameras',
});
