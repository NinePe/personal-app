import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface CinemaItem {
  id: string; tmdb_id: number; media_type: string;
  title: string; original_title?: string; overview?: string;
  poster_path?: string; backdrop_path?: string;
  release_date?: string; first_air_date?: string;
  status: string; rating?: number; comments?: string;
  country?: string; language?: string;
  runtime?: number; number_of_seasons?: number; number_of_episodes?: number;
  genres?: { id: number; name: string }[];
  directors?: { id: number; name: string; photo_path?: string }[];
  seasons?: CinemaSeason[];
  created_at: string; updated_at: string;
}

export interface CinemaSeason {
  id: string; season_number: number; name?: string;
  overview?: string; poster_path?: string;
  episode_count: number; watched_episodes: number;
  episodes?: CinemaEpisode[];
}

export interface CinemaEpisode {
  id: string; episode_number: number; name?: string;
  overview?: string; still_path?: string;
  runtime?: number; air_date?: string;
  watched: boolean; watched_at?: string; rating?: number; comments?: string;
}

export interface TmdbResult {
  id: number; media_type: string; title: string;
  original_title?: string; overview?: string;
  poster_path?: string; backdrop_path?: string;
  release_date?: string; vote_average?: number;
  genre_ids: number[]; origin_country?: string[];
}

export interface CinemaStats {
  totals: { total_items: number; watched_items: number; watching_items: number; watchlist_items: number; movies: number; series: number; total_minutes: number; total_episodes: number; watched_episodes: number };
  byGenre: { id: number; name: string; count: number }[];
  byDirector: { id: number; name: string; photo_path?: string; count: number }[];
  byType: { media_type: string; count: number }[];
  recentWatched: { id: string; title: string; poster_path?: string; media_type: string }[];
}

@Injectable({ providedIn: 'root' })
export class CinemaService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/cinema`;

  search(q: string, type = 'multi') { return this.http.get<TmdbResult[]>(`${this.api}/search?q=${encodeURIComponent(q)}&type=${type}`); }
  getTmdbDetail(type: string, id: number) { return this.http.get<any>(`${this.api}/tmdb/${type}/${id}`); }
  getItems(status?: string, type?: string) { let p = ''; if (status) p += `status=${status}&`; if (type) p += `type=${type}`; return this.http.get<CinemaItem[]>(`${this.api}/items?${p}`); }
  getItem(id: string) { return this.http.get<CinemaItem>(`${this.api}/items/${id}`); }
  createItem(body: any) { return this.http.post<CinemaItem>(`${this.api}/items`, body); }
  updateItem(id: string, body: any) { return this.http.patch<CinemaItem>(`${this.api}/items/${id}`, body); }
  deleteItem(id: string) { return this.http.delete(`${this.api}/items/${id}`); }
  toggleEpisode(id: string, watched: boolean) { return this.http.patch(`${this.api}/episodes/${id}`, { watched }); }
  rateEpisode(id: string, data: { rating?: number; comments?: string }) { return this.http.patch(`${this.api}/episodes/${id}`, data); }
  setEpisodeDate(id: string, watched_at: string) { return this.http.patch(`${this.api}/episodes/${id}/date`, { watched_at }); }
  watchAllSeason(id: string) { return this.http.patch(`${this.api}/seasons/${id}/watch-all`, {}); }
  getStats() { return this.http.get<CinemaStats>(`${this.api}/stats`); }
  getSuggestions(refresh = false) { const p = refresh ? '?refresh=true' : ''; return this.http.post<{ suggestions: { title: string; reason: string; media_type: string; genre: string }[] }>(`${this.api}/suggestions${p}`, {}); }
  getHistory(page = 1, limit = 5, period = 'all') { return this.http.get<WatchHistory>(`${this.api}/history?page=${page}&limit=${limit}&period=${period}`); }
}

// History
export interface DailyBar { day: string; total_minutes: number; episodes: number; movies: number; }
export interface WatchHistoryItem { id: string; title: string; poster_path?: string; media_type: string; runtime?: number; watched_at: string; season_number?: number; episode_number?: number; rating?: number; }
export interface WatchHistory { daily: DailyBar[]; history: WatchHistoryItem[]; total: number; page: number; limit: number; }
