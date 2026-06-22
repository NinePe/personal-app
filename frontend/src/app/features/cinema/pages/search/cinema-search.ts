import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs';
import { CinemaService, TmdbResult } from '@app/services/cinema.service';

@Component({
  selector: 'app-cinema-search',
  imports: [RouterLink, FormsModule],
  templateUrl: './cinema-search.html',
  styleUrl: './cinema-search.scss',
})
export class CinemaSearch implements OnInit, OnDestroy {
  private svc = inject(CinemaService);

  query = signal('');
  querySub = new Subject<string>();
  results = signal<TmdbResult[]>([]);
  searching = signal(false);
  filterType = signal<'all' | 'movie' | 'tv'>('all');
  hasSearched = signal(false);
  private sub?: Subscription;

  // Add dialog state
  showAddDialog = signal(false);
  addLoading = signal(false);
  addError = signal('');
  selectedResult = signal<TmdbResult | null>(null);
  addStatus = signal<'watchlist' | 'watching' | 'watched'>('watchlist');
  addRating = signal(0);
  hoverRating = signal(0);

  ngOnInit() {
    this.sub = this.querySub.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter(q => q.length >= 2),
      switchMap(q => {
        this.searching.set(true);
        return this.svc.search(q);
      }),
    ).subscribe(r => {
      this.results.set(r);
      this.searching.set(false);
      this.hasSearched.set(true);
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  onInput(value: string) {
    this.query.set(value);
    this.querySub.next(value);
  }

  clearSearch() {
    this.query.set('');
    this.results.set([]);
    this.hasSearched.set(false);
    this.filterType.set('all');
  }

  filteredResults() {
    const t = this.filterType();
    if (t === 'all') return this.results();
    return this.results().filter(r => r.media_type === t);
  }

  openAddDialog(result: TmdbResult) {
    this.selectedResult.set(result);
    this.addStatus.set('watchlist');
    this.addRating.set(0);
    this.addError.set('');
    this.showAddDialog.set(true);
  }

  closeAddDialog() {
    this.showAddDialog.set(false);
    this.selectedResult.set(null);
  }

  setAddStatus(s: string) {
    this.addStatus.set(s as any);
  }

  confirmAdd() {
    const r = this.selectedResult();
    if (!r) return;
    this.addLoading.set(true);
    this.addError.set('');
    this.svc.createItem({
      tmdb_id: r.id,
      media_type: r.media_type,
      status: this.addStatus(),
      rating: this.addRating() || undefined,
    }).subscribe({
      next: () => {
        this.addLoading.set(false);
        this.closeAddDialog();
      },
      error: (err) => {
        this.addLoading.set(false);
        if (err.status === 409) {
          this.addError.set('Ya está en tu biblioteca');
        } else {
          this.addError.set(err.error?.error || 'Error al agregar');
        }
      },
    });
  }

  setRating(r: number) { this.addRating.set(r); }

  posterUrl(path: string | undefined): string {
    return path ? `https://image.tmdb.org/t/p/w342${path}` : '';
  }

  year(date: string | undefined): string {
    if (!date) return '';
    return date.substring(0, 4);
  }
}
