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
  BoqTermsLanguage,
  DefaultTerms,
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

  /** Both standard terms pages as plain text — pre-fills the editor's
   *  English and Arabic "Terms & Conditions" boxes so what staff see to edit
   *  is exactly what would otherwise print. */
  getDefaultTerms(): Observable<DefaultTerms> {
    return this.http
      .get<ApiResult<DefaultTerms>>(`${this.baseUrl}/default-terms`)
      .pipe(map(unwrapApiResult));
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

  /** Unlike a rejection's reason, the note is never required — the server
   *  accepts an empty one, so the popup that asks for it must never block. */
  approve(id: string, note?: string): Observable<Boq> {
    return this.http
      .post<ApiResult<Boq>>(`${this.baseUrl}/${id}/approve`, { note })
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

  /**
   * The PDF comes back as bytes, not the ApiResult envelope.
   *
   * `includeTermsPage` defaults true, same as the server — some clients
   * already have the standard commercial terms agreed elsewhere and just
   * want the cover and the priced items. `termsLanguage` defaults to
   * English, same as the server, regardless of whether this quotation has
   * Arabic terms typed in — Arabic only ever prints because the download
   * specifically asked for it.
   */
  downloadPdf(
    id: string,
    includeTermsPage = true,
    termsLanguage: BoqTermsLanguage = 'English',
  ): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, {
      responseType: 'blob',
      params: { includeTermsPage, termsLanguage },
    });
  }

  /** Only exists once Approved — the server refuses anything earlier since a
   *  contract represents an agreement, not a draft. */
  downloadContract(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/contract`, { responseType: 'blob' });
  }

  /** The default Arabic contract wording for this quotation — what the
   *  contract editor pre-fills its text box with the first time it is
   *  opened, built from the quotation's own figures the same way the PDF
   *  falls back to generating it on the spot if nobody ever saves an edit. */
  getDefaultContractText(id: string): Observable<string> {
    return this.http
      .get<ApiResult<{ text: string }>>(`${this.baseUrl}/${id}/default-contract-text`)
      .pipe(map((result) => unwrapApiResult(result).text));
  }

  /** Saves staff's own edited contract wording. Null (or blank) reverts to
   *  the standard default the next time the contract is opened or downloaded. */
  updateContractText(id: string, contractText: string | null): Observable<string> {
    return this.http
      .put<ApiResult<string>>(`${this.baseUrl}/${id}/contract-text`, { contractText })
      .pipe(map(unwrapApiResult));
  }
}
