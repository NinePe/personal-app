import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReadingService, Author, Book } from '../../services/reading.service';

type Gender = Author['gender'];

@Component({
  selector: 'app-reading-authors',
  imports: [RouterLink],
  templateUrl: './reading-authors.html',
  styleUrl: './reading-authors.scss',
})
export class ReadingAuthorsPage implements OnInit {
  private svc = inject(ReadingService);

  authors = signal<Author[]>([]);
  loading = signal(true);
  query   = signal('');

  // Form modal
  showForm = signal(false);
  editingId = signal<string | null>(null);
  formName   = signal('');
  formGender = signal<Gender>(null);
  formOrigin = signal('');
  formNotes  = signal('');
  saving = signal(false);

  // Detail drawer
  detailAuthor = signal<Author | null>(null);
  detailBooks  = signal<Book[]>([]);
  detailLoading = signal(false);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAuthors().subscribe(rows => {
      this.authors.set(rows);
      this.loading.set(false);
    });
  }

  filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return this.authors();
    return this.authors().filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.origin_place ?? '').toLowerCase().includes(q)
    );
  });

  totalBooks = computed(() =>
    this.authors().reduce((s, a) => s + (a.book_count ?? 0), 0)
  );

  // ── Form ─────────────────────────────────────────
  openNew() {
    this.editingId.set(null);
    this.formName.set('');
    this.formGender.set(null);
    this.formOrigin.set('');
    this.formNotes.set('');
    this.showForm.set(true);
  }

  openEdit(a: Author, ev: Event) {
    ev.stopPropagation();
    this.editingId.set(a.id);
    this.formName.set(a.name);
    this.formGender.set(a.gender ?? null);
    this.formOrigin.set(a.origin_place ?? '');
    this.formNotes.set(a.notes ?? '');
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); }

  save() {
    const name = this.formName().trim();
    if (!name) return;
    this.saving.set(true);
    const body: Partial<Author> = {
      name,
      gender: this.formGender() ?? null,
      origin_place: this.formOrigin() || null,
      notes: this.formNotes() || null,
    };
    const obs = this.editingId()
      ? this.svc.updateAuthor(this.editingId()!, body)
      : this.svc.createAuthor(body);
    obs.subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.load(); },
      error: () => this.saving.set(false),
    });
  }

  delete(a: Author, ev: Event) {
    ev.stopPropagation();
    if (!confirm(`Delete "${a.name}"? Books attributed to them will keep existing.`)) return;
    this.svc.deleteAuthor(a.id).subscribe(() => this.load());
  }

  // ── Detail drawer ────────────────────────────────
  openDetail(a: Author) {
    this.detailAuthor.set(a);
    this.detailLoading.set(true);
    this.svc.getAuthorBooks(a.id).subscribe(books => {
      this.detailBooks.set(books);
      this.detailLoading.set(false);
    });
  }

  closeDetail() {
    this.detailAuthor.set(null);
    this.detailBooks.set([]);
  }

  // ── Helpers ──────────────────────────────────────
  initial(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  genderLabel(g?: Gender): string {
    if (!g) return '';
    return { female: 'Female', male: 'Male', non_binary: 'Non-binary', trans: 'Trans', other: 'Other' }[g];
  }

  genderColor(g?: Gender): string {
    if (!g) return '#d4c3be';
    return {
      female: '#e8a5b5', male: '#a5c2e8', non_binary: '#c7a5e8',
      trans: '#a5e8c2', other: '#e2c19b',
    }[g];
  }
}
