import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, PaginatedData, unwrapApiResult } from '../models/api-result.model';
import {
  Boq,
  BoqListItem,
  BoqListQuery,
  BoqNotifications,
  SaveBoqRequest,
} from '../models/boq.model';

/**
 * Bills of quantities.
 *
 * Reading takes either grant; building takes boq.manage; approving and
 * rejecting take boq.approve. The API enforces each — these methods exist for
 * accounts that hold the grant, and calling one without it comes back 403
 * rather than working because a button was visible.
 */
@Injectable({ providedIn: 'root' })
export class BoqService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/boqs`;

  list(query: BoqListQuery): Observable<PaginatedData<BoqListItem>> {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber ?? 1)
      .set('pageSize', query.pageSize ?? 20);
    if (query.search) params = params.set('search', query.search);
    if (query.status) params = params.set('status', query.status);
    if (query.mineOnly) params = params.set('mineOnly', true);

    return this.http
      .get<ApiResult<PaginatedData<BoqListItem>>>(this.baseUrl, { params })
      .pipe(map(unwrapApiResult));
  }

  getById(id: string): Observable<Boq> {
    return this.http.get<ApiResult<Boq>>(`${this.baseUrl}/${id}`).pipe(map(unwrapApiResult));
  }

  create(request: SaveBoqRequest): Observable<Boq> {
    return this.http.post<ApiResult<Boq>>(this.baseUrl, request).pipe(map(unwrapApiResult));
  }

  update(id: string, request: SaveBoqRequest): Observable<Boq> {
    return this.http.put<ApiResult<Boq>>(`${this.baseUrl}/${id}`, request).pipe(map(unwrapApiResult));
  }

  /** Hands it to an approver. Part of building, so boq.manage covers it. */
  submit(id: string): Observable<Boq> {
    return this.http
      .post<ApiResult<Boq>>(`${this.baseUrl}/${id}/submit`, {})
      .pipe(map(unwrapApiResult));
  }

  approve(id: string): Observable<Boq> {
    return this.http
      .post<ApiResult<Boq>>(`${this.baseUrl}/${id}/approve`, {})
      .pipe(map(unwrapApiResult));
  }

  /** The reason is required by the server, not just by the modal that asks. */
  reject(id: string, reason: string): Observable<Boq> {
    return this.http
      .post<ApiResult<Boq>>(`${this.baseUrl}/${id}/reject`, { reason })
      .pipe(map(unwrapApiResult));
  }

  delete(id: string): Observable<string> {
    return this.http.delete<ApiResult<string>>(`${this.baseUrl}/${id}`).pipe(map(unwrapApiResult));
  }

  /**
   * Approvals and rejections for the notification panel. Administrators only —
   * the API refuses it to anyone else.
   */
  notifications(): Observable<BoqNotifications> {
    return this.http
      .get<ApiResult<BoqNotifications>>(`${this.baseUrl}/notifications`)
      .pipe(map(unwrapApiResult));
  }

  /** Marks everything decided up to now as seen by THIS administrator. */
  markNotificationsSeen(): Observable<number> {
    return this.http
      .post<ApiResult<number>>(`${this.baseUrl}/notifications/seen`, {})
      .pipe(map(unwrapApiResult));
  }

  /** The PDF comes back as bytes, not the ApiResult envelope. */
  downloadPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob' });
  }
}
