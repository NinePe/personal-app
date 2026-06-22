import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
  person: { id: string; name: string; relationship?: string; email?: string; phone?: string; avatar_url?: string; notes?: string; created_at?: string; };
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

@Injectable({ providedIn: 'root' })
export class LoansService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/spending`;

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
}
