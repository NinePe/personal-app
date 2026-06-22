import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Person {
  id: string; name: string;
  relationship: 'friend' | 'family' | 'coworker' | 'organization' | 'other';
  email?: string; phone?: string; avatar_url?: string;
  notes?: string; created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class PeopleService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/spending`;

  getPeople(): Observable<Person[]>        { return this.http.get<Person[]>(`${this.base}/people`); }
  createPerson(body: Partial<Person>): Observable<Person> {
    return this.http.post<Person>(`${this.base}/people`, body);
  }
  updatePerson(id: string, body: Partial<Person>): Observable<Person> {
    return this.http.put<Person>(`${this.base}/people/${id}`, body);
  }
  deletePerson(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/people/${id}`);
  }
}
