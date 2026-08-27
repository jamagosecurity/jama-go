import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, PaginatedData, unwrapApiResult } from '../models/api-result.model';
import { Boq, BoqListItem, BoqListQuery, SaveBoqRequest } from '../models/boq.model';

/** Bills of quantities. Every route requires boq.manage. */
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

  delete(id: string): Observable<string> {
    return this.http.delete<ApiResult<string>>(`${this.baseUrl}/${id}`).pipe(map(unwrapApiResult));
  }

  /** The PDF comes back as bytes, not the ApiResult envelope. */
  downloadPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob' });
  }
}
