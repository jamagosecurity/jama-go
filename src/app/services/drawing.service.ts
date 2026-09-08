import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, PaginatedData, unwrapApiResult } from '../models/api-result.model';
import {
  Drawing,
  DrawingFile,
  DrawingListItem,
  DrawingListQuery,
  SaveDrawingRequest,
} from '../models/drawing.model';

/**
 * CAD drawings, submitted for approval independently of quotations.
 *
 * Reading takes either grant; drafting takes drawing.manage; approving and
 * rejecting take drawing.approve. The API enforces each — these methods exist
 * for accounts that hold the grant, and calling one without it comes back 403
 * rather than working because a button was visible.
 */
@Injectable({ providedIn: 'root' })
export class DrawingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/drawings`;

  list(query: DrawingListQuery): Observable<PaginatedData<DrawingListItem>> {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber ?? 1)
      .set('pageSize', query.pageSize ?? 20);
    if (query.search) params = params.set('search', query.search);
    if (query.status) params = params.set('status', query.status);
    if (query.mineOnly) params = params.set('mineOnly', true);

    return this.http
      .get<ApiResult<PaginatedData<DrawingListItem>>>(this.baseUrl, { params })
      .pipe(map(unwrapApiResult));
  }

  getById(id: string): Observable<Drawing> {
    return this.http.get<ApiResult<Drawing>>(`${this.baseUrl}/${id}`).pipe(map(unwrapApiResult));
  }

  create(request: SaveDrawingRequest): Observable<Drawing> {
    return this.http.post<ApiResult<Drawing>>(this.baseUrl, request).pipe(map(unwrapApiResult));
  }

  update(id: string, request: SaveDrawingRequest): Observable<Drawing> {
    return this.http
      .put<ApiResult<Drawing>>(`${this.baseUrl}/${id}`, request)
      .pipe(map(unwrapApiResult));
  }

  delete(id: string): Observable<string> {
    return this.http.delete<ApiResult<string>>(`${this.baseUrl}/${id}`).pipe(map(unwrapApiResult));
  }

  /** The DWG, the plotted PDF, or a ZIP of the drawing with its xrefs. */
  uploadFile(drawingId: string, file: File): Observable<DrawingFile> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http
      .post<ApiResult<DrawingFile>>(`${this.baseUrl}/${drawingId}/files`, form)
      .pipe(map(unwrapApiResult));
  }

  deleteFile(fileId: string): Observable<string> {
    return this.http
      .delete<ApiResult<string>>(`${this.baseUrl}/files/${fileId}`)
      .pipe(map(unwrapApiResult));
  }

  /** The file comes back as bytes, not the ApiResult envelope. */
  downloadFile(fileId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/files/${fileId}`, { responseType: 'blob' });
  }

  /** Hands it to an approver. Part of drafting, so drawing.manage covers it. */
  submit(id: string): Observable<Drawing> {
    return this.http
      .post<ApiResult<Drawing>>(`${this.baseUrl}/${id}/submit`, {})
      .pipe(map(unwrapApiResult));
  }

  approve(id: string): Observable<Drawing> {
    return this.http
      .post<ApiResult<Drawing>>(`${this.baseUrl}/${id}/approve`, {})
      .pipe(map(unwrapApiResult));
  }

  /** The reason is required by the server, not just by the modal that asks. */
  reject(id: string, reason: string): Observable<Drawing> {
    return this.http
      .post<ApiResult<Drawing>>(`${this.baseUrl}/${id}/reject`, { reason })
      .pipe(map(unwrapApiResult));
  }
}
