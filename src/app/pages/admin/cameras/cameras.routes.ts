import { Routes } from '@angular/router';
import { CAMERAS_BASE_PATH } from './cameras-base-path';

/**
 * Stock inventory screens, mountable under any prefix. `basePath` is provided to
 * the components so their internal links resolve within the portal they are
 * serving — see CAMERAS_BASE_PATH.
 */
export function createCameraRoutes(basePath: string): Routes {
  return [
    {
      path: '',
      providers: [{ provide: CAMERAS_BASE_PATH, useValue: basePath }],
      children: [
        {
          path: 'new',
          title: 'Add Stock Item — Jama Go',
          loadComponent: () =>
            import('./camera-editor.component').then((m) => m.CameraEditorComponent),
        },
        {
          path: ':id/edit',
          title: 'Edit Stock Item — Jama Go',
          loadComponent: () =>
            import('./camera-editor.component').then((m) => m.CameraEditorComponent),
        },
        {
          path: '',
          title: 'Stock Inventory — Jama Go',
          loadComponent: () =>
            import('./camera-list.component').then((m) => m.CameraListComponent),
        },
      ],
    },
  ];
}

export const CAMERA_ROUTES: Routes = createCameraRoutes('/admin/cameras');

export default CAMERA_ROUTES;
