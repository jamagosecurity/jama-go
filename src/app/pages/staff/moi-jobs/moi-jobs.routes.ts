import { Routes } from '@angular/router';
import { MOI_JOBS_BASE_PATH } from './moi-jobs-base-path';

/** MOI jobs: a list, and a separate page to issue or edit one. */
export function createMoiJobRoutes(basePath: string): Routes {
  return [
    {
      path: '',
      providers: [{ provide: MOI_JOBS_BASE_PATH, useValue: basePath }],
      children: [
        {
          path: 'new',
          title: 'New Job — Jama Go',
          loadComponent: () => import('./moi-job-editor.component').then((m) => m.MoiJobEditorComponent),
        },
        {
          path: ':id/close',
          title: 'Review & Close Job — Jama Go',
          loadComponent: () => import('./moi-job-close.component').then((m) => m.MoiJobCloseComponent),
        },
        {
          path: ':id/edit',
          title: 'Edit Job — Jama Go',
          loadComponent: () => import('./moi-job-editor.component').then((m) => m.MoiJobEditorComponent),
        },
        {
          path: '',
          title: 'MOI Jobs — Jama Go',
          loadComponent: () => import('./moi-job-list.component').then((m) => m.MoiJobListComponent),
        },
      ],
    },
  ];
}
