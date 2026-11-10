import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, unwrapApiResult } from '../models/api-result.model';
import { CompleteNonMoiJob, JobTechnician, NonMoiJob, SaveNonMoiJob } from '../models/non-moi-job.model';

/** Non-MOI jobs: admin issues them, the assigned technician reads them. */
@Injectable({ providedIn: 'root' })
export class NonMoiJobService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/nonmoijobs`;

  /** Every job — admin / maintenance.manage. */
  list(): Observable<NonMoiJob[]> {
    return this.http.get<ApiResult<NonMoiJob[]>>(this.baseUrl).pipe(map(unwrapApiResult));
  }

  /** The signed-in technician's own jobs. */
  mine(): Observable<NonMoiJob[]> {
    return this.http.get<ApiResult<NonMoiJob[]>>(`${this.baseUrl}/mine`).pipe(map(unwrapApiResult));
  }

  /** The technician finishes his own job with the issues he fixed. */
  complete(id: string, body: CompleteNonMoiJob): Observable<NonMoiJob> {
    return this.http.post<ApiResult<NonMoiJob>>(`${this.baseUrl}/${id}/complete`, body).pipe(map(unwrapApiResult));
  }

  /** Technicians a job can be issued to. */
  technicians(): Observable<JobTechnician[]> {
    return this.http.get<ApiResult<JobTechnician[]>>(`${this.baseUrl}/technicians`).pipe(map(unwrapApiResult));
  }

  create(job: SaveNonMoiJob): Observable<NonMoiJob> {
    return this.http.post<ApiResult<NonMoiJob>>(this.baseUrl, job).pipe(map(unwrapApiResult));
  }

  update(id: string, job: SaveNonMoiJob): Observable<NonMoiJob> {
    return this.http.put<ApiResult<NonMoiJob>>(`${this.baseUrl}/${id}`, job).pipe(map(unwrapApiResult));
  }

  remove(id: string): Observable<string> {
    return this.http.delete<ApiResult<string>>(`${this.baseUrl}/${id}`).pipe(map(unwrapApiResult));
  }
}
