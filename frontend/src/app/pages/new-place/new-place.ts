import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { SpendingService, Category } from '../../services/spending.service';

@Component({
  selector: 'app-new-place',
  imports: [RouterLink],
  templateUrl: './new-place.html',
  styleUrl: './new-place.scss',
})
export class NewPlace implements OnInit {
  private svc    = inject(SpendingService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  editId = signal<string | null>(null);
  isEdit = computed(() => !!this.editId());

  categories = signal<Category[]>([]);
  name     = signal('');
  address  = signal('');
  category = signal<string>('');
  notes    = signal('');
  saving   = signal(false);
  errorMsg = signal('');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.svc.getCategories().subscribe(cats => {
      this.categories.set(cats);
      if (!id && cats.length && !this.category()) {
        this.category.set(cats[0].name);
      }
    });
    if (id) {
      this.editId.set(id);
      this.svc.getPlaces().subscribe(places => {
        const p = places.find(p => p.id === id);
        if (!p) return;
        this.name.set(p.name);
        this.address.set(p.address ?? '');
        this.category.set(p.category ?? '');
        this.notes.set(p.notes ?? '');
      });
    }
  }

  isValid = computed(() => this.name().trim().length > 0);

  categoryMeta = computed(() =>
    this.categories().find(c => c.name === this.category())
    ?? { icon: 'location_on', color: '#8373a0', name: '' }
  );

  save() {
    if (!this.isValid() || this.saving()) return;
    this.saving.set(true);
    this.errorMsg.set('');
    const body = {
      name:     this.name().trim(),
      address:  this.address().trim() || undefined,
      category: this.category() || undefined,
      notes:    this.notes().trim() || undefined,
    };
    const req$ = this.isEdit()
      ? this.svc.updatePlace(this.editId()!, body)
      : this.svc.createPlace(body);
    req$.subscribe({
      next: () => this.router.navigateByUrl('/places'),
      error: (e) => {
        this.errorMsg.set(e?.error?.error ?? 'Failed to save. Please try again.');
        this.saving.set(false);
      },
    });
  }
}
