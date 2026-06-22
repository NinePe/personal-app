import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProjectionLine {
  id: string;
  kind: 'income' | 'expense';
  name: string;
  sort_order: number;
  is_auto: boolean;
  auto_source?: string | null;
}
export interface ProjectionValue {
  line_id: string;
  year: number;
  month: number;
  amount: number;
}
export interface ProjectionGrid {
  year: number;
  lines: ProjectionLine[];
  values: ProjectionValue[];
  autoValues: Record<string, Record<number, number>>; // line_id → { month: amount }
}

@Injectable({ providedIn: 'root' })
export class ProjectionsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/spending`;

  getProjections(year: number): Observable<ProjectionGrid> {
    return this.http.get<ProjectionGrid>(`${this.base}/projections?year=${year}`);
  }
  setProjectionValue(body: { line_id: string; year: number; month: number; amount: number }): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${this.base}/projections/value`, body);
  }
  cloneProjectionMonth(body: { srcYear: number; srcMonth: number; dstYear: number; dstMonth: number }): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/projections/clone`, body);
  }
  clearProjectionMonth(year: number, month: number): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/projections/clear-month`, { year, month });
  }
  createProjectionLine(body: { kind: 'income' | 'expense'; name: string; sort_order?: number }): Observable<ProjectionLine> {
    return this.http.post<ProjectionLine>(`${this.base}/projections/lines`, body);
  }
  updateProjectionLine(id: string, body: { name?: string; sort_order?: number }): Observable<ProjectionLine> {
    return this.http.put<ProjectionLine>(`${this.base}/projections/lines/${id}`, body);
  }
  deleteProjectionLine(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/projections/lines/${id}`);
  }
}
