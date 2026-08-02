import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, unwrapApiResult } from '../models/api-result.model';
import {
  CreateVipClientRequest,
  UpdateVipClientRequest,
  VipClientDetail,
  VipClientDocument,
  VipClientListItem,
} from '../models/vip-client.model';

@Injectable({ providedIn: 'root' })
export class VipClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vipclients`;

  list(): Observable<VipClientListItem[]> {
    return this.http.get<ApiResult<VipClientListItem[]>>(this.baseUrl).pipe(map(unwrapApiResult));
  }

  getById(id: string): Observable<VipClientDetail> {
    return this.http
      .get<ApiResult<VipClientDetail>>(`${this.baseUrl}/${id}`)
      .pipe(map(unwrapApiResult));
  }

  /** The signed-in client's own project. Resolved server-side from the token. */
  getMyProject(): Observable<VipClientDetail> {
    return this.http
      .get<ApiResult<VipClientDetail>>(`${this.baseUrl}/me`)
      .pipe(map(unwrapApiResult));
  }

  create(request: CreateVipClientRequest): Observable<string> {
    return this.http
      .post<ApiResult<string>>(this.baseUrl, request)
      .pipe(map(unwrapApiResult));
  }

  update(id: string, request: UpdateVipClientRequest): Observable<string> {
    return this.http
      .put<ApiResult<string>>(`${this.baseUrl}/${id}`, request)
      .pipe(map(unwrapApiResult));
  }

  delete(id: string): Observable<string> {
    return this.http
      .delete<ApiResult<string>>(`${this.baseUrl}/${id}`)
      .pipe(map(unwrapApiResult));
  }

  upload(folderId: string, file: File): Observable<VipClientDocument> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http
      .post<ApiResult<VipClientDocument>>(`${this.baseUrl}/folders/${folderId}/documents`, form)
      .pipe(map(unwrapApiResult));
  }

  deleteDocument(documentId: string): Observable<string> {
    return this.http
      .delete<ApiResult<string>>(`${this.baseUrl}/documents/${documentId}`)
      .pipe(map(unwrapApiResult));
  }

  /**
   * Downloads as a blob rather than linking directly: the endpoint requires an
   * Authorization header, which a plain <a href> cannot send.
   */
  download(documentId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/documents/${documentId}/download`, {
      responseType: 'blob',
    });
  }
}
