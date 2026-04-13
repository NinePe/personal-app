import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Types ─────────────────────────────────────────────
export interface Author {
  id: string;
  name: string;
  gender?: 'female' | 'male' | 'non_binary' | 'trans' | 'other' | null;
  origin_place?: string | null;
  notes?: string | null;
  book_count?: number;
  created_at?: string;
}

export interface Genre     { id: string; name: string; book_count?: number; }
export interface Format    { id: string; name: string; sort_order: number; }
export interface BookType  { id: string; name: string; icon?: string; sort_order: number; }
export interface Saga      { id: string; name: string; description?: string | null; book_count?: number; }

export type BookStatus = 'reading' | 'queued' | 'completed' | 'paused' | 'dropped';

export interface Book {
  id: string;
  title: string;
  subtitle?: string | null;
  publisher?: string | null;
  page_count?: number | null;
  current_page?: number;
  cover_url?: string | null;
  is_physical: boolean;
  status: BookStatus;
  rating?: number | null;
  notes?: string | null;
  summary?: string | null;
  format_id?: string | null;
  book_type_id?: string | null;
  saga_id?: string | null;
  saga_volume?: number | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string;

  format?:    { id: string; name: string } | null;
  book_type?: { id: string; name: string; icon?: string } | null;
  saga?:      { id: string; name: string } | null;
  authors:    Author[];
  genres:     Genre[];
}

export interface BooksSummary {
  total_books: number;
  reading_count: number;
  queued_count: number;
  completed_count: number;
  pages_in_progress: number;
  pages_read: number;
  avg_rating: number;
  books_this_year: number;
}

export interface ReadingSession {
  id: string;
  book_id: string;
  started_at: string;
  ended_at: string;
  start_page: number;
  end_page: number;
  duration_seconds?: number;
  pages_read?: number;
  notes?: string | null;
  created_at?: string;
}

export interface BookReadingStats {
  total_seconds: number;
  total_minutes: number;
  total_hours: number;
  session_count: number;
  pages_read_sessions: number;
}

export interface ReadingGoal {
  year: number;
  goal: number;
  is_default?: boolean;
}

export interface NewBook {
  title: string;
  subtitle?: string;
  publisher?: string;
  page_count?: number | null;
  current_page?: number;
  cover_url?: string;
  is_physical?: boolean;
  status?: BookStatus;
  rating?: number | null;
  notes?: string;
  summary?: string;
  format_id?: string | null;
  book_type_id?: string | null;
  saga_id?: string | null;
  saga_volume?: number | null;
  started_at?: string | null;
  finished_at?: string | null;
  author_ids?: string[];
  genre_ids?: string[];
}

@Injectable({ providedIn: 'root' })
export class ReadingService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/reading`;

  // ── Authors ─────────────────────────────────────────
  getAuthors(q?: string): Observable<Author[]> {
    let p = new HttpParams();
    if (q) p = p.set('q', q);
    return this.http.get<Author[]>(`${this.base}/authors`, { params: p });
  }
  getAuthorBooks(id: string): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.base}/authors/${id}/books`);
  }
  createAuthor(body: Partial<Author>): Observable<Author> {
    return this.http.post<Author>(`${this.base}/authors`, body);
  }
  updateAuthor(id: string, body: Partial<Author>): Observable<Author> {
    return this.http.put<Author>(`${this.base}/authors/${id}`, body);
  }
  deleteAuthor(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/authors/${id}`);
  }

  // ── Genres ──────────────────────────────────────────
  getGenres(): Observable<Genre[]> {
    return this.http.get<Genre[]>(`${this.base}/genres`);
  }
  getGenreBooks(id: string): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.base}/genres/${id}/books`);
  }
  createGenre(name: string): Observable<Genre> {
    return this.http.post<Genre>(`${this.base}/genres`, { name });
  }
  updateGenre(id: string, name: string): Observable<Genre> {
    return this.http.put<Genre>(`${this.base}/genres/${id}`, { name });
  }
  deleteGenre(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/genres/${id}`);
  }

  // ── Formats + Book types (read-only) ───────────────
  getFormats():   Observable<Format[]>   { return this.http.get<Format[]>  (`${this.base}/formats`); }
  getBookTypes(): Observable<BookType[]> { return this.http.get<BookType[]>(`${this.base}/book-types`); }

  // ── Sagas ───────────────────────────────────────────
  getSagas(q?: string): Observable<Saga[]> {
    let p = new HttpParams();
    if (q) p = p.set('q', q);
    return this.http.get<Saga[]>(`${this.base}/sagas`, { params: p });
  }
  getSagaBooks(id: string): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.base}/sagas/${id}/books`);
  }
  createSaga(name: string, description?: string): Observable<Saga> {
    return this.http.post<Saga>(`${this.base}/sagas`, { name, description });
  }
  updateSaga(id: string, body: { name: string; description?: string }): Observable<Saga> {
    return this.http.put<Saga>(`${this.base}/sagas/${id}`, body);
  }
  deleteSaga(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/sagas/${id}`);
  }

  // ── Books ───────────────────────────────────────────
  getBooks(status?: BookStatus): Observable<Book[]> {
    let p = new HttpParams();
    if (status) p = p.set('status', status);
    return this.http.get<Book[]>(`${this.base}/books`, { params: p });
  }
  getBooksSummary(): Observable<BooksSummary> {
    return this.http.get<BooksSummary>(`${this.base}/books/summary`);
  }
  getBookById(id: string): Observable<Book> {
    return this.http.get<Book>(`${this.base}/books/${id}`);
  }
  createBook(body: NewBook): Observable<Book> {
    return this.http.post<Book>(`${this.base}/books`, body);
  }
  updateBook(id: string, body: NewBook): Observable<Book> {
    return this.http.put<Book>(`${this.base}/books/${id}`, body);
  }
  rateBook(id: string, rating: number | null): Observable<{ id: string; rating: number }> {
    return this.http.patch<{ id: string; rating: number }>(`${this.base}/books/${id}/rating`, { rating });
  }
  patchBook(id: string, fields: Partial<{ finished_at: string; started_at: string; current_page: number; status: string; rating: number; page_count: number }>): Observable<Book> {
    return this.http.patch<Book>(`${this.base}/books/${id}`, fields);
  }
  deleteBook(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/books/${id}`);
  }

  // ── Reading stats for a book ────────────────────
  getBookReadingStats(bookId: string): Observable<BookReadingStats> {
    return this.http.get<BookReadingStats>(`${this.base}/books/${bookId}/reading-stats`);
  }
  getBookSessions(bookId: string): Observable<ReadingSession[]> {
    return this.http.get<ReadingSession[]>(`${this.base}/books/${bookId}/sessions`);
  }

  // ── Sessions ─────────────────────────────────────
  createSession(body: {
    book_id: string;
    started_at: string;
    ended_at: string;
    start_page: number;
    end_page: number;
    notes?: string;
  }): Observable<ReadingSession> {
    return this.http.post<ReadingSession>(`${this.base}/sessions`, body);
  }
  deleteSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/sessions/${id}`);
  }

  // ── Yearly goal ──────────────────────────────────
  getGoal(year: number): Observable<ReadingGoal> {
    return this.http.get<ReadingGoal>(`${this.base}/goals/${year}`);
  }
  setGoal(year: number, goal: number): Observable<ReadingGoal> {
    return this.http.put<ReadingGoal>(`${this.base}/goals/${year}`, { goal });
  }
}
