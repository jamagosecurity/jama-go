import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, unwrapApiResult } from '../models/api-result.model';
import { SUPPRESS_FORBIDDEN_REDIRECT } from '../interceptors/auth.interceptor';
import {
  AdminStaffMember,
  CreateStaffRequest,
  PermissionCatalogue,
  StaffMember,
  UpdateMyStaffProfileRequest,
  UpdateStaffRequest,
} from '../models/staff.model';

@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/staff`;

  /** Public: active staff for the marketing site. */
  getActive(): Observable<StaffMember[]> {
    return this.http
      .get<ApiResult<StaffMember[]>>(this.baseUrl)
      .pipe(map((result) => unwrapApiResult(result)));
  }

  /**
   * Admin: all staff including inactive. Requires Bearer token.
   *
   * A boq.amend holder without the Admin role calls this too, for the amend
   * modal's optional "who asked for this" picker — pass `optional: true`
   * there so a 403 degrades to an empty dropdown instead of the global
   * interceptor bouncing them off the page they were amending.
   */
  getAll(options?: { optional?: boolean }): Observable<AdminStaffMember[]> {
    return this.http
      .get<ApiResult<AdminStaffMember[]>>(`${this.baseUrl}/all`, {
        context: options?.optional
          ? new HttpContext().set(SUPPRESS_FORBIDDEN_REDIRECT, true)
          : undefined,
      })
      .pipe(map((result) => unwrapApiResult(result)));
  }

  getById(id: string): Observable<AdminStaffMember> {
    return this.http
      .get<ApiResult<AdminStaffMember>>(`${this.baseUrl}/${id}`)
      .pipe(map((result) => unwrapApiResult(result)));
  }

  getMine(): Observable<AdminStaffMember> {
    return this.http
      .get<ApiResult<AdminStaffMember>>(`${this.baseUrl}/me`)
      .pipe(map((result) => unwrapApiResult(result)));
  }

  /**
   * Staff self-service. Only name and responsibility are editable — role,
   * department and account status stay under admin control on the server.
   */
  updateMine(request: UpdateMyStaffProfileRequest): Observable<string> {
    return this.http
      .put<ApiResult<string>>(`${this.baseUrl}/me`, request)
      .pipe(map((result) => unwrapApiResult(result)));
  }

  /** Admin: every permission that can be granted, for rendering the picker. */
  getPermissionCatalogue(): Observable<PermissionCatalogue> {
    return this.http
      .get<ApiResult<PermissionCatalogue>>(`${this.baseUrl}/permissions`)
      .pipe(map((result) => unwrapApiResult(result)));
  }

  /** Admin: replaces a staff member's grants with exactly this set. */
  setPermissions(id: string, permissions: string[]): Observable<string> {
    return this.http
      .put<ApiResult<string>>(`${this.baseUrl}/${id}/permissions`, { permissions })
      .pipe(map((result) => unwrapApiResult(result)));
  }

  create(request: CreateStaffRequest): Observable<string> {
    return this.http
      .post<ApiResult<string>>(this.baseUrl, request)
      .pipe(map((result) => unwrapApiResult(result)));
  }

  update(id: string, request: UpdateStaffRequest): Observable<string> {
    return this.http
      .put<ApiResult<string>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((result) => unwrapApiResult(result)));
  }

  delete(id: string): Observable<string> {
    return this.http
      .delete<ApiResult<string>>(`${this.baseUrl}/${id}`)
      .pipe(map((result) => unwrapApiResult(result)));
  }
}
