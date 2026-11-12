import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, unwrapApiResult } from '../models/api-result.model';
import { SiteCoordinates } from '../utils/geo.util';

/** Small map helpers that need the server. */
@Injectable({ providedIn: 'root' })
export class GeoService {
  private readonly http = inject(HttpClient);

  /** Finds the pin behind a pasted Google Maps link — a phone's short share link has to be opened to see where it leads. */
  resolve(url: string): Observable<SiteCoordinates> {
    return this.http
      .get<ApiResult<{ latitude: number; longitude: number }>>(`${environment.apiUrl}/geo/resolve`, { params: { url } })
      .pipe(map((result) => unwrapApiResult(result)));
  }
}
