import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResult, unwrapApiResult } from '../models/api-result.model';

export interface ProfileInfo {
  userId: string;
  fullName: string;
  designation: string | null;
  photoVersion: number;
  phone: string | null;
}

/** A person's picture and the designation they write. Each account edits its own; an administrator may edit anyone's. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/profile`;

  /** One download per picture per version, however many places show it. */
  private readonly photos = new Map<string, Observable<string | null>>();

  /** An object URL for the picture, or null when it cannot be loaded. The request carries the sign-in, so it is fetched, not linked. */
  photo(userId: string, version: number): Observable<string | null> {
    const key = `${userId}:${version}`;
    let cached = this.photos.get(key);
    if (!cached) {
      cached = this.http
        .get(`${this.baseUrl}/${userId}/photo`, { params: { v: version }, responseType: 'blob' })
        .pipe(
          map((blob) => URL.createObjectURL(blob)),
          catchError(() => of(null)),
          shareReplay(1),
        );
      this.photos.set(key, cached);
    }
    return cached;
  }

  saveProfile(userId: string, designation: string, phone: string): Observable<ProfileInfo> {
    return this.http
      .put<ApiResult<ProfileInfo>>(`${this.baseUrl}/${userId}`, { designation, phone })
      .pipe(map((result) => unwrapApiResult(result)));
  }

  uploadPhoto(userId: string, picture: Blob): Observable<ProfileInfo> {
    const form = new FormData();
    form.append('file', picture, 'profile.jpg');
    return this.http
      .post<ApiResult<ProfileInfo>>(`${this.baseUrl}/${userId}/photo`, form)
      .pipe(map((result) => unwrapApiResult(result)));
  }

  removePhoto(userId: string): Observable<ProfileInfo> {
    return this.http
      .delete<ApiResult<ProfileInfo>>(`${this.baseUrl}/${userId}/photo`)
      .pipe(map((result) => unwrapApiResult(result)));
  }
}
