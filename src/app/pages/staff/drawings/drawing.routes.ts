import { Routes } from '@angular/router';
import { DRAWING_BASE_PATH } from './drawing-base-path';

/**
 * Drawing screens, mountable under any prefix. Mirrors createBoqRoutes.
 */
export function createDrawingRoutes(basePath: string): Routes {
  return [
    {
      path: '',
      providers: [{ provide: DRAWING_BASE_PATH, useValue: basePath }],
      children: [
        {
          path: 'new',
          title: 'New Drawing — Jama Go',
          loadComponent: () =>
            import('./drawing-editor.component').then((m) => m.DrawingEditorComponent),
        },
        // Before :id, or the router reads "decisions" as a drawing id.
        {
          path: 'decisions',
          title: 'Drawing Approvals — Jama Go',
          loadComponent: () =>
            import('./drawing-decisions.component').then((m) => m.DrawingDecisionsComponent),
        },
        {
          path: ':id',
          title: 'Drawing — Jama Go',
          loadComponent: () =>
            import('./drawing-editor.component').then((m) => m.DrawingEditorComponent),
        },
        {
          path: '',
          title: 'Drawings — Jama Go',
          loadComponent: () =>
            import('./drawing-list.component').then((m) => m.DrawingListComponent),
        },
      ],
    },
  ];
}
