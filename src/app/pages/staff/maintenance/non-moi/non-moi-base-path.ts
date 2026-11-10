import { InjectionToken } from '@angular/core';

/** Route prefix the Non-MOI Inventory screens are mounted under — /admin/non-moi
 *  or /staff/non-moi — so their links stay inside the portal serving them.
 *  Same reasoning as CAMERAS_BASE_PATH for the stock inventory. */
export const NON_MOI_BASE_PATH = new InjectionToken<string>('NON_MOI_BASE_PATH', {
  factory: () => '/admin/non-moi',
});
