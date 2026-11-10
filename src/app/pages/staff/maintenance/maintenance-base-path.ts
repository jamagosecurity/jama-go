import { InjectionToken } from '@angular/core';

/**
 * Route prefix the maintenance screens are mounted under — `/admin/maintenance`
 * for administrators, `/staff/maintenance` for staff holding
 * maintenance.manage. Mirrors VIP_BASE_PATH and UBER_BASE_PATH.
 */
export const MAINTENANCE_BASE_PATH = new InjectionToken<string>('MAINTENANCE_BASE_PATH', {
  factory: () => '/admin/maintenance',
});
