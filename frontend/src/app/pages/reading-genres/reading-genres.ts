import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReadingService, Genre, Book } from '../../services/reading.service';

@Component({
  selector: 'app-reading-genres',
  imports: [RouterLink],
  templateUrl: './reading-genres.html',
  styleUrl: './reading-genres.scss',
})
export class ReadingGenresPage implements OnInit {
  private svc = inject(ReadingService);

  genres  = signal<Genre[]>([]);
  loading = signal(true);
  query   = signal('');

  // Inline create
  showNew   = signal(false);
  newName   = signal('');
  saving    = signal(false);

  // Inline edit
  editingId = signal<string | null>(null);
  editName  = signal('');

  // Detail drawer
  detailGenre   = signal<Genre | null>(null);
  detailBooks   = signal<Book[]>([]);
  detailLoading = signal(false);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getGenres().subscribe(rows => {
      this.genres.set(rows);
      this.loading.set(false);
    });
  }

  filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return this.genres();
    return this.genres().filter(g => g.name.toLowerCase().includes(q));
  });

  totalUsed = computed(() =>
    this.genres().filter(g => (g.book_count ?? 0) > 0).length
  );
  totalBooksTagged = computed(() =>
    this.genres().reduce((s, g) => s + (g.book_count ?? 0), 0)
  );

  // ── Create ───────────────────────────────────────
  openNew() {
    this.newName.set('');
    this.showNew.set(true);
  }
  cancelNew() {
    this.showNew.set(false);
    this.newName.set('');
  }
  create() {
    const n = this.newName().trim();
    if (!n) return;
    this.saving.set(true);
    this.svc.createGenre(n).subscribe({
      next: () => { this.saving.set(false); this.showNew.set(false); this.newName.set(''); this.load(); },
      error: () => this.saving.set(false),
    });
  }

  // ── Edit inline ──────────────────────────────────
  startEdit(g: Genre, ev: Event) {
    ev.stopPropagation();
    this.editingId.set(g.id);
    this.editName.set(g.name);
  }
  saveEdit(g: Genre) {
    const n = this.editName().trim();
    if (!n || n === g.name) { this.cancelEdit(); return; }
    this.svc.updateGenre(g.id, n).subscribe(() => {
      this.editingId.set(null);
      this.load();
    });
  }
  cancelEdit() { this.editingId.set(null); }

  // ── Delete ───────────────────────────────────────
  delete(g: Genre, ev: Event) {
    ev.stopPropagation();
    if (!confirm(`Delete "${g.name}"? ${g.book_count ? `This will remove the genre from ${g.book_count} book(s).` : ''}`)) return;
    this.svc.deleteGenre(g.id).subscribe(() => this.load());
  }

  // ── Detail drawer ────────────────────────────────
  openDetail(g: Genre) {
    if (this.editingId() === g.id) return;
    this.detailGenre.set(g);
    this.detailLoading.set(true);
    this.svc.getGenreBooks(g.id).subscribe(books => {
      this.detailBooks.set(books);
      this.detailLoading.set(false);
    });
  }
  closeDetail() {
    this.detailGenre.set(null);
    this.detailBooks.set([]);
  }

  // ── Helpers ──────────────────────────────────────
  authorNames(book: Book): string {
    return book.authors?.length ? book.authors.map(a => a.name).join(', ') : '—';
  }
}
