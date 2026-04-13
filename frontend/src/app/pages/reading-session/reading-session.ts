import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  ReadingService, Book, BookReadingStats, ReadingSession,
} from '../../services/reading.service';

@Component({
  selector: 'app-reading-session',
  imports: [RouterLink],
  templateUrl: './reading-session.html',
  styleUrl: './reading-session.scss',
})
export class ReadingSessionPage implements OnInit, OnDestroy {
  private svc    = inject(ReadingService);
  private router = inject(Router);

  // ── State ────────────────────────────────────────
  books    = signal<Book[]>([]);
  selected = signal<Book | null>(null);
  loading  = signal(true);

  stats        = signal<BookReadingStats | null>(null);
  recentSessions = signal<ReadingSession[]>([]);

  // Current page (editable independently of a session)
  pageInput = signal<number | null>(null);
  savingPage = signal(false);

  // Session state
  running    = signal(false);
  startTime  = signal<Date | null>(null);
  startPage  = signal<number | null>(null);
  endPage    = signal<number | null>(null);
  elapsed    = signal(0);        // seconds since start
  saving     = signal(false);
  error      = signal('');
  success    = signal('');

  // End-session modal
  showEndModal = signal(false);

  private tickHandle: any = null;

  ngOnInit() {
    this.svc.getBooks('reading').subscribe(books => {
      this.books.set(books);
      const first = books[0] ?? null;
      if (first) this.pickBook(first);
      else this.loading.set(false);
    });
  }

  ngOnDestroy() {
    if (this.tickHandle) clearInterval(this.tickHandle);
  }

  // ── Book selection ────────────────────────────────
  pickBook(book: Book) {
    if (this.running()) {
      if (!confirm('A session is running. Switch books and discard the current timer?')) return;
      this.discardSession();
    }
    this.selected.set(book);
    this.pageInput.set(book.current_page ?? 0);
    this.loading.set(true);
    forkJoin({
      stats:    this.svc.getBookReadingStats(book.id),
      sessions: this.svc.getBookSessions(book.id),
    }).subscribe(({ stats, sessions }) => {
      this.stats.set(stats);
      this.recentSessions.set(sessions);
      this.loading.set(false);
    });
  }

  // ── Page editing ──────────────────────────────────
  savePage() {
    const book = this.selected();
    const page = this.pageInput();
    if (!book || page == null || page < 0) return;
    if (page === book.current_page) return;
    this.savingPage.set(true);
    this.svc.updateBook(book.id, {
      title:        book.title,
      subtitle:     book.subtitle ?? undefined,
      publisher:    book.publisher ?? undefined,
      page_count:   book.page_count ?? null,
      current_page: page,
      cover_url:    book.cover_url ?? undefined,
      is_physical:  book.is_physical,
      status:       book.status,
      rating:       book.rating ?? null,
      summary:      book.summary ?? undefined,
      notes:        book.notes ?? undefined,
      format_id:    book.format_id ?? null,
      book_type_id: book.book_type_id ?? null,
      saga_id:      book.saga_id ?? null,
      saga_volume:  book.saga_volume ?? null,
      author_ids:   (book.authors ?? []).map(a => a.id),
      genre_ids:    (book.genres ?? []).map(g => g.id),
    }).subscribe({
      next: (updated) => {
        this.selected.set(updated);
        // also update the list so navigation keeps the current_page fresh
        this.books.update(list => list.map(b => b.id === updated.id ? updated : b));
        this.savingPage.set(false);
      },
      error: () => this.savingPage.set(false),
    });
  }

  // ── Timer ────────────────────────────────────────
  startSession() {
    const book = this.selected();
    if (!book) return;
    const startPg = this.pageInput() ?? book.current_page ?? 0;
    this.startPage.set(startPg);
    this.startTime.set(new Date());
    this.running.set(true);
    this.elapsed.set(0);
    this.error.set('');
    this.success.set('');
    this.tickHandle = setInterval(() => {
      const st = this.startTime();
      if (!st) return;
      this.elapsed.set(Math.floor((Date.now() - st.getTime()) / 1000));
    }, 1000);
  }

  openEndModal() {
    const book = this.selected();
    if (!book) return;
    this.endPage.set(this.startPage() ?? 0);
    this.showEndModal.set(true);
  }

  discardSession() {
    if (this.tickHandle) { clearInterval(this.tickHandle); this.tickHandle = null; }
    this.running.set(false);
    this.startTime.set(null);
    this.startPage.set(null);
    this.endPage.set(null);
    this.elapsed.set(0);
    this.showEndModal.set(false);
  }

  confirmEnd() {
    const book = this.selected();
    const st = this.startTime();
    const sp = this.startPage();
    const ep = this.endPage();
    if (!book || !st || sp == null || ep == null) return;
    if (ep < sp) {
      this.error.set('End page must be >= start page');
      return;
    }
    this.saving.set(true);
    this.svc.createSession({
      book_id:    book.id,
      started_at: st.toISOString(),
      ended_at:   new Date().toISOString(),
      start_page: sp,
      end_page:   ep,
    }).subscribe({
      next: () => {
        this.success.set(`Session saved — ${ep - sp} pages in ${this.formatElapsed(this.elapsed())}`);
        // Stop the timer, reset state, refresh stats
        if (this.tickHandle) { clearInterval(this.tickHandle); this.tickHandle = null; }
        this.running.set(false);
        this.showEndModal.set(false);
        this.saving.set(false);
        this.pageInput.set(ep);
        // Refresh book + stats + sessions
        forkJoin({
          stats:    this.svc.getBookReadingStats(book.id),
          sessions: this.svc.getBookSessions(book.id),
          book:     this.svc.getBookById(book.id),
        }).subscribe(({ stats, sessions, book: updated }) => {
          this.stats.set(stats);
          this.recentSessions.set(sessions);
          this.selected.set(updated);
          this.books.update(list => list.map(b => b.id === updated.id ? updated : b));
        });
      },
      error: (e) => {
        this.error.set(e?.error?.error || 'Failed to save session');
        this.saving.set(false);
      },
    });
  }

  // ── Computed helpers ──────────────────────────────
  elapsedLabel = computed(() => this.formatElapsed(this.elapsed()));

  progressPct = computed(() => {
    const b = this.selected();
    if (!b || !b.page_count) return 0;
    return Math.round(((b.current_page ?? 0) / b.page_count) * 100);
  });

  totalHours = computed(() => this.stats()?.total_hours ?? 0);

  formatElapsed(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
  }

  formatDuration(sec?: number): string {
    if (!sec) return '—';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h ? `${h}h ${m}m` : `${m}m`;
  }

  formatDate(d?: string | null): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatHoursLabel(h: number): string {
    if (h < 1) return `${Math.round(h * 60)}m`;
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
  }

  authorNames(book: Book): string {
    return book.authors?.length ? book.authors.map(a => a.name).join(', ') : '—';
  }
}
