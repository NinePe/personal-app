import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

export interface SplitEntry {
  person_id?: string; is_me?: boolean;
  amount?: number; percentage?: number;
  person?: Person;
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

export interface BillingCycle {
  id: string; card_id: string;
  name: string; from_date: string; to_date: string;
  total: string; count: number;
  paid: boolean; paid_at?: string | null;
  created_at?: string;
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

// ── Loans ───────────────────────────────────────────────
export interface Loan {
  id: string;
  person_id: string;
  direction: 'i_lent' | 'i_borrowed';
  amount: string;
  description?: string;
  transaction_date: string;
  card_id?: string | null;
  created_at?: string;
  person?: { id: string; name: string; avatar_url?: string; relationship?: string };
  card?:   { id: string; name: string; type: string; last_four: string } | null;
}

export interface LoanPersonSummary {
  id: string;
  name: string;
  avatar_url?: string;
  relationship?: string;
  total_lent:     string;
  total_borrowed: string;
  balance:        string;   // signed: >0 they owe me, <0 I owe them
  transaction_count: number;
  last_activity:  string;
  last_description?: string;
}

export interface LoansSummary {
  totals: {
    total_owed_to_me: string;
    total_i_owe:      string;
    borrowers:        number;
    creditors:        number;
  };
  people: LoanPersonSummary[];
}

export interface LoanHistory {
  person: Person;
  balance: string;
  stats: {
    total_lent:     string;
    total_borrowed: string;
    times_lent:     number;
    times_borrowed: number;
  };
  transactions: Loan[];
}

export interface NewLoan {
  person_id: string;
  direction: 'i_lent' | 'i_borrowed';
  amount: number;
  description?: string;
  transaction_date: string;
  card_id?: string | null;
}

// ── Projections ─────────────────────────────────────────
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
export class SpendingService {
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
  getCards(): Observable<Card[]>           { return this.http.get<Card[]>(`${this.base}/cards`); }
  getBanks(): Observable<Bank[]>           { return this.http.get<Bank[]>(`${this.base}/cards/banks`); }
  createCard(body: Partial<Card> & { type: string }): Observable<Card> {
    return this.http.post<Card>(`${this.base}/cards`, body);
  }
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
  createExpense(body: NewExpense): Observable<any> {
    return this.http.post(`${this.base}/expenses`, body);
  }
  createPlace(body: Partial<Place>): Observable<Place> {
    return this.http.post<Place>(`${this.base}/places`, body);
  }
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
  getExpenseById(id: string): Observable<Expense> {
    return this.http.get<Expense>(`${this.base}/expenses/${id}`);
  }
  updateExpense(id: string, body: Partial<NewExpense>): Observable<Expense> {
    return this.http.put<Expense>(`${this.base}/expenses/${id}`, body);
  }
  deleteExpense(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/expenses/${id}`);
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
  uploadReceipt(expenseId: string, file: File): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post(`${this.base}/expenses/${expenseId}/receipt`, fd);
  }

  // ── Loans ──────────────────────────────────────────────
  getLoansSummary(): Observable<LoansSummary> {
    return this.http.get<LoansSummary>(`${this.base}/loans/summary`);
  }
  getLoanHistory(personId: string): Observable<LoanHistory> {
    return this.http.get<LoanHistory>(`${this.base}/loans/person/${personId}`);
  }
  getLoanById(id: string): Observable<Loan> {
    return this.http.get<Loan>(`${this.base}/loans/${id}`);
  }
  createLoan(body: NewLoan): Observable<Loan> {
    return this.http.post<Loan>(`${this.base}/loans`, body);
  }
  updateLoan(id: string, body: NewLoan): Observable<Loan> {
    return this.http.put<Loan>(`${this.base}/loans/${id}`, body);
  }
  deleteLoan(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/loans/${id}`);
  }

  // ── Projections ────────────────────────────────────────
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
