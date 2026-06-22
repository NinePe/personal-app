import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface PendingExpense {
  id: string;
  amount: number | null;
  description: string | null;
  category_name: string | null;
  subcategory_name: string | null;
  payment_method: string | null;
  place_name: string | null;
  place_address: string | null;
  transaction_date: string | null;
  notes: string | null;
  raw_message: string | null;
  raw_audio_url: string | null;
  is_split: boolean;
  split_people: string[] | null;
  type: string;
  status: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class PendingService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/spending/pending`;

  getPending() {
    return this.http.get<PendingExpense[]>(this.api);
  }

  getPendingById(id: string) {
    return this.http.get<PendingExpense>(`${this.api}/${id}`);
  }

  createPending(body: Partial<PendingExpense>) {
    return this.http.post<PendingExpense>(this.api, body);
  }

  updateStatus(id: string, status: string) {
    return this.http.patch<PendingExpense>(`${this.api}/${id}`, { status });
  }

  deletePending(id: string) {
    return this.http.delete(`${this.api}/${id}`);
  }
}
