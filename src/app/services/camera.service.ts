import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, PaginatedData, unwrapApiResult } from '../models/api-result.model';
import {
  Camera,
  CameraImage,
  CameraListQuery,
  CameraBrandCount,
  CameraSummary,
  CameraTypeCount,
  SaveCameraRequest,
} from '../models/camera.model';

/**
 * The camera inventory API.
 *
 * These routes are anonymous on the server — no token is required, and none of
 * these calls will 401. The admin screen that uses them still sits behind the
 * admin login, so in the app a caller is signed in anyway; that is a property of
 * where the screen lives, not a guarantee the API enforces.
 */
@Injectable({ providedIn: 'root' })
export class CameraService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/cameras`;

  list(query: CameraListQuery): Observable<PaginatedData<Camera>> {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber ?? 1)
      .set('pageSize', query.pageSize ?? 20);
    // Only sent when set: an empty search would otherwise filter on '' and an
    // empty type would fail to bind to the enum.
    if (query.search) params = params.set('search', query.search);
    if (query.type) params = params.set('type', query.type);
    if (query.category) params = params.set('category', query.category);
    if (query.brand) params = params.set('brand', query.brand);
    if (query.lowStockOnly) params = params.set('lowStockOnly', true);

    return this.http
      .get<ApiResult<PaginatedData<Camera>>>(this.baseUrl, { params })
      .pipe(map(unwrapApiResult));
  }

  /** Totals across the whole inventory — the list response only ever covers a page. */
  summary(): Observable<CameraSummary> {
    return this.http
      .get<ApiResult<CameraSummary>>(`${this.baseUrl}/summary`)
      .pipe(map(unwrapApiResult));
  }

  /** Stock counts per type — drives the public catalogue's sections. */
  typeCounts(): Observable<CameraTypeCount[]> {
    return this.http
      .get<ApiResult<CameraTypeCount[]>>(`${this.baseUrl}/types`)
      .pipe(map(unwrapApiResult));
  }

  /** Brands present in the catalogue, with counts. Read from the data because
   *  brand is free text. */
  brands(): Observable<CameraBrandCount[]> {
    return this.http
      .get<ApiResult<CameraBrandCount[]>>(`${this.baseUrl}/brands`)
      .pipe(map(unwrapApiResult));
  }

  getById(id: string): Observable<Camera> {
    return this.http.get<ApiResult<Camera>>(`${this.baseUrl}/${id}`).pipe(map(unwrapApiResult));
  }

  create(request: SaveCameraRequest): Observable<Camera> {
    return this.http.post<ApiResult<Camera>>(this.baseUrl, request).pipe(map(unwrapApiResult));
  }

  update(id: string, request: SaveCameraRequest): Observable<Camera> {
    return this.http
      .put<ApiResult<Camera>>(`${this.baseUrl}/${id}`, request)
      .pipe(map(unwrapApiResult));
  }

  delete(id: string): Observable<string> {
    return this.http.delete<ApiResult<string>>(`${this.baseUrl}/${id}`).pipe(map(unwrapApiResult));
  }

  /** Uploads one image. Sent as multipart; no Content-Type header is set by hand
   *  so the browser can add the multipart boundary itself. */
  uploadImage(cameraId: string, file: File): Observable<CameraImage> {
    const body = new FormData();
    body.append('file', file);

    return this.http
      .post<ApiResult<CameraImage>>(`${this.baseUrl}/${cameraId}/images`, body)
      .pipe(map(unwrapApiResult));
  }

  deleteImage(imageId: string): Observable<string> {
    return this.http
      .delete<ApiResult<string>>(`${this.baseUrl}/images/${imageId}`)
      .pipe(map(unwrapApiResult));
  }
}
