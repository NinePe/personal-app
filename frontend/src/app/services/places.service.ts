import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Place {
  id: string; name: string; address?: string; category?: string;
  notes?: string; created_at?: string;
}

export interface PlaceStat extends Place {
  total_spent: string; visit_count: number; last_visit?: string;
}

@Injectable({ providedIn: 'root' })
export class PlacesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/spending`;

  getPlaces(q?: string): Observable<Place[]> {
    return this.http.get<Place[]>(`${this.base}/places${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  }
  getPlaceStats(filter: 'month'|'year'|'all'|'custom', from?: string, to?: string): Observable<PlaceStat[]> {
    let p = new HttpParams().set('filter', filter);
    if (filter === 'custom' && from && to) { p = p.set('from', from).set('to', to); }
    return this.http.get<PlaceStat[]>(`${this.base}/places/stats`, { params: p });
  }
  createPlace(body: Partial<Place>): Observable<Place> {
    return this.http.post<Place>(`${this.base}/places`, body);
  }
  updatePlace(id: string, body: Partial<Place>): Observable<Place> {
    return this.http.put<Place>(`${this.base}/places/${id}`, body);
  }
  deletePlace(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/places/${id}`);
  }
}
