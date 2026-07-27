import { InjectionToken } from '@angular/core';

/**
 * Route prefix the DIA screens are mounted under.
 *
 * The same components serve two portals — `/admin/dia` for administrators and
 * `/staff/dia` for staff holding the dia.upload permission. Their internal
 * links used to be hardcoded to `/admin/dia`, which would bounce a staff user
 * off adminGuard the moment they clicked "Back to list". Each mount point
 * provides its own value instead.
 */
export const DIA_BASE_PATH = new InjectionToken<string>('DIA_BASE_PATH', {
  factory: () => '/admin/dia',
});
