import { InjectionToken } from '@angular/core';

/** Route prefix the Non-MOI Jobs screens are mounted under — /admin/non-moi-jobs
 *  or /staff/non-moi-jobs — so their links stay inside the portal serving them.
 *  Same reasoning as NON_MOI_BASE_PATH for the price list. */
export const NON_MOI_JOBS_BASE_PATH = new InjectionToken<string>('NON_MOI_JOBS_BASE_PATH', {
  factory: () => '/admin/non-moi-jobs',
});
