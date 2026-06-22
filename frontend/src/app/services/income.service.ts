import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface IncomeSubcategory { id: string; category_id: string; name: string; sort_order: number; }

export interface IncomeCategory {
  id: string; name: string; icon: string; color: string; sort_order: number;
  subcategories: IncomeSubcategory[];
}

export interface Income {
  id: string; amount: number; description?: string;
  card_id?: string; category_id?: string; subcategory_id?: string;
  transaction_date: string; notes?: string;
  receipt_url?: string; created_at?: string;
  card?:        { id: string; name: string; type: string; last_four: string; };
  category?:    { id: string; name: string; icon: string; color: string; };
  subcategory?: { id: string; name: string; };
}

export interface IncomeSummary {
  total: string; count: number; from: string; to: string;
  prev_total: string | null;
}

@Injectable({ providedIn: 'root' })
export class IncomeService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/spending`;

  getIncomeCategories(): Observable<IncomeCategory[]> {
    return this.http.get<IncomeCategory[]>(`${this.base}/income/categories`);
  }
  getIncomeSummary(month: number, year: number): Observable<IncomeSummary> {
    return this.http.get<IncomeSummary>(`${this.base}/income/summary?month=${month}&year=${year}`);
  }
  getIncome(filters?: { month?: number; year?: number; from?: string; to?: string; category_id?: string }): Observable<Income[]> {
    let p = new HttpParams();
    if (filters?.month)       p = p.set('month', filters.month);
    if (filters?.year)        p = p.set('year',  filters.year);
    if (filters?.from)        p = p.set('from',  filters.from);
    if (filters?.to)          p = p.set('to',    filters.to);
    if (filters?.category_id) p = p.set('category_id', filters.category_id);
    return this.http.get<Income[]>(`${this.base}/income`, { params: p });
  }
  createIncome(body: { amount: number; description?: string; card_id?: string; category_id?: string; subcategory_id?: string; transaction_date: string; notes?: string }): Observable<Income> {
    return this.http.post<Income>(`${this.base}/income`, body);
  }
  getIncomeById(id: string): Observable<Income> {
    return this.http.get<Income>(`${this.base}/income/${id}`);
  }
  updateIncome(id: string, body: Partial<Income>): Observable<Income> {
    return this.http.put<Income>(`${this.base}/income/${id}`, body);
  }
  deleteIncome(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/income/${id}`);
  }
}
