import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AppModule {
  id: string;
  name: string;
  icon: string;
  route: string;
  status: string;
  color: string;
}

@Injectable({ providedIn: 'root' })
export class ModulesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private fallbackModules: AppModule[] = [
    { id: 'reading', name: 'Reading Journey', icon: 'book', route: '/reading', status: '3 books in progress', color: 'rose' },
    { id: 'cinema', name: 'Cinema & TV', icon: 'film', route: '/cinema', status: '4 series watched', color: 'green' },
    { id: 'spending', name: 'Spending Tracker', icon: 'wallet', route: '/spending', status: 'Portfolio up 2.4%', color: 'purple' },
    { id: 'growth', name: 'Personal Growth', icon: 'chart', route: '/growth', status: 'Daily goals 80%', color: 'blue' },
    { id: 'mindfulness', name: 'Mindfulness', icon: 'leaf', route: '/mindfulness', status: '15 min streak', color: 'teal' },
  ];

  getModules(): Observable<{ modules: AppModule[] }> {
    return this.http.get<{ modules: AppModule[] }>(`${this.apiUrl}/modules`).pipe(
      catchError(() => of({ modules: this.fallbackModules }))
    );
  }
}
