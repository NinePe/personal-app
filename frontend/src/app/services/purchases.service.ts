import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/purchases`;

export interface PurchaseCategory {
  id: string; name: string; icon: string; color: string;
  sort_order: number; subcategory_count: number;
}

export interface PurchaseSubcategory {
  id: string; category_id: string; name: string; icon?: string;
  category_name: string; category_color: string;
}

export interface PurchaseItem {
  id: string; subcategory_id: string; name: string; brand?: string;
  size_label?: string; quantity: number; unit: string;
  unit_size?: number; price: number; currency: string;
  store?: string; purchase_date: string; finished_date?: string;
  rating?: number; notes?: string; receipt_url?: string;
  // Computed
  subcategory_name: string; category_name: string;
  category_color: string; category_icon: string;
  duration_days?: number; cost_per_day?: number; cost_per_month?: number;
  // Detail only
  history?: PurchaseHistoryItem[];
}

export interface PurchaseHistoryItem {
  id: string; brand?: string; size_label?: string; price: number;
  purchase_date: string; finished_date?: string; duration_days?: number; rating?: number;
}

export interface PurchaseStats {
  totals: { total_items: number; active_items: number; finished_items: number; active_value: number; spent_this_month: number; spent_last_month: number };
  byCategory: Array<{ id: string; name: string; color: string; icon: string; count: number; total_spent: number; avg_duration_days: number }>;
  bySubcategory: Array<{ id: string; name: string; category_name: string; color: string; count: number; total_spent: number; avg_duration_days: number }>;
  monthly: Array<{ month: string; count: number; total: number }>;
  topItems: Array<{ name: string; brand?: string; subcategory_name: string; times_purchased: number; avg_price: number; avg_days: number }>;
}

export interface PredictionGroup {
  type: 'running_out' | 'restock' | 'price_trends' | 'best_value';
  label: string;
  items: any[];
}

export interface SubcategoryCompare {
  items: PurchaseItem[];
  stats: { times_purchased: number; avg_price: number; avg_days: number; avg_cost_per_day: number; avg_cost_per_month: number; min_price: number; max_price: number };
  current: PurchaseItem | null;
}

@Injectable({ providedIn: 'root' })
export class PurchasesService {
  private http = inject(HttpClient);

  // Categories
  getCategories(): Observable<PurchaseCategory[]> { return this.http.get<PurchaseCategory[]>(`${API}/categories`); }
  createCategory(data: any): Observable<PurchaseCategory> { return this.http.post<PurchaseCategory>(`${API}/categories`, data); }
  deleteCategory(id: string): Observable<any> { return this.http.delete(`${API}/categories/${id}`); }

  // Subcategories
  getSubcategories(categoryId?: string): Observable<PurchaseSubcategory[]> {
    const params = categoryId ? `?category_id=${categoryId}` : '';
    return this.http.get<PurchaseSubcategory[]>(`${API}/subcategories${params}`);
  }
  createSubcategory(data: any): Observable<PurchaseSubcategory> { return this.http.post<PurchaseSubcategory>(`${API}/subcategories`, data); }

  // Items
  getItems(params?: any): Observable<PurchaseItem[]> { return this.http.get<PurchaseItem[]>(`${API}/items`, { params }); }
  getItem(id: string): Observable<PurchaseItem & { history: PurchaseHistoryItem[] }> { return this.http.get<any>(`${API}/items/${id}`); }
  createItem(data: any): Observable<PurchaseItem> { return this.http.post<PurchaseItem>(`${API}/items`, data); }
  updateItem(id: string, data: any): Observable<PurchaseItem> { return this.http.patch<PurchaseItem>(`${API}/items/${id}`, data); }
  deleteItem(id: string): Observable<any> { return this.http.delete(`${API}/items/${id}`); }

  // Stats & Predictions
  getStats(): Observable<PurchaseStats> { return this.http.get<PurchaseStats>(`${API}/stats`); }
  getPredictions(): Observable<PredictionGroup[]> { return this.http.get<PredictionGroup[]>(`${API}/predictions`); }
  compareSubcategory(subId: string): Observable<SubcategoryCompare> { return this.http.get<SubcategoryCompare>(`${API}/compare/${subId}`); }
}
