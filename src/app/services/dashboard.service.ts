import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, unwrapApiResult } from '../models/api-result.model';
import { Dashboard } from '../models/dashboard.model';

/** The super admin's dashboard. The API allows only the root account. */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  get(): Observable<Dashboard> {
    return this.http.get<ApiResult<Dashboard>>(`${environment.apiUrl}/dashboard`).pipe(map(unwrapApiResult));
  }
}
