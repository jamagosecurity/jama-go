import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import {
  adminGuard,
  anyPermissionGuard,
  clientGuard,
  guestGuard,
  permissionGuard,
  staffGuard,
  technicianGuard,
} from './guards/admin.guard';
import { createCameraRoutes } from './pages/admin/cameras/cameras.routes';
import { createBoqRoutes } from './pages/staff/boq/boq.routes';
import { createDrawingRoutes } from './pages/staff/drawings/drawing.routes';
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
  // Public, no sign-in — and read-only. Prices are set in the admin panel; this
  // page only lists what is in stock and what it costs.
  {
    path: 'cameras',
    title: 'Camera Catalogue — Jama Go',
    loadComponent: () =>
      import('./pages/public/camera-catalogue.component').then((m) => m.CameraCatalogueComponent),
  },
  // The quotation panel. Public like the inventory it prices from.
  {
    path: 'quotations',
    children: [
      {
        path: 'new',
        title: 'New Quotation — Jama Go',
        loadComponent: () =>
          import('./pages/quotations/quotation-editor.component').then(
            (m) => m.QuotationEditorComponent,
          ),
      },
      {
        path: ':id',
        title: 'Quotation — Jama Go',
        loadComponent: () =>
          import('./pages/quotations/quotation-editor.component').then(
            (m) => m.QuotationEditorComponent,
          ),
      },
      {
        path: '',
        title: 'Quotations — Jama Go',
        loadComponent: () =>
          import('./pages/quotations/quotation-list.component').then(
            (m) => m.QuotationListComponent,
          ),
      },
    ],
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
            path: 'storage/calculator',
            canActivate: [anyPermissionGuard(PERMISSIONS.boqManage, PERMISSIONS.boqApprove)],
            title: 'Storage Calculator — Jama Go Admin',
            loadComponent: () =>
              import('./pages/staff/storage/storage-calculator.component').then(
                (m) => m.StorageCalculatorComponent,
              ),
          },
          {
            path: 'storage',
            title: 'CCTV Storage Sizing — Jama Go Admin',
            loadComponent: () =>
              import('./pages/admin/storage/storage-plan.component').then(
                (m) => m.StoragePlanComponent,
              ),
          },
          {
            // The same quotation screens staff use, mounted for admins too.
            // An administrator implicitly holds boq.manage, so the guard here is
            // about the shape of the tree rather than about keeping anyone out.
            //
            // The calculator sits at a different path in each portal — /staff/storage
            // for staff, /admin/storage/calculator for admins, whose /admin/storage
            // is the sizing reference page — so it is passed in rather than derived.
            path: 'boq',
            canActivate: [anyPermissionGuard(PERMISSIONS.boqManage, PERMISSIONS.boqApprove)],
            children: createBoqRoutes('/admin/boq', '/admin/storage/calculator'),
          },
          {
            // CAD drawings, on the same terms as quotations: either grant opens
            // the tree, the components decide what each account may do inside
            // it. A standalone module — not nested under boq, and no relation
            // to quotations at all.
            path: 'drawings',
            canActivate: [anyPermissionGuard(PERMISSIONS.drawingManage, PERMISSIONS.drawingApprove)],
            children: createDrawingRoutes('/admin/drawings'),
          },
          {
            path: 'cameras',
            canActivate: [permissionGuard(PERMISSIONS.cameraManage)],
            children: createCameraRoutes('/admin/cameras'),
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
