import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, unwrapApiResult } from '../models/api-result.model';
import { ContactSubmission, CreateContactRequest } from '../models/contact.model';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);

  submit(request: CreateContactRequest): Observable<ContactSubmission> {
    return this.http
      .post<ApiResult<ContactSubmission>>(`${environment.apiUrl}/contacts`, request)
      .pipe(map((result) => unwrapApiResult(result)));
  }

  remove(id: string): Observable<string> {
    return this.http
      .delete<ApiResult<string>>(`${environment.apiUrl}/contacts/${id}`)
      .pipe(map((result) => unwrapApiResult(result)));
  }

  getAll(): Observable<ContactSubmission[]> {
    return this.http
      .get<ApiResult<ContactSubmission[]>>(`${environment.apiUrl}/contacts`)
      .pipe(map((result) => unwrapApiResult(result)));
  }
}
