import { Routes } from '@angular/router';
import { MOI_SERVICES_BASE_PATH } from './moi-services-base-path';

/** The MOI price list, laid out like the stock inventory: a list, and a
 *  separate page to add or edit one service. */
export function createMoiServiceRoutes(basePath: string): Routes {
  return [
    {
      path: '',
      providers: [{ provide: MOI_SERVICES_BASE_PATH, useValue: basePath }],
      children: [
        {
          path: 'new',
          title: 'Add Service — Jama Go',
          loadComponent: () => import('./moi-service-editor.component').then((m) => m.MoiServiceEditorComponent),
        },
        {
          path: ':id/edit',
          title: 'Edit Service — Jama Go',
          loadComponent: () => import('./moi-service-editor.component').then((m) => m.MoiServiceEditorComponent),
        },
        {
          path: '',
          title: 'MOI Services — Jama Go',
          loadComponent: () => import('./moi-service-list.component').then((m) => m.MoiServiceListComponent),
        },
      ],
    },
  ];
}
