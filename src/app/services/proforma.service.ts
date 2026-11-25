import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, PaginatedData, unwrapApiResult } from '../models/api-result.model';
import { BoqStatus } from '../models/boq.model';
import { AdminQuotation, Proforma, ProformaCustomer, ProformaFileFormat, ProformaSheet } from '../models/proforma.model';

/** The administrator's section: every quotation, and the proforma invoice of each. */
@Injectable({ providedIn: 'root' })
export class ProformaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/proformas`;

  quotations(page: number, search: string, status: BoqStatus | ''): Observable<PaginatedData<AdminQuotation>> {
    const params: Record<string, string> = { pageNumber: String(page), pageSize: '25' };
    if (search.trim()) params['search'] = search.trim();
    if (status) params['status'] = status;
    return this.http
      .get<ApiResult<PaginatedData<AdminQuotation>>>(`${this.baseUrl}/quotations`, { params })
      .pipe(map(unwrapApiResult));
  }

  /** A quotation opened as its proforma invoice. */
  sheet(boqId: string): Observable<ProformaSheet> {
    return this.http.get<ApiResult<ProformaSheet>>(`${this.baseUrl}/${boqId}`).pipe(map(unwrapApiResult));
  }

  /** Gives an approved quotation its PI number (the first time) and saves the client's P.O. and customer details. */
  save(boqId: string, poNumber: string, poDate: string, customer: ProformaCustomer): Observable<Proforma> {
    return this.http
      .post<ApiResult<Proforma>>(`${this.baseUrl}/${boqId}`, {
        poNumber: poNumber.trim() || null,
        poDate: poDate || null,
        customerName: customer.name.trim() || null,
        projectName: customer.project.trim() || null,
        contactNumber: customer.contactNumber.trim() || null,
        location: customer.location.trim() || null,
      })
      .pipe(map(unwrapApiResult));
  }

  /** The PDF as it will download, with the P.O. as typed. Saves nothing and uses up no number. */
  preview(boqId: string, poNumber: string, poDate: string, customer: ProformaCustomer): Observable<Blob> {
    const params: Record<string, string> = {};
    if (poNumber.trim()) params['poNumber'] = poNumber.trim();
    if (poDate) params['poDate'] = poDate;
    if (customer.name.trim()) params['customerName'] = customer.name.trim();
    if (customer.project.trim()) params['projectName'] = customer.project.trim();
    if (customer.contactNumber.trim()) params['contactNumber'] = customer.contactNumber.trim();
    if (customer.location.trim()) params['location'] = customer.location.trim();
    return this.http.get(`${this.baseUrl}/${boqId}/preview`, { params, responseType: 'blob' });
  }

  /** The proforma as a PDF, Excel or Word file — the same document in each. */
  file(boqId: string, format: ProformaFileFormat): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${boqId}/file`, { params: { format }, responseType: 'blob' });
  }
}
