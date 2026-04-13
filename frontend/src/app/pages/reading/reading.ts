import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  ReadingService, Book, BooksSummary, ReadingGoal, BookReadingStats,
} from '../../services/reading.service';

@Component({
  selector: 'app-reading',
  imports: [RouterLink],
  templateUrl: './reading.html',
  styleUrl: './reading.scss',
})
export class Reading implements OnInit {
  private svc = inject(ReadingService);

  reading   = signal<Book[]>([]);
  queued    = signal<Book[]>([]);
  completed = signal<Book[]>([]);
  summary   = signal<BooksSummary | null>(null);
  loading   = signal(true);

  // Carousel index for currently-reading books
  currentIdx = signal(0);

  // Cache of reading stats per currently-reading book
  statsByBook = signal<Record<string, BookReadingStats>>({});

  // Yearly goal — loaded from backend
  goal       = signal<ReadingGoal | null>(null);
  year       = new Date().getFullYear();
  editingGoal = signal(false);
  goalDraft  = signal(25);

  ngOnInit() {
    forkJoin({
      reading:   this.svc.getBooks('reading'),
      queued:    this.svc.getBooks('queued'),
      completed: this.svc.getBooks('completed'),
      summary:   this.svc.getBooksSummary(),
      goal:      this.svc.getGoal(this.year),
    }).subscribe(({ reading, queued, completed, summary, goal }) => {
      this.reading.set(reading);
      this.queued.set(queued);
      this.completed.set(completed);
      this.summary.set(summary);
      this.goal.set(goal);
      this.goalDraft.set(goal.goal);
      this.loading.set(false);
      // Load stats for each currently-reading book
      reading.forEach(b => this.loadBookStats(b.id));
    });
  }

  private loadBookStats(bookId: string) {
    this.svc.getBookReadingStats(bookId).subscribe(stats => {
      this.statsByBook.update(map => ({ ...map, [bookId]: stats }));
    });
  }

  // ── Currently reading carousel ───────────────────
  currentBook = computed(() => {
    const books = this.reading();
    const idx = this.currentIdx();
    return books[idx] ?? null;
  });

  hasMultipleReading = computed(() => this.reading().length > 1);

  prevBook() {
    const total = this.reading().length;
    if (!total) return;
    this.currentIdx.update(i => (i - 1 + total) % total);
  }
  nextBook() {
    const total = this.reading().length;
    if (!total) return;
    this.currentIdx.update(i => (i + 1) % total);
  }

  progressPct = computed(() => {
    const b = this.currentBook();
    if (!b || !b.page_count) return 0;
    return Math.round(((b.current_page ?? 0) / b.page_count) * 100);
  });

  // Hours spent reading this book so far (accumulated from sessions)
  hoursSpent = computed(() => {
    const b = this.currentBook();
    if (!b) return 0;
    return this.statsByBook()[b.id]?.total_hours ?? 0;
  });

  formatHoursSpent = computed(() => {
    const h = this.hoursSpent();
    if (h === 0) return '0m';
    if (h < 1) {
      const m = Math.round(h * 60);
      return `${m}m`;
    }
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
  });

  // ── Yearly goal ──────────────────────────────────
  goalPct = computed(() => {
    const done = this.summary()?.books_this_year ?? 0;
    const g = this.goal()?.goal ?? 25;
    return Math.min(100, Math.round((done / g) * 100));
  });

  booksAhead = computed(() => {
    const done = this.summary()?.books_this_year ?? 0;
    const g = this.goal()?.goal ?? 25;
    const month = new Date().getMonth() + 1;
    const expected = Math.round((month / 12) * g);
    return done - expected;
  });

  startEditGoal() {
    this.goalDraft.set(this.goal()?.goal ?? 25);
    this.editingGoal.set(true);
  }

  saveGoal() {
    const n = this.goalDraft();
    if (!n || n <= 0) { this.editingGoal.set(false); return; }
    this.svc.setGoal(this.year, n).subscribe(g => {
      this.goal.set(g);
      this.editingGoal.set(false);
    });
  }

  cancelEditGoal() {
    this.editingGoal.set(false);
  }

  // ── Helpers ──────────────────────────────────────
  authorNames(book: Book): string {
    if (!book.authors?.length) return '—';
    return book.authors.map(a => a.name).join(', ');
  }

  greetingTime(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 19) return 'Good afternoon';
    return 'Good evening';
  }
}
