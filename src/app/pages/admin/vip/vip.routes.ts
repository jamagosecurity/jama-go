import { Routes } from '@angular/router';
import { VIP_BASE_PATH } from './vip-base-path';

/**
 * VIP client screens, mountable under any prefix. `basePath` is provided to
 * the components so their internal links resolve within the portal they are
 * serving — see VIP_BASE_PATH.
 */
export function createVipRoutes(basePath: string): Routes {
  return [
    {
      path: '',
      providers: [{ provide: VIP_BASE_PATH, useValue: basePath }],
      children: [
        {
          path: 'new',
          title: 'New VIP Client — Jama Go',
          loadComponent: () => import('./vip-editor.component').then((m) => m.VipEditorComponent),
        },
        {
          path: ':id/edit',
          title: 'Edit VIP Client — Jama Go',
          loadComponent: () => import('./vip-editor.component').then((m) => m.VipEditorComponent),
        },
        {
          path: ':id',
          title: 'VIP Client — Jama Go',
          loadComponent: () => import('./vip-detail.component').then((m) => m.VipDetailComponent),
        },
        {
          path: '',
          title: 'VIP Clients — Jama Go',
          loadComponent: () => import('./vip-list.component').then((m) => m.VipListComponent),
        },
      ],
    },
  ];
}

export const VIP_ROUTES: Routes = createVipRoutes('/admin/vip');

export default VIP_ROUTES;
