import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, unwrapApiResult } from '../models/api-result.model';
import { MaintenanceImage, MaintenanceIssueOption, SaveMaintenanceCatalogueItem } from '../models/maintenance.model';

/** The MOI services price list — separate from the Non-MOI list and from the MOI stock inventory.
 *  Same methods as the Non-MOI price list in MaintenanceService, so the screens read the same. */
@Injectable({ providedIn: 'root' })
export class MoiServicesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/moijobs/services`;

  issueCatalogue(): Observable<MaintenanceIssueOption[]> {
    return this.http
      .get<ApiResult<MaintenanceIssueOption[]>>(`${this.baseUrl}`)
      .pipe(map(unwrapApiResult));
  }

  addCatalogueItem(item: SaveMaintenanceCatalogueItem): Observable<MaintenanceIssueOption> {
    return this.http
      .post<ApiResult<MaintenanceIssueOption>>(`${this.baseUrl}`, item)
      .pipe(map(unwrapApiResult));
  }

  updateCatalogueItem(id: string, item: SaveMaintenanceCatalogueItem): Observable<MaintenanceIssueOption> {
    return this.http
      .put<ApiResult<MaintenanceIssueOption>>(`${this.baseUrl}/${id}`, item)
      .pipe(map(unwrapApiResult));
  }

  /** Renames a category admin added; resolves to the name as stored. */
  renameCategory(from: string, to: string): Observable<string> {
    return this.http
      .post<ApiResult<string>>(`${this.baseUrl}/categories/rename`, { from, to })
      .pipe(map(unwrapApiResult));
  }

  /** Deletes a category admin added and every service under it; resolves to
   *  how many services went. */
  deleteCategory(name: string): Observable<number> {
    return this.http
      .delete<ApiResult<number>>(`${this.baseUrl}/categories`, { params: { name } })
      .pipe(map(unwrapApiResult));
  }

  /** Multipart with a single `file` part. No Content-Type header is set, so the
   *  browser adds the boundary itself. */
  uploadCatalogueImage(itemId: string, file: File): Observable<MaintenanceImage> {
    const body = new FormData();
    body.append('file', file);
    return this.http
      .post<ApiResult<MaintenanceImage>>(`${this.baseUrl}/${itemId}/images`, body)
      .pipe(map(unwrapApiResult));
  }

  deleteCatalogueImage(imageId: string): Observable<string> {
    return this.http
      .delete<ApiResult<string>>(`${this.baseUrl}/images/${imageId}`)
      .pipe(map(unwrapApiResult));
  }

  deleteCatalogueItem(id: string): Observable<string> {
    return this.http
      .delete<ApiResult<string>>(`${this.baseUrl}/${id}`)
      .pipe(map(unwrapApiResult));
  }
}
