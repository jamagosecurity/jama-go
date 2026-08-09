import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import {
  adminGuard,
  clientGuard,
  guestGuard,
  permissionGuard,
  staffGuard,
  technicianGuard,
} from './guards/admin.guard';
import { PERMISSIONS } from './models/auth.model';

/**
 * Only the home page is imported eagerly. Everything else is lazy.
 *
 * These were all static imports, which put the entire admin panel — layout,
 * staff editor, contacts, the Material dialogs and tables they pull in — into
 * the initial bundle of the public marketing site. A visitor reading the home
 * page was downloading the staff management screens: 582 kB of JavaScript for
 * a page that needs a fraction of it.
 */
export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Jama Go Security — Protecting What Matters Most' },
  {
    path: 'contact',
    title: 'Contact Us — Jama Go Security',
    loadComponent: () =>
      import('./components/contact/contact.component').then((m) => m.ContactComponent),
  },
  {
    path: 'sifeddine',
    title: 'Sifeddine Taghelabet — Business Development Specialist | Jama Go',
    loadComponent: () =>
      import('./pages/sifeddine/sifeddine-landing.component').then((m) => m.SifeddineLandingComponent),
  },
  {
    path: 'admin',
    children: [
      {
        path: 'login',
        canActivate: [guestGuard],
        title: 'Secure Login — Jama Go Security',
        loadComponent: () =>
          import('./pages/admin/login/admin-login.component').then((m) => m.AdminLoginComponent),
      },
      {
        path: '',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/admin/layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'staff' },
          {
            path: 'dia',
            loadChildren: () =>
              import('./pages/admin/dia/dia.routes').then((module) => module.DIA_ROUTES),
          },
          {
            path: 'staff/new',
            title: 'Add Staff — Jama Go Admin',
            loadComponent: () =>
              import('./pages/admin/staff-editor/staff-editor.component').then(
                (m) => m.StaffEditorComponent,
              ),
          },
          {
            path: 'staff/:id/edit',
            title: 'Edit Staff — Jama Go Admin',
            loadComponent: () =>
              import('./pages/admin/staff-editor/staff-editor.component').then(
                (m) => m.StaffEditorComponent,
              ),
          },
          {
            path: 'staff',
            title: 'Manage Staff — Jama Go Admin',
            loadComponent: () =>
              import('./pages/admin/staff/admin-staff.component').then((m) => m.AdminStaffComponent),
          },
          {
            path: 'contacts',
            title: 'Contact Submissions — Jama Go Admin',
            loadComponent: () =>
              import('./pages/admin/contacts/admin-contacts.component').then(
                (m) => m.AdminContactsComponent,
              ),
          },
          {
            path: 'vip',
            canActivate: [permissionGuard(PERMISSIONS.vipManage)],
            children: [
              {
                path: 'new',
                title: 'New VIP Client — Jama Go Admin',
                loadComponent: () =>
                  import('./pages/admin/vip/vip-editor.component').then((m) => m.VipEditorComponent),
              },
              {
                path: ':id/edit',
                title: 'Edit VIP Client — Jama Go Admin',
                loadComponent: () =>
                  import('./pages/admin/vip/vip-editor.component').then((m) => m.VipEditorComponent),
              },
              {
                path: ':id',
                title: 'VIP Client — Jama Go Admin',
                loadComponent: () =>
                  import('./pages/admin/vip/vip-detail.component').then((m) => m.VipDetailComponent),
              },
              {
                path: '',
                title: 'VIP Clients — Jama Go Admin',
                loadComponent: () =>
                  import('./pages/admin/vip/vip-list.component').then((m) => m.VipListComponent),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: 'client',
    canActivate: [clientGuard],
    title: 'My Project — Jama Go',
    loadComponent: () =>
      import('./pages/client/client-portal.component').then((m) => m.ClientPortalComponent),
  },
  {
    path: 'technician',
    canActivate: [technicianGuard],
    loadChildren: () =>
      import('./pages/technician/technician.routes').then((module) => module.TECHNICIAN_ROUTES),
  },
  {
    path: 'staff',
    canActivate: [staffGuard],
    loadChildren: () => import('./pages/staff/staff.routes').then((module) => module.STAFF_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
