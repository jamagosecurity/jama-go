import { Routes } from '@angular/router';
import { permissionGuard } from '../../guards/admin.guard';
import { PERMISSIONS } from '../../models/auth.model';
import { createDiaRoutes } from '../admin/dia/dia.routes';

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
        // may already be circulating. Gated on boq.manage, so only staff an admin has
        // granted it ever see the screens.
        path: 'boq',
        canActivate: [permissionGuard(PERMISSIONS.boqManage)],
        children: [
          {
            path: 'new',
            title: 'New Quotation — Jama Go Staff',
            loadComponent: () =>
              import('./boq/boq-editor.component').then((m) => m.BoqEditorComponent),
          },
          {
            path: ':id',
            title: 'Quotation — Jama Go Staff',
            loadComponent: () =>
              import('./boq/boq-editor.component').then((m) => m.BoqEditorComponent),
          },
          {
            path: '',
            title: 'Quotations — Jama Go Staff',
            loadComponent: () =>
              import('./boq/boq-list.component').then((m) => m.BoqListComponent),
          },
        ],
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
