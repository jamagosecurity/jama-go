import { Routes } from '@angular/router';
import { NON_MOI_BASE_PATH } from './non-moi-base-path';

/** The Non-MOI price list, laid out like the stock inventory: a list, and a
 *  separate page to add or edit one service. */
export function createNonMoiRoutes(basePath: string): Routes {
  return [
    {
      path: '',
      providers: [{ provide: NON_MOI_BASE_PATH, useValue: basePath }],
      children: [
        {
          path: 'new',
          title: 'Add Service — Jama Go',
          loadComponent: () => import('./non-moi-editor.component').then((m) => m.NonMoiEditorComponent),
        },
        {
          path: ':id/edit',
          title: 'Edit Service — Jama Go',
          loadComponent: () => import('./non-moi-editor.component').then((m) => m.NonMoiEditorComponent),
        },
        {
          path: '',
          title: 'Non-MOI Inventory — Jama Go',
          loadComponent: () => import('./non-moi-list.component').then((m) => m.NonMoiListComponent),
        },
      ],
    },
  ];
}
