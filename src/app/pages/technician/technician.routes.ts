import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { permissionGuard } from '../../guards/admin.guard';
import { PERMISSIONS } from '../../models/auth.model';
import { AuthService } from '../../services/auth.service';

/** The technician's front door: inspections if he has them, otherwise straight to his Non-MOI jobs. */
const landingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.can(PERMISSIONS.diaInspect) || auth.can(PERMISSIONS.diaView)) return true;
  return inject(Router).parseUrl(auth.can(PERMISSIONS.nonMoiJobWork) ? '/technician/non-moi-jobs' : '/technician/no-access');
};

const inspectionGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.can(PERMISSIONS.diaInspect) || auth.can(PERMISSIONS.diaView) || inject(Router).parseUrl('/technician');
};

export const TECHNICIAN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/technician-layout.component').then((m) => m.TechnicianLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [landingGuard],
        title: 'Technician Dashboard — Jama Go',
        loadComponent: () =>
          import('./dashboard/technician-dashboard.component').then((m) => m.TechnicianDashboardComponent),
      },
      {
        path: 'profile',
        title: 'My profile — Jama Go',
        loadComponent: () =>
          import('../../components/profile-dialog/profile-dialog.component').then((m) => m.ProfileDialogComponent),
      },
      {
        path: 'no-access',
        title: 'No access yet — Jama Go',
        loadComponent: () =>
          import('./no-access/technician-no-access.component').then((m) => m.TechnicianNoAccessComponent),
      },
      {
        path: 'dia/:id',
        canActivate: [inspectionGuard],
        title: 'DIA Inspection — Jama Go',
        loadComponent: () =>
          import('./detail/technician-dia-detail.component').then((m) => m.TechnicianDiaDetailComponent),
      },
      {
        path: 'inspection/:id',
        canActivate: [inspectionGuard],
        title: 'Inspection Form — Jama Go',
        loadComponent: () =>
          import('./form/technician-inspection-form.component').then((m) => m.TechnicianInspectionFormComponent),
      },
      {
        path: 'inspection/:id/review',
        canActivate: [inspectionGuard],
        title: 'Review Inspection — Jama Go',
        loadComponent: () =>
          import('./review/technician-inspection-review.component').then((m) => m.TechnicianInspectionReviewComponent),
      },
      {
        path: 'dia/:id/summary',
        canActivate: [inspectionGuard],
        title: 'Final Summary — Jama Go',
        loadComponent: () =>
          import('./summary/technician-final-summary.component').then((m) => m.TechnicianFinalSummaryComponent),
      },
      {
        path: 'non-moi-jobs/:id',
        canActivate: [permissionGuard(PERMISSIONS.nonMoiJobWork)],
        title: 'Non-MOI Job — Jama Go',
        loadComponent: () =>
          import('./non-moi-jobs/technician-non-moi-job-detail.component').then((m) => m.TechnicianNonMoiJobDetailComponent),
      },
      {
        // Jobs admin issued to this technician — the Non-MOI counterpart of
        // the DIA list, but only their own.
        path: 'non-moi-jobs',
        canActivate: [permissionGuard(PERMISSIONS.nonMoiJobWork)],
        title: 'Non-MOI Jobs — Jama Go',
        loadComponent: () =>
          import('./non-moi-jobs/technician-non-moi-jobs.component').then((m) => m.TechnicianNonMoiJobsComponent),
      },
    ],
  },
];

export default TECHNICIAN_ROUTES;
