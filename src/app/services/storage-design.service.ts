import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, unwrapApiResult } from '../models/api-result.model';
import {
  CalculateStorageRequest,
  StorageDesign,
  StorageSheetPdfRequest,
} from '../models/storage-design.model';

/**
 * CCTV storage sizing. One stateless route, gated on boq.manage.
 *
 * POST despite reading nothing: the input is a nested document of camera, ANPR
 * and disk-group arrays, which does not survive a query string.
 */
@Injectable({ providedIn: 'root' })
export class StorageDesignService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/storagedesigns`;

  calculate(request: CalculateStorageRequest): Observable<StorageDesign> {
    return this.http
      .post<ApiResult<StorageDesign>>(`${this.baseUrl}/calculate`, request)
      .pipe(map(unwrapApiResult));
  }

  /**
   * The MOI submission sheet as a PDF.
   *
   * The server recalculates from the same inputs rather than being handed the
   * figures on screen, so a downloaded sheet cannot disagree with the page that
   * offered it.
   */
  downloadSheet(request: StorageSheetPdfRequest): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/pdf`, request, { responseType: 'blob' });
  }
}
