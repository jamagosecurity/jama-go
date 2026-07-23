import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, unwrapApiResult } from '../models/api-result.model';
import { Invoice, InvoiceShareLink } from '../models/invoice.model';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/invoices`;

  getList(diaId?: string): Observable<Invoice[]> {
    let params = new HttpParams();
    if (diaId) params = params.set('diaId', diaId);
    return this.http
      .get<ApiResult<Invoice[]>>(this.baseUrl, { params })
      .pipe(map(unwrapApiResult));
  }

  download(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/download`, { responseType: 'blob' });
  }

  createShareLink(id: string): Observable<InvoiceShareLink> {
    return this.http
      .post<ApiResult<InvoiceShareLink>>(`${this.baseUrl}/${id}/share`, {})
      .pipe(map(unwrapApiResult));
  }

  buildShareUrl(token: string): string {
    return `${window.location.origin}${environment.apiUrl}/invoices/shared/${token}`;
  }
}
