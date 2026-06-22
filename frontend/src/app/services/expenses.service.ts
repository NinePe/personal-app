import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SplitEntry {
  person_id?: string; is_me?: boolean;
  amount?: number; percentage?: number;
  person?: { id: string; name: string; relationship?: string; email?: string; phone?: string; avatar_url?: string; notes?: string; created_at?: string; };
}

export interface Expense {
  id: string; amount: number; description?: string;
  transaction_date: string; is_split: boolean; split_method?: string;
  receipt_url?: string; receipt_type?: string; notes?: string;
  card: { id: string; name: string; type: string; last_four: string; };
  category: { id: string; name: string; icon: string; color: string; };
  subcategory?: { id: string; name: string; };
  place?: { id: string; name: string; };
  splits: SplitEntry[];
}

export interface CategoryStat {
  name: string; color: string; icon: string;
  total: string; count: string;
}

export interface ExpenseSummary {
  total: string; count: string;
  byCategory: CategoryStat[];
  from: string; to: string;
}

export interface PersonSplit {
  person_id: string | null; name: string;
  is_me: boolean; amount: string;
  percentage: number; expense_count: string;
}

export interface SplitDetailRow {
  id: string;
  expense_total: string;
  description?: string;
  transaction_date: string;
  split_amount: string;
  is_me: boolean;
  percentage?: number;
  category: { id: string; name: string; icon: string };
  place?:   { id: string; name: string } | null;
  person?:  { id: string; name: string } | null;
}

export interface MonthStat {
  month: number; year: number;
  from_date: string; to_date: string;
  total: string; count: number; split_count: number;
}

export interface NewExpense {
  amount: number;
  description?: string;
  card_id: string;
  category_id: string;
  subcategory_id?: string;
  place_id?: string;
  transaction_date: string;
  is_split: boolean;
  split_method?: 'equal' | 'specific' | 'percentage';
  splits?: SplitEntry[];
  notes?: string;
}

export interface TrendPoint {
  year: number; month: number;
  id: string; label: string; color?: string; total: string;
}

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/spending`;

  getExpenses(filters?: { month?: number; year?: number; from?: string; to?: string; card_id?: string; category_id?: string }): Observable<Expense[]> {
    let params = new HttpParams();
    if (filters?.from)        params = params.set('from', filters.from);
    if (filters?.to)          params = params.set('to', filters.to);
    if (filters?.month)       params = params.set('month', filters.month);
    if (filters?.year)        params = params.set('year', filters.year);
    if (filters?.card_id)     params = params.set('card_id', filters.card_id);
    if (filters?.category_id) params = params.set('category_id', filters.category_id);
    return this.http.get<Expense[]>(`${this.base}/expenses`, { params });
  }
  getSummary(month: number, year: number, cardId?: string): Observable<ExpenseSummary> {
    let p = new HttpParams().set('month', month).set('year', year);
    if (cardId) p = p.set('card_id', cardId);
    return this.http.get<ExpenseSummary>(`${this.base}/expenses/summary`, { params: p });
  }
  getSummaryByRange(from: string, to: string, cardId?: string): Observable<ExpenseSummary> {
    let p = new HttpParams().set('from', from).set('to', to);
    if (cardId) p = p.set('card_id', cardId);
    return this.http.get<ExpenseSummary>(`${this.base}/expenses/summary`, { params: p });
  }
  getPeopleSplit(month: number, year: number, cardId?: string): Observable<PersonSplit[]> {
    let p = new HttpParams().set('month', month).set('year', year);
    if (cardId) p = p.set('card_id', cardId);
    return this.http.get<PersonSplit[]>(`${this.base}/expenses/people-split`, { params: p });
  }
  getPeopleSplitByRange(from: string, to: string, cardId?: string): Observable<PersonSplit[]> {
    let p = new HttpParams().set('from', from).set('to', to);
    if (cardId) p = p.set('card_id', cardId);
    return this.http.get<PersonSplit[]>(`${this.base}/expenses/people-split`, { params: p });
  }
  getSplitDetail(from: string, to: string, cardId?: string, personId?: string): Observable<SplitDetailRow[]> {
    let p = new HttpParams().set('from', from).set('to', to);
    if (cardId)   p = p.set('card_id', cardId);
    if (personId) p = p.set('person_id', personId);
    return this.http.get<SplitDetailRow[]>(`${this.base}/expenses/split-detail`, { params: p });
  }
  getMonthlyStats(cardId: string, year: number): Observable<MonthStat[]> {
    return this.http.get<MonthStat[]>(`${this.base}/expenses/monthly-stats?card_id=${cardId}&year=${year}`);
  }
  getExpenseById(id: string): Observable<Expense> {
    return this.http.get<Expense>(`${this.base}/expenses/${id}`);
  }
  createExpense(body: NewExpense): Observable<any> {
    return this.http.post(`${this.base}/expenses`, body);
  }
  updateExpense(id: string, body: Partial<NewExpense>): Observable<Expense> {
    return this.http.put<Expense>(`${this.base}/expenses/${id}`, body);
  }
  deleteExpense(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/expenses/${id}`);
  }
  uploadReceipt(expenseId: string, file: File): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post(`${this.base}/expenses/${expenseId}/receipt`, fd);
  }
}
