import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, unwrapApiResult } from '../models/api-result.model';
import {
  ApproveClientRegistrationRequest,
  ClientRegistration,
  ClientRegistrationList,
  ClientRegistrationStatus,
  MyClientRegistration,
  RegisterClientRequest,
} from '../models/client-registration.model';

/**
 * Client self-registration and the admin review of it.
 *
 * `pendingCount` is shared state on purpose: the sidebar badge and the review
 * page both show it, and an accept or reject on the page has to move the badge
 * without the sidebar polling for it.
 */
@Injectable({ providedIn: 'root' })
export class ClientRegistrationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/clientregistrations`;

  readonly pendingCount = signal(0);

  /** Anonymous. Returns the confirmation sentence to show the client. */
  register(request: RegisterClientRequest): Observable<string> {
    return this.http
      .post<ApiResult<string>>(`${this.baseUrl}/register`, request)
      .pipe(map(unwrapApiResult));
  }

  list(status: ClientRegistrationStatus, search?: string): Observable<ClientRegistrationList> {
    let params = new HttpParams().set('status', status);
    if (search?.trim()) params = params.set('search', search.trim());

    return this.http
      .get<ApiResult<ClientRegistrationList>>(this.baseUrl, { params })
      .pipe(
        map(unwrapApiResult),
        tap((list) => this.pendingCount.set(list.counts.pending)),
      );
  }

  refreshPendingCount(): void {
    this.http
      .get<ApiResult<number>>(`${this.baseUrl}/pending-count`)
      .pipe(map(unwrapApiResult))
      .subscribe({
        next: (count) => this.pendingCount.set(count),
        // A badge is a hint, not a feature — a failed count simply shows none.
        error: () => this.pendingCount.set(0),
      });
  }

  approve(id: string, request: ApproveClientRegistrationRequest): Observable<ClientRegistration> {
    return this.http
      .post<ApiResult<ClientRegistration>>(`${this.baseUrl}/${id}/approve`, request)
      .pipe(map(unwrapApiResult));
  }

  reject(id: string, reason: string): Observable<ClientRegistration> {
    return this.http
      .post<ApiResult<ClientRegistration>>(`${this.baseUrl}/${id}/reject`, { reason })
      .pipe(map(unwrapApiResult));
  }

  /** The signed-in client's own registration. 404 for a VIP client who was
   *  set up by an admin and never registered — not an error for the portal. */
  getMine(): Observable<MyClientRegistration> {
    return this.http
      .get<ApiResult<MyClientRegistration>>(`${this.baseUrl}/me`)
      .pipe(map(unwrapApiResult));
  }
}
