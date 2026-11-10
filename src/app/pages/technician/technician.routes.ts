import { Routes } from '@angular/router';
import { createMaintenanceRoutes } from '../staff/maintenance/maintenance.routes';

export const TECHNICIAN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/technician-layout.component').then((m) => m.TechnicianLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Technician Dashboard — Jama Go',
        loadComponent: () =>
          import('./dashboard/technician-dashboard.component').then((m) => m.TechnicianDashboardComponent),
      },
      {
        path: 'dia/:id',
        title: 'DIA Inspection — Jama Go',
        loadComponent: () =>
          import('./detail/technician-dia-detail.component').then((m) => m.TechnicianDiaDetailComponent),
      },
      {
        path: 'inspection/:id',
        title: 'Inspection Form — Jama Go',
        loadComponent: () =>
          import('./form/technician-inspection-form.component').then((m) => m.TechnicianInspectionFormComponent),
      },
      {
        path: 'inspection/:id/review',
        title: 'Review Inspection — Jama Go',
        loadComponent: () =>
          import('./review/technician-inspection-review.component').then((m) => m.TechnicianInspectionReviewComponent),
      },
      {
        path: 'dia/:id/summary',
        title: 'Final Summary — Jama Go',
        loadComponent: () =>
          import('./summary/technician-final-summary.component').then((m) => m.TechnicianFinalSummaryComponent),
      },
      {
        // Non-MOI maintenance — the same screens staff use. A technician sees
        // the jobs assigned to them and files new ones at admin's prices; the
        // queue, repricing and discounts stay with maintenance.manage.
        path: 'maintenance',
        children: createMaintenanceRoutes('/technician/maintenance'),
      },
      {
        path: 'non-moi-jobs/:id',
        title: 'Non-MOI Job — Jama Go',
        loadComponent: () =>
          import('./non-moi-jobs/technician-non-moi-job-detail.component').then((m) => m.TechnicianNonMoiJobDetailComponent),
      },
      {
        // Jobs admin issued to this technician — the Non-MOI counterpart of
        // the DIA list, but only their own.
        path: 'non-moi-jobs',
        title: 'Non-MOI Jobs — Jama Go',
        loadComponent: () =>
          import('./non-moi-jobs/technician-non-moi-jobs.component').then((m) => m.TechnicianNonMoiJobsComponent),
      },
    ],
  },
];

export default TECHNICIAN_ROUTES;
