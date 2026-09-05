import { InjectionToken } from '@angular/core';

/**
 * Route prefix the quotation screens are mounted under.
 *
 * The same components serve two portals — `/staff/boq` and `/admin/boq`. Their
 * internal links were hardcoded to `/staff/boq`, so mounting them for admins
 * would have sent an administrator into the staff portal the moment they opened
 * a quotation, saved one, or pressed Cancel — landing them somewhere worse than
 * where they started, having lost the form.
 *
 * Mirrors CAMERAS_BASE_PATH and DIA_BASE_PATH, which solved this for the stock
 * inventory and DIA screens.
 */
export const BOQ_BASE_PATH = new InjectionToken<string>('BOQ_BASE_PATH', {
  factory: () => '/staff/boq',
});

/**
 * Where "Calculate storage" goes from a quotation.
 *
 * Separate from the base path because the two portals do not simply differ by
 * prefix: staff reach the calculator at `/staff/storage`, while for admins that
 * path is the sizing REFERENCE page and the calculator lives one level down at
 * `/admin/storage/calculator`. Deriving one from the other would send admins to
 * the wrong screen.
 */
export const BOQ_STORAGE_PATH = new InjectionToken<string>('BOQ_STORAGE_PATH', {
  factory: () => '/staff/storage',
});
