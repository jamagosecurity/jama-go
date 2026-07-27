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
