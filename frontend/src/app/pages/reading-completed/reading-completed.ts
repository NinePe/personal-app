import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReadingService, Book } from '../../services/reading.service';
import { StarRating } from '../../components/star-rating/star-rating';

type SortKey = 'finished' | 'rating' | 'title';

@Component({
  selector: 'app-reading-completed',
  imports: [RouterLink, StarRating],
  templateUrl: './reading-completed.html',
  styleUrl: './reading-completed.scss',
})
export class ReadingCompletedPage implements OnInit {
  private svc    = inject(ReadingService);
  private router = inject(Router);

  books   = signal<Book[]>([]);
  loading = signal(true);
  query   = signal('');
  sortBy  = signal<SortKey>('finished');

  ngOnInit() {
    this.svc.getBooks('completed').subscribe(b => {
      this.books.set(b);
      this.loading.set(false);
    });
  }

  filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    let list = this.books();
    if (q) {
      list = list.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.authors?.some(a => a.name.toLowerCase().includes(q))
      );
    }
    const key = this.sortBy();
    return [...list].sort((a, b) => {
      if (key === 'rating')   return (+b.rating! || 0) - (+a.rating! || 0);
      if (key === 'title')    return a.title.localeCompare(b.title);
      // 'finished' — most recent first
      return (b.finished_at ?? '').localeCompare(a.finished_at ?? '');
    });
  });

  avgRating = computed(() => {
    const rated = this.books().filter(b => b.rating && +b.rating > 0);
    if (!rated.length) return 0;
    return +(rated.reduce((s, b) => s + (+b.rating!), 0) / rated.length).toFixed(1);
  });

  totalPages = computed(() =>
    this.books().reduce((s, b) => s + (b.page_count ?? 0), 0)
  );

  // ── Rating update ─────────────────────────────────
  rateBook(book: Book, rating: number) {
    // Optimistic update
    this.books.update(list => list.map(b =>
      b.id === book.id ? { ...b, rating } : b
    ));
    this.svc.rateBook(book.id, rating).subscribe();
  }

  openBook(book: Book) {
    this.router.navigate(['/reading/new-book', book.id]);
  }

  // ── Finished date update ────────────────────────────
  updateFinished(book: Book, dateStr: string) {
    if (!dateStr) return;
    this.books.update(list => list.map(b =>
      b.id === book.id ? { ...b, finished_at: dateStr } : b
    ));
    this.svc.patchBook(book.id, { finished_at: dateStr }).subscribe();
  }

  // ── Helpers ───────────────────────────────────────
  authorNames(book: Book): string {
    return book.authors?.length ? book.authors.map(a => a.name).join(', ') : '—';
  }

  fmtDate(d?: string | null): string {
    if (!d) return '—';
    const str = String(d).substring(0, 10);
    return new Date(str + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  toDateInput(d?: string | null): string {
    if (!d) return '';
    return String(d).substring(0, 10);
  }
}
