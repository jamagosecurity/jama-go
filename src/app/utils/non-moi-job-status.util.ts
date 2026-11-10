import { NonMoiJobStatus } from '../models/non-moi-job.model';

/** The words for a job's status, the same on every screen. */
export function jobStatusLabel(status: NonMoiJobStatus): string {
  switch (status) {
    case 'Assigned': return 'To do';
    case 'Completed': return 'Done';
    case 'Sent': return 'With client';
    case 'ChangesRequested': return 'Changes asked';
    case 'Closed': return 'Approved';
  }
}

/** A status the technician is finished with: everything past Assigned. */
export function isPastTechnician(status: NonMoiJobStatus): boolean {
  return status !== 'Assigned';
}
