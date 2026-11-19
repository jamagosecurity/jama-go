import { InjectionToken } from '@angular/core';

/** Route prefix the MOI Services screens are mounted under — /admin/moi-services
 *  or /staff/moi-services — so their links stay inside the portal serving them.
 *  Same reasoning as CAMERAS_BASE_PATH for the stock inventory. */
export const MOI_SERVICES_BASE_PATH = new InjectionToken<string>('MOI_SERVICES_BASE_PATH', {
  factory: () => '/admin/moi-services',
});
