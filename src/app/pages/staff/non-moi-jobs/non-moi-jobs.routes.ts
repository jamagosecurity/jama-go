import { Routes } from '@angular/router';
import { NON_MOI_JOBS_BASE_PATH } from './non-moi-jobs-base-path';

/** Non-MOI jobs: a list, and a separate page to issue or edit one. */
export function createNonMoiJobRoutes(basePath: string): Routes {
  return [
    {
      path: '',
      providers: [{ provide: NON_MOI_JOBS_BASE_PATH, useValue: basePath }],
      children: [
        {
          path: 'new',
          title: 'New Job — Jama Go',
          loadComponent: () => import('./non-moi-job-editor.component').then((m) => m.NonMoiJobEditorComponent),
        },
        {
          path: ':id/close',
          title: 'Review & Close Job — Jama Go',
          loadComponent: () => import('./non-moi-job-close.component').then((m) => m.NonMoiJobCloseComponent),
        },
        {
          path: ':id/edit',
          title: 'Edit Job — Jama Go',
          loadComponent: () => import('./non-moi-job-editor.component').then((m) => m.NonMoiJobEditorComponent),
        },
        {
          path: '',
          title: 'Non-MOI Jobs — Jama Go',
          loadComponent: () => import('./non-moi-job-list.component').then((m) => m.NonMoiJobListComponent),
        },
      ],
    },
  ];
}
