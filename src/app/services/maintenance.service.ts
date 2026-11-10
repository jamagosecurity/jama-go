import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, PaginatedData, unwrapApiResult } from '../models/api-result.model';
import {
  AssignableStaff,
  CreateMaintenanceRequest,
  MaintenanceIssueOption,
  MaintenanceRequest,
  MaintenanceRequestListItem,
  MaintenanceRequestListQuery,
  MaintenanceImage,
  SaveMaintenanceCatalogueItem,
  UpdateMaintenanceRequest,
} from '../models/maintenance.model';

/**
 * Paid service callouts — power, cabling, camera, NVR, and software trouble.
 * Non-MOI: independent of the DIA inspection module.
 *
 * Filing a ticket and reading your own are open to any signed-in account —
 * client or staff. The company-wide queue, assigning, resolving, cancelling,
 * and editing all need maintenance.manage, enforced server-side.
 */
@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/maintenance`;

  create(request: CreateMaintenanceRequest): Observable<MaintenanceRequest> {
    return this.http
      .post<ApiResult<MaintenanceRequest>>(this.baseUrl, request)
      .pipe(map(unwrapApiResult));
  }

  list(query: MaintenanceRequestListQuery): Observable<PaginatedData<MaintenanceRequestListItem>> {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber ?? 1)
      .set('pageSize', query.pageSize ?? 20);
    if (query.search) params = params.set('search', query.search);
    if (query.status) params = params.set('status', query.status);
    if (query.category) params = params.set('category', query.category);
    if (query.unassignedOnly) params = params.set('unassignedOnly', true);

    return this.http
      .get<ApiResult<PaginatedData<MaintenanceRequestListItem>>>(this.baseUrl, { params })
      .pipe(map(unwrapApiResult));
  }

  /** The signed-in account's own tickets, client or staff alike. */
  getMine(): Observable<MaintenanceRequestListItem[]> {
    return this.http
      .get<ApiResult<MaintenanceRequestListItem[]>>(`${this.baseUrl}/mine`)
      .pipe(map(unwrapApiResult));
  }

  getById(id: string): Observable<MaintenanceRequest> {
    return this.http
      .get<ApiResult<MaintenanceRequest>>(`${this.baseUrl}/${id}`)
      .pipe(map(unwrapApiResult));
  }

  update(id: string, request: UpdateMaintenanceRequest): Observable<MaintenanceRequest> {
    return this.http
      .put<ApiResult<MaintenanceRequest>>(`${this.baseUrl}/${id}`, request)
      .pipe(map(unwrapApiResult));
  }

  assign(id: string, staffId: string): Observable<MaintenanceRequest> {
    return this.http
      .post<ApiResult<MaintenanceRequest>>(`${this.baseUrl}/${id}/assign`, { staffId })
      .pipe(map(unwrapApiResult));
  }

  resolve(id: string, notes: string): Observable<MaintenanceRequest> {
    return this.http
      .post<ApiResult<MaintenanceRequest>>(`${this.baseUrl}/${id}/resolve`, { notes })
      .pipe(map(unwrapApiResult));
  }

  cancel(id: string, reason: string): Observable<MaintenanceRequest> {
    return this.http
      .post<ApiResult<MaintenanceRequest>>(`${this.baseUrl}/${id}/cancel`, { reason })
      .pipe(map(unwrapApiResult));
  }

  delete(id: string): Observable<string> {
    return this.http
      .delete<ApiResult<string>>(`${this.baseUrl}/${id}`)
      .pipe(map(unwrapApiResult));
  }

  /** The Non-MOI price list — every service and its price, as admin keeps it.
   *  Builds the checklist on every ticket screen. */
  issueCatalogue(): Observable<MaintenanceIssueOption[]> {
    return this.http
      .get<ApiResult<MaintenanceIssueOption[]>>(`${this.baseUrl}/issue-catalogue`)
      .pipe(map(unwrapApiResult));
  }

  addCatalogueItem(item: SaveMaintenanceCatalogueItem): Observable<MaintenanceIssueOption> {
    return this.http
      .post<ApiResult<MaintenanceIssueOption>>(`${this.baseUrl}/issue-catalogue`, item)
      .pipe(map(unwrapApiResult));
  }

  updateCatalogueItem(id: string, item: SaveMaintenanceCatalogueItem): Observable<MaintenanceIssueOption> {
    return this.http
      .put<ApiResult<MaintenanceIssueOption>>(`${this.baseUrl}/issue-catalogue/${id}`, item)
      .pipe(map(unwrapApiResult));
  }

  /** Renames a category admin added; resolves to the name as stored. */
  renameCategory(from: string, to: string): Observable<string> {
    return this.http
      .post<ApiResult<string>>(`${this.baseUrl}/issue-catalogue/categories/rename`, { from, to })
      .pipe(map(unwrapApiResult));
  }

  /** Deletes a category admin added and every service under it; resolves to
   *  how many services went. */
  deleteCategory(name: string): Observable<number> {
    return this.http
      .delete<ApiResult<number>>(`${this.baseUrl}/issue-catalogue/categories`, { params: { name } })
      .pipe(map(unwrapApiResult));
  }

  /** Multipart with a single `file` part. No Content-Type header is set, so the
   *  browser adds the boundary itself. */
  uploadCatalogueImage(itemId: string, file: File): Observable<MaintenanceImage> {
    const body = new FormData();
    body.append('file', file);
    return this.http
      .post<ApiResult<MaintenanceImage>>(`${this.baseUrl}/issue-catalogue/${itemId}/images`, body)
      .pipe(map(unwrapApiResult));
  }

  deleteCatalogueImage(imageId: string): Observable<string> {
    return this.http
      .delete<ApiResult<string>>(`${this.baseUrl}/issue-catalogue/images/${imageId}`)
      .pipe(map(unwrapApiResult));
  }

  deleteCatalogueItem(id: string): Observable<string> {
    return this.http
      .delete<ApiResult<string>>(`${this.baseUrl}/issue-catalogue/${id}`)
      .pipe(map(unwrapApiResult));
  }

  assignableStaff(): Observable<AssignableStaff[]> {
    return this.http
      .get<ApiResult<AssignableStaff[]>>(`${this.baseUrl}/assignable-staff`)
      .pipe(map(unwrapApiResult));
  }
}
