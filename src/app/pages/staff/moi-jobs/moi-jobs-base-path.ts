import { InjectionToken } from '@angular/core';

/** Route prefix the MOI Jobs screens are mounted under — /admin/moi-jobs
 *  or /staff/moi-jobs — so their links stay inside the portal serving them.
 *  Same reasoning as NON_MOI_BASE_PATH for the price list. */
export const MOI_JOBS_BASE_PATH = new InjectionToken<string>('MOI_JOBS_BASE_PATH', {
  factory: () => '/admin/moi-jobs',
});
