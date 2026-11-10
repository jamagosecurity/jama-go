import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, unwrapApiResult } from '../models/api-result.model';
import { MailAccount, MailDetail, MailPage, MailSent, SendMailRequest } from '../models/mail.model';

/** Company mail: read, reply, forward and compose — administrators only. */
@Injectable({ providedIn: 'root' })
export class MailService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/mail`;

  accounts(): Observable<MailAccount[]> {
    return this.http.get<ApiResult<MailAccount[]>>(`${this.base}/accounts`).pipe(map(unwrapApiResult));
  }

  messages(filter: { account: string; folder: string; search: string; page: number }): Observable<MailPage> {
    let params = new HttpParams().set('page', filter.page).set('pageSize', 50);
    if (filter.account) params = params.set('account', filter.account);
    if (filter.folder) params = params.set('folder', filter.folder);
    if (filter.search.trim()) params = params.set('search', filter.search.trim());
    return this.http.get<ApiResult<MailPage>>(`${this.base}/messages`, { params }).pipe(map(unwrapApiResult));
  }

  send(request: SendMailRequest): Observable<MailSent> {
    return this.http.post<ApiResult<MailSent>>(`${this.base}/send`, request).pipe(map(unwrapApiResult));
  }

  message(id: string): Observable<MailDetail> {
    return this.http.get<ApiResult<MailDetail>>(`${this.base}/messages/${id}`).pipe(map(unwrapApiResult));
  }
}
