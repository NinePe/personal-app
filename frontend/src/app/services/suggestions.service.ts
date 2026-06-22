import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface ReadingSuggestion { title: string; author: string; reason: string; genre: string; }
export interface SpendingSuggestion { title: string; description: string; potentialSaving: string; }
export interface MonthlyProjection { month: string; estimatedSpend: number; estimatedSave: number; }
export interface SpendingSuggestionsResponse { suggestions: SpendingSuggestion[]; projection: { monthly: MonthlyProjection[] }; }

@Injectable({ providedIn: 'root' })
export class SuggestionsService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/suggestions`;

  getReadingSuggestions(refresh = false) {
    const params = refresh ? '?refresh=true' : '';
    return this.http.post<{ suggestions: ReadingSuggestion[] }>(`${this.api}/reading${params}`, {});
  }

  getSpendingSuggestions(refresh = false) {
    const params = refresh ? '?refresh=true' : '';
    return this.http.post<SpendingSuggestionsResponse>(`${this.api}/spending${params}`, {});
  }
}
