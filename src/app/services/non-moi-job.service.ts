import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, unwrapApiResult } from '../models/api-result.model';
import { BillSendOptions, ClientDecisionKind, CloseNonMoiJob, CompleteNonMoiJob, JobTechnician, NonMoiJob, PublicJobBill, SaveNonMoiJob } from '../models/non-moi-job.model';

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

  /** The person who issued the job (or an administrator) applies a discount, sends the bill and closes the deal. */
  close(id: string, body: CloseNonMoiJob): Observable<NonMoiJob> {
    return this.http.post<ApiResult<NonMoiJob>>(`${this.baseUrl}/${id}/close`, body).pipe(map(unwrapApiResult));
  }

  /** The client's page: the bill, found by the secret token in their link. No sign-in. */
  publicBill(token: string): Observable<PublicJobBill> {
    return this.http.get<ApiResult<PublicJobBill>>(`${this.baseUrl}/public/${token}`).pipe(map(unwrapApiResult));
  }

  /** The client's answer: approve, reject or comment. No sign-in. */
  respond(token: string, decision: ClientDecisionKind, message: string | null, name: string | null): Observable<PublicJobBill> {
    return this.http
      .post<ApiResult<PublicJobBill>>(`${this.baseUrl}/public/${token}/respond`, { decision, message, name })
      .pipe(map(unwrapApiResult));
  }

  /** Jobs waiting for the signed-in person: finished ones to send, and ones the client asked to change. */
  awaitingClose(): Observable<number> {
    return this.http.get<ApiResult<number>>(`${this.baseUrl}/awaiting-close`).pipe(map(unwrapApiResult));
  }

  /** Which company mailboxes a bill can be sent from, and whether WhatsApp is set up on this server. */
  sendOptions(): Observable<BillSendOptions> {
    return this.http.get<ApiResult<BillSendOptions>>(`${this.baseUrl}/send-options`).pipe(map(unwrapApiResult));
  }

  /** The bill as a PDF — a preview before closing, or a copy afterwards. */
  bill(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/bill`, { responseType: 'blob' });
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
