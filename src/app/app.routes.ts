import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ContactComponent } from './components/contact/contact.component';
import { SifeddineLandingComponent } from './pages/sifeddine/sifeddine-landing.component';
import { AdminLoginComponent } from './pages/admin/login/admin-login.component';
import { AdminLayoutComponent } from './pages/admin/layout/admin-layout.component';
import { AdminStaffComponent } from './pages/admin/staff/admin-staff.component';
import { StaffEditorComponent } from './pages/admin/staff-editor/staff-editor.component';
import { AdminContactsComponent } from './pages/admin/contacts/admin-contacts.component';
import {
  adminGuard,
  clientGuard,
  guestGuard,
  permissionGuard,
  staffGuard,
  technicianGuard,
} from './guards/admin.guard';
import { PERMISSIONS } from './models/auth.model';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Jama Go Security — Protecting What Matters Most' },
  { path: 'contact', component: ContactComponent, title: 'Contact Us — Jama Go Security' },
  {
    path: 'sifeddine',
    component: SifeddineLandingComponent,
    title: 'Sifeddine Taghelabet — Business Development Specialist | Jama Go',
  },
  {
    path: 'admin',
    children: [
      {
        path: 'login',
        component: AdminLoginComponent,
        canActivate: [guestGuard],
        title: 'Secure Login — Jama Go Security',
      },
      {
        path: '',
        component: AdminLayoutComponent,
        canActivate: [adminGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'staff' },
          {
            path: 'dia',
            loadChildren: () =>
              import('./pages/admin/dia/dia.routes').then((module) => module.DIA_ROUTES),
          },
          {
            path: 'staff/new',
            component: StaffEditorComponent,
            title: 'Add Staff — Jama Go Admin',
          },
          {
            path: 'staff/:id/edit',
            component: StaffEditorComponent,
            title: 'Edit Staff — Jama Go Admin',
          },
          { path: 'staff', component: AdminStaffComponent, title: 'Manage Staff — Jama Go Admin' },
          {
            path: 'contacts',
            component: AdminContactsComponent,
            title: 'Contact Submissions — Jama Go Admin',
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
