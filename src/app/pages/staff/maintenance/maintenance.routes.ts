import { Routes } from '@angular/router';
import { MAINTENANCE_BASE_PATH } from './maintenance-base-path';

/** Maintenance ticket screens, mountable under any prefix — see
 *  MAINTENANCE_BASE_PATH. */
export function createMaintenanceRoutes(basePath: string): Routes {
  return [
    {
      path: '',
      providers: [{ provide: MAINTENANCE_BASE_PATH, useValue: basePath }],
      children: [
        {
          path: 'new',
          title: 'New Maintenance Ticket — Jama Go',
          loadComponent: () =>
            import('./maintenance-editor.component').then((m) => m.MaintenanceEditorComponent),
        },
        {
          path: ':id',
          title: 'Maintenance Ticket — Jama Go',
          loadComponent: () =>
            import('./maintenance-detail.component').then((m) => m.MaintenanceDetailComponent),
        },
        {
          path: '',
          title: 'Maintenance Tickets — Jama Go',
          loadComponent: () =>
            import('./maintenance-list.component').then((m) => m.MaintenanceListComponent),
        },
      ],
    },
  ];
}

export default createMaintenanceRoutes;
