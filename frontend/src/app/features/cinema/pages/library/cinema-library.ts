import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CinemaService, CinemaItem } from '@app/services/cinema.service';

@Component({
  selector: 'app-cinema-library',
  imports: [RouterLink],
  templateUrl: './cinema-library.html',
  styleUrl: './cinema-library.scss',
})
export class CinemaLibrary implements OnInit {
  private svc = inject(CinemaService);

  items = signal<CinemaItem[]>([]);
  loading = signal(true);
  statusFilter = signal<'all' | 'watchlist' | 'watching' | 'watched'>('all');
  typeFilter = signal<'all' | 'movie' | 'tv'>('all');

  ngOnInit() {
    this.loadItems();
  }

  private loadItems() {
    this.loading.set(true);
    const status = this.statusFilter() !== 'all' ? this.statusFilter() : undefined;
    const type = this.typeFilter() !== 'all' ? this.typeFilter() : undefined;
    this.svc.getItems(status, type).subscribe(items => {
      this.items.set(items);
      this.loading.set(false);
    });
  }

  onStatusFilter(s: 'all' | 'watchlist' | 'watching' | 'watched') {
    this.statusFilter.set(s);
    this.loadItems();
  }

  onTypeFilter(t: 'all' | 'movie' | 'tv') {
    this.typeFilter.set(t);
    this.loadItems();
  }

  filteredByType() {
    const t = this.typeFilter();
    if (t === 'all') return this.items();
    return this.items().filter(i => i.media_type === t);
  }

  statusCount(status: string) {
    return this.items().filter(i => i.status === status).length;
  }

  posterUrl(path: string | undefined): string {
    return path ? `https://image.tmdb.org/t/p/w342${path}` : '';
  }

  formatRuntime(minutes: number | undefined): string {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  }

  starsArray(rating: number | undefined): number[] {
    const r = rating ?? 0;
    return [1, 2, 3, 4, 5].map(i => (i <= r ? 1 : i - 0.5 <= r ? 0.5 : 0));
  }

  isHalfStar(v: number): boolean { return v === 0.5; }
  isFullStar(v: number): boolean { return v === 1; }
}
