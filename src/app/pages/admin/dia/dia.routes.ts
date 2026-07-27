import { Routes } from '@angular/router';
import { DIA_BASE_PATH } from './dia-base-path';
import { DiaState } from './dia-state.service';

/**
 * DIA screens, mountable under any prefix. `basePath` is provided to the
 * components so their internal links resolve within the portal they are
 * serving — see DIA_BASE_PATH.
 */
export function createDiaRoutes(basePath: string): Routes {
  return [
    {
      path: '',
      providers: [DiaState, { provide: DIA_BASE_PATH, useValue: basePath }],
      children: [
        {
          path: '',
          pathMatch: 'full',
          title: 'DIA Dashboard — Jama Go',
          loadComponent: () =>
            import('./dashboard/dia-dashboard.component').then(
              (module) => module.DiaDashboardComponent,
            ),
        },
        {
          path: 'list',
          title: 'DIA Inspections — Jama Go',
          loadComponent: () =>
            import('./list/dia-list.component').then((module) => module.DiaListComponent),
        },
        {
          path: 'new',
          title: 'Create DIA — Jama Go',
          loadComponent: () =>
            import('./form/dia-form.component').then((module) => module.DiaFormComponent),
        },
        {
          path: ':id/edit',
          title: 'Edit DIA — Jama Go',
          loadComponent: () =>
            import('./form/dia-form.component').then((module) => module.DiaFormComponent),
        },
        {
          path: ':id',
          title: 'DIA Details — Jama Go',
          loadComponent: () =>
            import('./detail/dia-detail.component').then((module) => module.DiaDetailComponent),
        },
      ],
    },
  ];
}

export const DIA_ROUTES: Routes = createDiaRoutes('/admin/dia');

export default DIA_ROUTES;
