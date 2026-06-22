import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Bank { id: string; name: string; }

export interface Card {
  id: string; name: string; type: 'credit' | 'debit';
  consumed_credit?: string | number;
  computed_available_credit?: string | number | null;
  bank_id: string; bank_name: string; last_four: string; holder_name: string;
  color?: string;
  credit_limit?: number; available_credit?: number;
  payment_due_day?: number; billing_cycle_day?: number;
}

export const CARD_COLORS: Record<string, { from: string; to: string; label: string }> = {
  purple:   { from: '#68558d', to: '#5c4980', label: 'Purple'   },
  teal:     { from: '#366859', to: '#2a5c4d', label: 'Teal'     },
  blue:     { from: '#2563eb', to: '#1e3a8a', label: 'Blue'     },
  midnight: { from: '#4f46e5', to: '#3730a3', label: 'Midnight' },
  forest:   { from: '#15803d', to: '#166534', label: 'Forest'   },
  ocean:    { from: '#0891b2', to: '#0e7490', label: 'Ocean'    },
  black:    { from: '#1f2937', to: '#030712', label: 'Black'    },
  platinum: { from: '#94a3b8', to: '#475569', label: 'Platinum' },
  golden:   { from: '#f59e0b', to: '#b45309', label: 'Golden'   },
};

export interface BillingCycle {
  id: string; card_id: string;
  name: string; from_date: string; to_date: string;
  total: string; count: number;
  paid: boolean; paid_at?: string | null;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class CardsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/spending`;

  getCards(): Observable<Card[]>           { return this.http.get<Card[]>(`${this.base}/cards`); }
  getBanks(): Observable<Bank[]>           { return this.http.get<Bank[]>(`${this.base}/cards/banks`); }
  createCard(body: Partial<Card> & { type: string }): Observable<Card> {
    return this.http.post<Card>(`${this.base}/cards`, body);
  }
  getCycles(cardId: string): Observable<BillingCycle[]> {
    return this.http.get<BillingCycle[]>(`${this.base}/cards/${cardId}/cycles`);
  }
  createCycle(cardId: string, body: { name: string; from_date: string; to_date: string }): Observable<BillingCycle> {
    return this.http.post<BillingCycle>(`${this.base}/cards/${cardId}/cycles`, body);
  }
  updateCycle(id: string, body: { name: string; from_date: string; to_date: string }): Observable<BillingCycle> {
    return this.http.put<BillingCycle>(`${this.base}/cards/cycles/${id}`, body);
  }
  deleteCycle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/cards/cycles/${id}`);
  }
  setCyclePaid(id: string, paid: boolean): Observable<BillingCycle> {
    return this.http.patch<BillingCycle>(`${this.base}/cards/cycles/${id}/paid`, { paid });
  }
}
