import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, unwrapApiResult } from '../models/api-result.model';
import { CashHandover, CashKind, ConfirmHandover, OnlinePayments, PendingHandovers } from '../models/cash-handover.model';

/** The accountant's panel: cash handed over at the end of the day, and the online transfers to check. */
@Injectable({ providedIn: 'root' })
export class CashHandoverService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/cashhandovers`;

  /** Per person, the cash not yet handed over. */
  pending(kind: CashKind): Observable<PendingHandovers> {
    return this.http.get<ApiResult<PendingHandovers>>(this.baseUrl, { params: { kind } }).pipe(map(unwrapApiResult));
  }

  /** The accountant counted one person's cash and records it. */
  confirm(body: ConfirmHandover): Observable<CashHandover> {
    return this.http.post<ApiResult<CashHandover>>(this.baseUrl, body).pipe(map(unwrapApiResult));
  }

  /** Handovers between two days (yyyy-MM-dd, both included). */
  history(kind: CashKind, from: string, to: string): Observable<CashHandover[]> {
    return this.http.get<ApiResult<CashHandover[]>>(`${this.baseUrl}/history`, { params: { kind, from, to } }).pipe(map(unwrapApiResult));
  }

  /** Online transfers between two days, to check against the bank. */
  online(kind: CashKind, from: string, to: string): Observable<OnlinePayments> {
    return this.http.get<ApiResult<OnlinePayments>>(`${this.baseUrl}/online`, { params: { kind, from, to } }).pipe(map(unwrapApiResult));
  }

  receipt(kind: CashKind, paymentId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/online/${kind}/${paymentId}/receipt`, { responseType: 'blob' });
  }
}
