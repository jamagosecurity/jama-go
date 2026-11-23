import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, unwrapApiResult } from '../models/api-result.model';
import {
  LunchRates, MyTravelClaims, Reimbursement, ReimbursementMethod, SubmitTravelClaim, TravelClaim, TravelClaimsBoard,
  TravelClaimApproval, TravelPersonOption, UberReceiptReading,
} from '../models/travel-claim.model';

/** Uber bills: a person's own claims, and the accountant's board. */
@Injectable({ providedIn: 'root' })
export class TravelClaimService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/travelclaims`;

  mine(): Observable<MyTravelClaims> {
    return this.http.get<ApiResult<MyTravelClaims>>(`${this.baseUrl}/mine`).pipe(map(unwrapApiResult));
  }

  people(): Observable<TravelPersonOption[]> {
    return this.http.get<ApiResult<TravelPersonOption[]>>(`${this.baseUrl}/people`).pipe(map(unwrapApiResult));
  }

  /** Reads Uber's PDF so the person can see what will be claimed. Nothing is saved. */
  read(receipt: File): Observable<UberReceiptReading> {
    const form = new FormData();
    form.set('receipt', receipt, receipt.name);
    return this.http.post<ApiResult<UberReceiptReading>>(`${this.baseUrl}/read`, form).pipe(map(unwrapApiResult));
  }

  submit(c: SubmitTravelClaim): Observable<TravelClaim> {
    const form = new FormData();
    form.set('receipt', c.receipt, c.receipt.name);
    form.set('tripType', c.tripType);
    if (c.siteName) form.set('siteName', c.siteName);
    if (c.companions.length) form.set('companions', c.companions.join(','));
    if (c.ateLunch.length) form.set('ateLunch', c.ateLunch.join(','));
    if (c.lunchBillAmount != null) form.set('lunchBillAmount', String(c.lunchBillAmount));
    if (c.lunchBill) form.set('lunchBill', c.lunchBill, c.lunchBill.name);
    if (c.note) form.set('note', c.note);
    return this.http.post<ApiResult<TravelClaim>>(this.baseUrl, form).pipe(map(unwrapApiResult));
  }

  withdraw(id: string): Observable<TravelClaim> {
    return this.http.post<ApiResult<TravelClaim>>(`${this.baseUrl}/${id}/withdraw`, {}).pipe(map(unwrapApiResult));
  }

  file(claimId: string, lineId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${claimId}/lines/${lineId}/file`, { responseType: 'blob' });
  }

  // ----- the accountant -----

  board(personId?: string | null, from?: string, to?: string): Observable<TravelClaimsBoard> {
    const params: Record<string, string> = {};
    if (personId) params['personId'] = personId;
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return this.http.get<ApiResult<TravelClaimsBoard>>(this.baseUrl, { params }).pipe(map(unwrapApiResult));
  }

  /** Approves one or many bills at once, each at the amount claimed or lower with a reason. All or nothing. */
  approve(items: TravelClaimApproval[]): Observable<TravelClaim[]> {
    return this.http.post<ApiResult<TravelClaim[]>>(`${this.baseUrl}/approve`, { items }).pipe(map(unwrapApiResult));
  }

  reject(id: string, reason: string): Observable<TravelClaim> {
    return this.http.post<ApiResult<TravelClaim>>(`${this.baseUrl}/${id}/reject`, { reason }).pipe(map(unwrapApiResult));
  }

  reimburse(claimIds: string[], method: ReimbursementMethod, reference: string | null): Observable<Reimbursement> {
    return this.http.post<ApiResult<Reimbursement>>(`${this.baseUrl}/reimburse`, { claimIds, method, reference }).pipe(map(unwrapApiResult));
  }

  lunchRates(): Observable<LunchRates> {
    return this.http.get<ApiResult<LunchRates>>(`${this.baseUrl}/lunch-rate`).pipe(map(unwrapApiResult));
  }

  setLunchRate(amountPerPerson: number, effectiveFrom: string): Observable<LunchRates> {
    return this.http.post<ApiResult<LunchRates>>(`${this.baseUrl}/lunch-rate`, { amountPerPerson, effectiveFrom }).pipe(map(unwrapApiResult));
  }
}
