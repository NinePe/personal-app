import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReadingService, Saga, Book } from '../../services/reading.service';

@Component({
  selector: 'app-reading-sagas',
  imports: [RouterLink],
  templateUrl: './reading-sagas.html',
  styleUrl: './reading-sagas.scss',
})
export class ReadingSagasPage implements OnInit {
  private svc = inject(ReadingService);

  sagas   = signal<Saga[]>([]);
  loading = signal(true);
  query   = signal('');

  // Form modal
  showForm     = signal(false);
  editingId    = signal<string | null>(null);
  formName     = signal('');
  formDesc     = signal('');
  saving       = signal(false);

  // Detail drawer
  detailSaga    = signal<Saga | null>(null);
  detailBooks   = signal<Book[]>([]);
  detailLoading = signal(false);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getSagas().subscribe(rows => {
      this.sagas.set(rows);
      this.loading.set(false);
    });
  }

  filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return this.sagas();
    return this.sagas().filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.description ?? '').toLowerCase().includes(q)
    );
  });

  totalBooks = computed(() =>
    this.sagas().reduce((s, sg) => s + (sg.book_count ?? 0), 0)
  );

  // ── Form ─────────────────────────────────────────
  openNew() {
    this.editingId.set(null);
    this.formName.set('');
    this.formDesc.set('');
    this.showForm.set(true);
  }

  openEdit(s: Saga, ev: Event) {
    ev.stopPropagation();
    this.editingId.set(s.id);
    this.formName.set(s.name);
    this.formDesc.set(s.description ?? '');
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  save() {
    const name = this.formName().trim();
    if (!name) return;
    this.saving.set(true);
    const obs = this.editingId()
      ? this.svc.updateSaga(this.editingId()!, { name, description: this.formDesc() || undefined })
      : this.svc.createSaga(name, this.formDesc() || undefined);
    obs.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.load(); },
      error: () => this.saving.set(false),
    });
  }

  delete(s: Saga, ev: Event) {
    ev.stopPropagation();
    if (!confirm(`Delete saga "${s.name}"? The books will lose their saga link but remain in the library.`)) return;
    this.svc.deleteSaga(s.id).subscribe(() => this.load());
  }

  // ── Detail drawer ────────────────────────────────
  openDetail(s: Saga) {
    this.detailSaga.set(s);
    this.detailLoading.set(true);
    this.svc.getSagaBooks(s.id).subscribe(books => {
      this.detailBooks.set(books);
      this.detailLoading.set(false);
    });
  }

  closeDetail() {
    this.detailSaga.set(null);
    this.detailBooks.set([]);
  }

  // ── Helpers ──────────────────────────────────────
  authorNames(book: Book): string {
    return book.authors?.length ? book.authors.map(a => a.name).join(', ') : '—';
  }
}
