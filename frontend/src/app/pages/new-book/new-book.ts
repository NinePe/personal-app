import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  ReadingService, Author, Genre, Format, BookType, Saga, NewBook, BookStatus,
} from '../../services/reading.service';
import { StarRating } from '../../components/star-rating/star-rating';

type ModalKind = 'author' | 'saga' | null;

@Component({
  selector: 'app-new-book',
  imports: [RouterLink, StarRating],
  templateUrl: './new-book.html',
  styleUrl: './new-book.scss',
})
export class NewBookPage implements OnInit {
  private svc    = inject(ReadingService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  // ── Form state ────────────────────────────────────
  title        = signal('');
  subtitle     = signal('');
  publisher    = signal('');
  pageCount    = signal<number | null>(null);
  currentPage  = signal<number | null>(null);
  coverUrl     = signal('');
  isPhysical   = signal(false);
  status       = signal<BookStatus>('queued');
  rating       = signal<number | null>(null);
  summary      = signal('');
  notes        = signal('');

  formatId     = signal<string | null>(null);
  bookTypeId   = signal<string | null>(null);
  sagaId       = signal<string | null>(null);
  sagaVolume   = signal<number | null>(null);
  isSaga       = signal(false);

  selectedAuthors = signal<Author[]>([]);
  selectedGenres  = signal<Genre[]>([]);

  // ── Masters ───────────────────────────────────────
  authors   = signal<Author[]>([]);
  genres    = signal<Genre[]>([]);
  formats   = signal<Format[]>([]);
  bookTypes = signal<BookType[]>([]);
  sagas     = signal<Saga[]>([]);

  // ── UI state ──────────────────────────────────────
  loading = signal(true);
  saving  = signal(false);
  error   = signal('');
  openModal = signal<ModalKind>(null);
  modalQuery = signal('');
  editId = signal<string | null>(null);
  isEdit = computed(() => !!this.editId());

  // Inline create form for authors inside the modal
  newAuthorName   = signal('');
  newAuthorGender = signal<Author['gender']>(null);
  newAuthorOrigin = signal('');
  showAuthorForm  = signal(false);

  // Inline saga create
  newSagaName = signal('');
  showSagaForm = signal(false);

  // Genre add inline
  newGenreName = signal('');
  showGenreForm = signal(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    forkJoin({
      authors:   this.svc.getAuthors(),
      genres:    this.svc.getGenres(),
      formats:   this.svc.getFormats(),
      bookTypes: this.svc.getBookTypes(),
      sagas:     this.svc.getSagas(),
    }).subscribe(data => {
      this.authors.set(data.authors);
      this.genres.set(data.genres);
      this.formats.set(data.formats);
      this.bookTypes.set(data.bookTypes);
      this.sagas.set(data.sagas);

      if (id) {
        this.editId.set(id);
        this.svc.getBookById(id).subscribe(b => {
          this.title.set(b.title);
          this.subtitle.set(b.subtitle ?? '');
          this.publisher.set(b.publisher ?? '');
          this.pageCount.set(b.page_count ?? null);
          this.currentPage.set(b.current_page ?? null);
          this.coverUrl.set(b.cover_url ?? '');
          this.isPhysical.set(b.is_physical);
          this.status.set(b.status);
          this.rating.set(b.rating ?? null);
          this.summary.set(b.summary ?? '');
          this.notes.set(b.notes ?? '');
          this.formatId.set(b.format_id ?? null);
          this.bookTypeId.set(b.book_type_id ?? null);
          this.sagaId.set(b.saga_id ?? null);
          this.sagaVolume.set(b.saga_volume ?? null);
          this.isSaga.set(!!b.saga_id);
          this.selectedAuthors.set(b.authors ?? []);
          this.selectedGenres.set(b.genres ?? []);
          this.loading.set(false);
        });
      } else {
        this.loading.set(false);
      }
    });
  }

  // ── Computed ──────────────────────────────────────
  filteredAuthors = computed(() => {
    const q = this.modalQuery().toLowerCase().trim();
    if (!q) return this.authors();
    return this.authors().filter(a => a.name.toLowerCase().includes(q));
  });

  filteredSagas = computed(() => {
    const q = this.modalQuery().toLowerCase().trim();
    if (!q) return this.sagas();
    return this.sagas().filter(s => s.name.toLowerCase().includes(q));
  });

  filteredGenres = computed(() => {
    const q = this.newGenreName().toLowerCase().trim();
    const selected = new Set(this.selectedGenres().map(g => g.id));
    const available = this.genres().filter(g => !selected.has(g.id));
    if (!q) return available;
    return available.filter(g => g.name.toLowerCase().includes(q));
  });

  currentSaga = computed(() =>
    this.sagas().find(s => s.id === this.sagaId()) ?? null
  );

  canSave = computed(() => this.title().trim().length > 0);

  // ── Author modal actions ──────────────────────────
  openAuthorModal() {
    this.openModal.set('author');
    this.modalQuery.set('');
    this.showAuthorForm.set(false);
  }

  toggleAuthor(author: Author) {
    const selected = this.selectedAuthors();
    const idx = selected.findIndex(a => a.id === author.id);
    if (idx >= 0) {
      this.selectedAuthors.set(selected.filter((_, i) => i !== idx));
    } else {
      this.selectedAuthors.set([...selected, author]);
    }
  }

  isAuthorSelected(a: Author): boolean {
    return this.selectedAuthors().some(s => s.id === a.id);
  }

  saveNewAuthor() {
    const name = this.newAuthorName().trim();
    if (!name) return;
    this.svc.createAuthor({
      name,
      gender: this.newAuthorGender() ?? null,
      origin_place: this.newAuthorOrigin() || null,
    }).subscribe(a => {
      this.authors.update(list => [...list, a]);
      this.selectedAuthors.update(list => [...list, a]);
      this.newAuthorName.set('');
      this.newAuthorGender.set(null);
      this.newAuthorOrigin.set('');
      this.showAuthorForm.set(false);
    });
  }

  // ── Saga modal actions ────────────────────────────
  openSagaModal() {
    this.openModal.set('saga');
    this.modalQuery.set('');
    this.showSagaForm.set(false);
  }

  pickSaga(saga: Saga) {
    this.sagaId.set(saga.id);
    this.openModal.set(null);
  }

  saveNewSaga() {
    const name = this.newSagaName().trim() || this.modalQuery().trim();
    if (!name) return;
    this.svc.createSaga(name).subscribe(s => {
      this.sagas.update(list => [...list, s]);
      this.sagaId.set(s.id);
      this.newSagaName.set('');
      this.showSagaForm.set(false);
      this.openModal.set(null);
    });
  }

  clearSaga() {
    this.sagaId.set(null);
    this.sagaVolume.set(null);
  }

  // ── Genre actions ─────────────────────────────────
  toggleGenre(g: Genre) {
    const selected = this.selectedGenres();
    const exists = selected.some(s => s.id === g.id);
    if (exists) {
      this.selectedGenres.set(selected.filter(s => s.id !== g.id));
    } else {
      this.selectedGenres.set([...selected, g]);
    }
  }

  removeGenre(g: Genre) {
    this.selectedGenres.update(list => list.filter(s => s.id !== g.id));
  }

  createAndAddGenre() {
    const name = this.newGenreName().trim();
    if (!name) return;
    // If it matches an existing genre, just toggle it
    const existing = this.genres().find(g => g.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!this.selectedGenres().some(s => s.id === existing.id)) {
        this.selectedGenres.update(list => [...list, existing]);
      }
      this.newGenreName.set('');
      return;
    }
    this.svc.createGenre(name).subscribe(g => {
      this.genres.update(list => [...list, g]);
      this.selectedGenres.update(list => [...list, g]);
      this.newGenreName.set('');
      this.showGenreForm.set(false);
    });
  }

  // ── Save book ─────────────────────────────────────
  save() {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.error.set('');

    const body: NewBook = {
      title:        this.title().trim(),
      subtitle:     this.subtitle() || undefined,
      publisher:    this.publisher() || undefined,
      page_count:   this.pageCount(),
      current_page: this.currentPage() ?? 0,
      cover_url:    this.coverUrl() || undefined,
      is_physical:  this.isPhysical(),
      status:       this.status(),
      rating:       this.rating(),
      summary:      this.summary() || undefined,
      notes:        this.notes() || undefined,
      format_id:    this.formatId(),
      book_type_id: this.bookTypeId(),
      saga_id:      this.isSaga() ? this.sagaId() : null,
      saga_volume:  this.isSaga() ? this.sagaVolume() : null,
      author_ids:   this.selectedAuthors().map(a => a.id),
      genre_ids:    this.selectedGenres().map(g => g.id),
    };

    const obs = this.isEdit()
      ? this.svc.updateBook(this.editId()!, body)
      : this.svc.createBook(body);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/reading']);
      },
      error: (e) => {
        this.error.set(e?.error?.error || 'Failed to save book');
        this.saving.set(false);
      },
    });
  }

  closeModal() { this.openModal.set(null); }

  // ── Helpers ───────────────────────────────────────
  initial(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  genderLabel(g?: Author['gender']) {
    if (!g) return '';
    return {
      female: 'Female', male: 'Male', non_binary: 'Non-binary',
      trans: 'Trans', other: 'Other',
    }[g];
  }
}
