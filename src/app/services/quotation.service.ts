import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, PaginatedData, unwrapApiResult } from '../models/api-result.model';
import {
  Quotation,
  QuotationListItem,
  QuotationListQuery,
  QuotationSummary,
  SaveQuotationRequest,
} from '../models/quotation.model';

@Injectable({ providedIn: 'root' })
export class QuotationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/quotations`;

  list(query: QuotationListQuery): Observable<PaginatedData<QuotationListItem>> {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber ?? 1)
      .set('pageSize', query.pageSize ?? 20);
    if (query.search) params = params.set('search', query.search);
    if (query.status) params = params.set('status', query.status);

    return this.http
      .get<ApiResult<PaginatedData<QuotationListItem>>>(this.baseUrl, { params })
      .pipe(map(unwrapApiResult));
  }

  summary(): Observable<QuotationSummary> {
    return this.http
      .get<ApiResult<QuotationSummary>>(`${this.baseUrl}/summary`)
      .pipe(map(unwrapApiResult));
  }

  getById(id: string): Observable<Quotation> {
    return this.http.get<ApiResult<Quotation>>(`${this.baseUrl}/${id}`).pipe(map(unwrapApiResult));
  }

  create(request: SaveQuotationRequest): Observable<Quotation> {
    return this.http.post<ApiResult<Quotation>>(this.baseUrl, request).pipe(map(unwrapApiResult));
  }

  update(id: string, request: SaveQuotationRequest): Observable<Quotation> {
    return this.http
      .put<ApiResult<Quotation>>(`${this.baseUrl}/${id}`, request)
      .pipe(map(unwrapApiResult));
  }

  delete(id: string): Observable<string> {
    return this.http.delete<ApiResult<string>>(`${this.baseUrl}/${id}`).pipe(map(unwrapApiResult));
  }

  /** The PDF comes back as bytes, not the ApiResult envelope. */
  downloadPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob' });
  }
}
