import { Routes } from '@angular/router';
import { permissionGuard } from '../../guards/admin.guard';
import { PERMISSIONS } from '../../models/auth.model';
import { createCameraRoutes } from '../admin/cameras/cameras.routes';
import { createDiaRoutes } from '../admin/dia/dia.routes';
import { createBoqRoutes } from './boq/boq.routes';

export const STAFF_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/staff-layout.component').then((m) => m.StaffLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Staff Dashboard — Jama Go',
        loadComponent: () =>
          import('./dashboard/staff-dashboard.component').then((m) => m.StaffDashboardComponent),
      },
      {
        path: 'profile',
        title: 'My Profile — Jama Go Staff',
        loadComponent: () =>
          import('./profile/staff-profile.component').then((m) => m.StaffProfileComponent),
      },
      {
        path: 'password',
        title: 'Change Password — Jama Go Staff',
        loadComponent: () =>
          import('./password/staff-change-password.component').then(
            (m) => m.StaffChangePasswordComponent,
          ),
      },
      {
        // Quotations, as staff call them. The route, API and entity keep the
        // "boq" name — renaming those would rewrite a document reference that
        // may already be circulating. Gated on boq.manage, so only staff an
        // admin has granted it ever see the screens.
        //
        // Mounted from the shared factory, the same way the stock inventory is:
        // admins mount the identical screens under /admin/boq.
        path: 'boq',
        canActivate: [permissionGuard(PERMISSIONS.boqManage)],
        children: createBoqRoutes('/staff/boq', '/staff/storage'),
      },
      {
        // Sizes the array for a quotation, so it rides the same permission:
        // anyone who can build one can size its storage.
        path: 'storage',
        canActivate: [permissionGuard(PERMISSIONS.boqManage)],
        title: 'Storage Calculator — Jama Go Staff',
        loadComponent: () =>
          import('./storage/storage-calculator.component').then(
            (m) => m.StorageCalculatorComponent,
          ),
      },
      {
        // The stock inventory, mounted inside the staff shell. camera.manage is
        // grantable to a staff account, but the screens only existed under
        // /admin, which is behind adminGuard — so the grant showed a tick in the
        // permission editor and gave the holder nothing they could reach.
        path: 'cameras',
        canActivate: [permissionGuard(PERMISSIONS.cameraManage)],
        children: createCameraRoutes('/staff/cameras'),
      },
      {
        // The admin DIA screens, mounted inside the staff shell. Gated on
        // dia.upload so only staff an admin granted it ever see them.
        path: 'dia',
        canActivate: [permissionGuard(PERMISSIONS.diaUpload)],
        children: createDiaRoutes('/staff/dia'),
      },
    ],
  },
];

export default STAFF_ROUTES;
