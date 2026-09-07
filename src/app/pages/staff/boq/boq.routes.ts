import { Routes } from '@angular/router';
import { BOQ_BASE_PATH, BOQ_STORAGE_PATH } from './boq-base-path';

/**
 * Quotation screens, mountable under any prefix.
 *
 * The route, API and entity keep the "boq" name even though staff call these
 * quotations — renaming them would rewrite a document reference that may already
 * be circulating.
 *
 * `basePath` and `storagePath` are provided to the components so their internal
 * links resolve within the portal serving them. See BOQ_BASE_PATH for what goes
 * wrong without that.
 */
export function createBoqRoutes(basePath: string, storagePath: string): Routes {
  return [
    {
      path: '',
      providers: [
        { provide: BOQ_BASE_PATH, useValue: basePath },
        { provide: BOQ_STORAGE_PATH, useValue: storagePath },
      ],
      children: [
        {
          path: 'new',
          title: 'New Quotation — Jama Go',
          loadComponent: () =>
            import('./boq-editor.component').then((m) => m.BoqEditorComponent),
        },
        // Before :id, or the router reads "decisions" as a quotation id and the
        // editor asks the API for a document by that name.
        //
        // One route for both lists, with the status in a query parameter rather
        // than the path: they are one screen with a tab, and a single sidebar
        // entry stays highlighted across both because routerLinkActive matches
        // on the path alone.
        {
          path: 'decisions',
          title: 'Approvals — Jama Go',
          loadComponent: () =>
            import('./boq-decisions.component').then((m) => m.BoqDecisionsComponent),
        },
        {
          path: ':id',
          title: 'Quotation — Jama Go',
          loadComponent: () =>
            import('./boq-editor.component').then((m) => m.BoqEditorComponent),
        },
        {
          path: '',
          title: 'Quotations — Jama Go',
          loadComponent: () =>
            import('./boq-list.component').then((m) => m.BoqListComponent),
        },
      ],
    },
  ];
}
