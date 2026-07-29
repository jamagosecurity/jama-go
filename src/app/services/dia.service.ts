import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, unwrapApiResult } from '../models/api-result.model';
import {
  Dia,
  DiaDashboard,
  DiaInspectionHistory,
  DiaListQuery,
  DiaWriteRequest,
  PaginatedData,
} from '../models/dia.model';

@Injectable({ providedIn: 'root' })
export class DiaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/dia`;

  getList(query: DiaListQuery): Observable<PaginatedData<Dia>> {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber)
      .set('pageSize', query.pageSize);
    if (query.search) params = params.set('search', query.search);
    if (query.status) params = params.set('status', query.status);
    if (query.archived) params = params.set('archived', true);
    if (query.sortBy) params = params.set('sortBy', query.sortBy);
    if (query.sortDirection) params = params.set('sortDirection', query.sortDirection);
    return this.http
      .get<ApiResult<PaginatedData<Dia>>>(this.baseUrl, { params })
      .pipe(map(unwrapApiResult));
  }

  getById(id: string): Observable<Dia> {
    return this.http.get<ApiResult<Dia>>(`${this.baseUrl}/${id}`).pipe(map(unwrapApiResult));
  }

  getDashboard(): Observable<DiaDashboard> {
    return this.http
      .get<ApiResult<DiaDashboard>>(`${this.baseUrl}/dashboard`)
      .pipe(map(unwrapApiResult));
  }

  getInspectionHistory(
    id?: string,
    pageNumber = 1,
    pageSize = 20,
  ): Observable<PaginatedData<DiaInspectionHistory>> {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    if (id) params = params.set('diaId', id);
    return this.http
      .get<ApiResult<PaginatedData<DiaInspectionHistory>>>(`${this.baseUrl}/inspection-history`, { params })
      .pipe(map(unwrapApiResult));
  }

  create(request: DiaWriteRequest): Observable<Dia> {
    return this.http.post<ApiResult<Dia>>(this.baseUrl, request).pipe(map(unwrapApiResult));
  }

  update(id: string, request: DiaWriteRequest): Observable<Dia> {
    return this.http
      .put<ApiResult<Dia>>(`${this.baseUrl}/${id}`, request)
      .pipe(map(unwrapApiResult));
  }

  activate(id: string): Observable<Dia> {
    return this.http
      .post<ApiResult<Dia>>(`${this.baseUrl}/${id}/activate`, {})
      .pipe(map(unwrapApiResult));
  }

  deactivate(id: string): Observable<Dia> {
    return this.http
      .post<ApiResult<Dia>>(`${this.baseUrl}/${id}/deactivate`, {})
      .pipe(map(unwrapApiResult));
  }

  archive(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Brings an archived DIA back into the register, inactive. */
  restore(id: string): Observable<Dia> {
    return this.http
      .post<ApiResult<Dia>>(`${this.baseUrl}/${id}/restore`, {})
      .pipe(map(unwrapApiResult));
  }
}
