import { Routes } from '@angular/router';
import { anyPermissionGuard, permissionGuard } from '../../guards/admin.guard';
import { PERMISSIONS } from '../../models/auth.model';
import { createCameraRoutes } from '../admin/cameras/cameras.routes';
import { createDiaRoutes } from '../admin/dia/dia.routes';
import { createVipRoutes } from '../admin/vip/vip.routes';
import { createBoqRoutes } from './boq/boq.routes';
import { createDrawingRoutes } from './drawings/drawing.routes';
import { createMaintenanceRoutes } from './maintenance/maintenance.routes';
import { createNonMoiRoutes } from './maintenance/non-moi/non-moi.routes';
import { createNonMoiJobRoutes } from './non-moi-jobs/non-moi-jobs.routes';

export const STAFF_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/staff-layout.component').then((m) => m.StaffLayoutComponent),
    children: [
      {
        path: 'profile',
        title: 'My profile — Jama Go',
        loadComponent: () =>
          import('../../components/profile-dialog/profile-dialog.component').then((m) => m.ProfileDialogComponent),
      },
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
        canActivate: [anyPermissionGuard(PERMISSIONS.boqManage, PERMISSIONS.boqApprove)],
        children: createBoqRoutes('/staff/boq', '/staff/storage'),
      },
      {
        // CAD drawings — a standalone module, independent of quotations. Either
        // grant opens the tree; the components decide what each account may do.
        path: 'drawings',
        canActivate: [anyPermissionGuard(PERMISSIONS.drawingManage, PERMISSIONS.drawingApprove)],
        children: createDrawingRoutes('/staff/drawings'),
      },
      {
        // Sizes the array for a quotation, so it rides the same permission:
        // anyone who can build one can size its storage.
        path: 'storage',
        canActivate: [anyPermissionGuard(PERMISSIONS.boqManage, PERMISSIONS.boqApprove)],
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
      {
        // The VIP client screens, mounted inside the staff shell on the same
        // terms as cameras above: vip.manage was grantable to a staff account,
        // but the screens only existed under /admin, which is behind
        // adminGuard — so the grant was a tick with nothing behind it.
        path: 'vip',
        canActivate: [permissionGuard(PERMISSIONS.vipManage)],
        children: createVipRoutes('/staff/vip'),
      },
      {
        // Maintenance tickets — open to every staff account, not just those
        // with maintenance.manage: anyone can log a callout and see their own,
        // the same as a client can from their portal. The queue, assigning,
        // resolving, cancelling and editing all still require the permission,
        // checked inside the screens and enforced again server-side.
        path: 'maintenance',
        children: createMaintenanceRoutes('/staff/maintenance'),
      },
      {
        // The Non-MOI price list, on the same terms as the stock inventory:
        // only an account granted maintenance.manage reaches it.
        path: 'non-moi',
        canActivate: [permissionGuard(PERMISSIONS.nonMoiJobManage)],
        children: createNonMoiRoutes('/staff/non-moi'),
      },
      {
        path: 'non-moi-jobs',
        canActivate: [permissionGuard(PERMISSIONS.nonMoiJobManage)],
        children: createNonMoiJobRoutes('/staff/non-moi-jobs'),
      },
      {
        // The company mailboxes, read-only for staff an admin granted mail.read.
        path: 'mail',
        canActivate: [permissionGuard(PERMISSIONS.mailRead)],
        title: 'Company Mail — Jama Go Staff',
        loadComponent: () =>
          import('../admin/mail/admin-mail.component').then((m) => m.AdminMailComponent),
      },
    ],
  },
];

export default STAFF_ROUTES;
