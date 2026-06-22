import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Person {
  id: string; name: string;
  relationship: 'friend' | 'family' | 'coworker' | 'organization' | 'other';
  email?: string; phone?: string; avatar_url?: string;
  notes?: string; created_at?: string;
}

export interface Place {
  id: string; name: string; address?: string; category?: string;
  notes?: string; created_at?: string;
}

export interface PlaceStat extends Place {
  total_spent: string; visit_count: number; last_visit?: string;
}

export interface Subcategory { id: string; category_id: string; name: string; sort_order: number; }

export interface Category {
  id: string; name: string; icon: string; color: string;
  sort_order: number; expense_type_id?: string;
  subcategories: Subcategory[];
}

export interface ExpenseType {
  id: string; name: string; icon: string; color: string; sort_order: number;
}

export interface MonthlyBudgetType {
  expense_type_id: string; percentage: number;
  name?: string; icon?: string; color?: string;
}

export interface MonthlyBudget {
  id: string; month: number; year: number; salary: number;
  created_at: string; types: MonthlyBudgetType[];
}

export interface TrendPoint {
  year: number; month: number;
  id: string; label: string; color?: string; total: string;
}

export interface SavingsGoal {
  id: string; name: string;
  target_amount: number; current_amount: number;
  deadline?: any; icon: string; color: string;
  status: 'active' | 'paused' | 'done';
  notes?: string; created_at?: string;
  contributions_count: number;
}

export interface SavingsContribution {
  id: string; goal_id: string; amount: number;
  note?: string; contribution_date: any; created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class SpendingService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/spending`;

  getCategories(): Observable<Category[]>  { return this.http.get<Category[]>(`${this.base}/categories`); }
  createCategory(body: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(`${this.base}/categories`, body);
  }
  updateCategory(id: string, body: Partial<Category>): Observable<Category> {
    return this.http.put<Category>(`${this.base}/categories/${id}`, body);
  }
  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/categories/${id}`);
  }
  createSubcategory(categoryId: string, body: { name: string; sort_order?: number }): Observable<Subcategory> {
    return this.http.post<Subcategory>(`${this.base}/categories/${categoryId}/subcategories`, body);
  }
  updateSubcategory(id: string, body: { name: string }): Observable<Subcategory> {
    return this.http.put<Subcategory>(`${this.base}/categories/subcategories/${id}`, body);
  }
  deleteSubcategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/categories/subcategories/${id}`);
  }
  getExpenseTypes(): Observable<ExpenseType[]> {
    return this.http.get<ExpenseType[]>(`${this.base}/budget/expense-types`);
  }
  createExpenseType(body: Partial<ExpenseType>): Observable<ExpenseType> {
    return this.http.post<ExpenseType>(`${this.base}/budget/expense-types`, body);
  }
  updateExpenseType(id: string, body: Partial<ExpenseType>): Observable<ExpenseType> {
    return this.http.put<ExpenseType>(`${this.base}/budget/expense-types/${id}`, body);
  }
  deleteExpenseType(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/budget/expense-types/${id}`);
  }
  getMonthlyBudgets(): Observable<MonthlyBudget[]> {
    return this.http.get<MonthlyBudget[]>(`${this.base}/budget/monthly`);
  }
  getMonthlyBudget(year: number, month: number): Observable<MonthlyBudget | null> {
    return this.http.get<MonthlyBudget | null>(`${this.base}/budget/monthly/${year}/${month}`);
  }
  saveMonthlyBudget(body: { month: number; year: number; salary: number; types: MonthlyBudgetType[] }): Observable<MonthlyBudget> {
    return this.http.post<MonthlyBudget>(`${this.base}/budget/monthly`, body);
  }
  getBudgetTrends(params: { months?: number; from?: string; to?: string; expense_type_id?: string; category_id?: string }): Observable<TrendPoint[]> {
    let p = new HttpParams();
    if (params.from)            p = p.set('from', params.from);
    if (params.to)              p = p.set('to', params.to);
    if (params.months)          p = p.set('months', params.months);
    if (params.expense_type_id) p = p.set('expense_type_id', params.expense_type_id);
    if (params.category_id)     p = p.set('category_id', params.category_id);
    return this.http.get<TrendPoint[]>(`${this.base}/budget/trends`, { params: p });
  }
  getPeople(): Observable<Person[]>        { return this.http.get<Person[]>(`${this.base}/people`); }
  getPlaces(q?: string): Observable<Place[]> {
    return this.http.get<Place[]>(`${this.base}/places${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  }
  getPlaceStats(filter: 'month'|'year'|'all'|'custom', from?: string, to?: string): Observable<PlaceStat[]> {
    let p = new HttpParams().set('filter', filter);
    if (filter === 'custom' && from && to) { p = p.set('from', from).set('to', to); }
    return this.http.get<PlaceStat[]>(`${this.base}/places/stats`, { params: p });
  }
  updatePlace(id: string, body: Partial<Place>): Observable<Place> {
    return this.http.put<Place>(`${this.base}/places/${id}`, body);
  }
  deletePlace(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/places/${id}`);
  }
  createPlace(body: Partial<Place>): Observable<Place> {
    return this.http.post<Place>(`${this.base}/places`, body);
  }
  updatePerson(id: string, body: Partial<Person>): Observable<Person> {
    return this.http.put<Person>(`${this.base}/people/${id}`, body);
  }
  createPerson(body: Partial<Person>): Observable<Person> {
    return this.http.post<Person>(`${this.base}/people`, body);
  }
  deletePerson(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/people/${id}`);
  }
  getSavingsGoals(): Observable<SavingsGoal[]> {
    return this.http.get<SavingsGoal[]>(`${this.base}/savings`);
  }
  createSavingsGoal(body: Partial<SavingsGoal>): Observable<SavingsGoal> {
    return this.http.post<SavingsGoal>(`${this.base}/savings`, body);
  }
  updateSavingsGoal(id: string, body: Partial<SavingsGoal>): Observable<SavingsGoal> {
    return this.http.put<SavingsGoal>(`${this.base}/savings/${id}`, body);
  }
  deleteSavingsGoal(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/savings/${id}`);
  }
  addContribution(goalId: string, body: { amount: number; note?: string; contribution_date?: string }): Observable<SavingsGoal> {
    return this.http.post<SavingsGoal>(`${this.base}/savings/${goalId}/contributions`, body);
  }
  getContributions(goalId: string): Observable<SavingsContribution[]> {
    return this.http.get<SavingsContribution[]>(`${this.base}/savings/${goalId}/contributions`);
  }
  deleteContribution(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/savings/contributions/${id}`);
  }
}
