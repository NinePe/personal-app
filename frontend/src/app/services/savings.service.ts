import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
export class SavingsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/spending`;

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
