import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { PendingService } from '@app/services/pending.service';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IncomeService, IncomeCategory } from '@app/services/income.service';
import { CardsService, Card } from '@app/services/cards.service';

@Component({
  selector: 'app-new-income',
  imports: [RouterLink],
  templateUrl: './new-income.html',
  styleUrl:    './new-income.scss',
})
export class NewIncome implements OnInit {
  private incomeSvc  = inject(IncomeService);
  private cardsSvc   = inject(CardsService);
  private pendingSvc = inject(PendingService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  editId = signal<string | null>(null);
  pendingId = signal<string | null>(null);
  isEdit = computed(() => !!this.editId());

  categories  = signal<IncomeCategory[]>([]);
  cards       = signal<Card[]>([]);

  amount      = signal('');
  description = signal('');
  categoryId  = signal('');
  subId       = signal('');
  cardId      = signal('');
  date        = signal(new Date().toISOString().split('T')[0]);
  notes       = signal('');
  saving      = signal(false);
  errorMsg    = signal('');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const pid = this.route.snapshot.queryParamMap.get('pending');

    forkJoin({
      cats:  this.incomeSvc.getIncomeCategories(),
      cards: this.cardsSvc.getCards(),
    }).subscribe(({ cats, cards }) => {
      this.categories.set(cats);
      this.cards.set(cards);
      if (!id && !pid) {
        if (cats.length)  this.categoryId.set(cats[0].id);
        if (cards.length) this.cardId.set(cards[0].id);
      }

      // Apply pending pre-fill after data loads
      if (pid) {
        this.pendingId.set(pid);
        this.pendingSvc.getPendingById(pid).subscribe(p => {
          if (p.amount) this.amount.set(String(p.amount));
          if (p.description) this.description.set(p.description);
          if (p.transaction_date) this.date.set(p.transaction_date);
          if (p.notes) this.notes.set(p.notes);
          // Match category
          if (p.category_name && cats.length) {
            const q = p.category_name.toLowerCase();
            const match = cats.find((c: any) => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase()));
            if (match) this.categoryId.set(match.id);
          }
          // Match card
          if (p.payment_method && cards.length) {
            const q = p.payment_method.toLowerCase();
            const match = cards.find((c: any) => (c.name + (c.last_four || '')).toLowerCase().includes(q) || q.includes(c.name.toLowerCase()));
            if (match) this.cardId.set(match.id);
          }
        });
      }
    });

    if (id) {
      this.editId.set(id);
      this.incomeSvc.getIncomeById(id).subscribe(inc => {
        this.amount.set(String(inc.amount));
        this.description.set(inc.description ?? '');
        this.categoryId.set(inc.category_id ?? '');
        this.subId.set(inc.subcategory_id ?? '');
        this.cardId.set(inc.card_id ?? '');
        this.date.set(this.ds(inc.transaction_date));
        this.notes.set(inc.notes ?? '');
      });
    }
  }

  private ds(d: any): string {
    if (!d) return '';
    if (d instanceof Date) return d.toISOString().substring(0, 10);
    return String(d).substring(0, 10);
  }

  selectedCategory = computed(() =>
    this.categories().find(c => c.id === this.categoryId()) ?? null
  );

  subcategories = computed(() => this.selectedCategory()?.subcategories ?? []);

  selectedCard = computed(() =>
    this.cards().find(c => c.id === this.cardId()) ?? null
  );

  selectCategory(id: string) {
    this.categoryId.set(id);
    this.subId.set('');
  }

  isValid = computed(() => parseFloat(this.amount()) > 0 && this.categoryId() !== '');

  selectedSubName = computed(() =>
    this.subcategories().find(s => s.id === this.subId())?.name ?? ''
  );

  amountDisplay = computed(() => {
    const v = parseFloat(this.amount());
    if (isNaN(v)) return '$0.00';
    return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });

  save() {
    if (!this.isValid() || this.saving()) return;
    this.saving.set(true);
    this.errorMsg.set('');
    const body = {
      amount:           parseFloat(this.amount()),
      description:      this.description().trim() || undefined,
      card_id:          this.cardId() || undefined,
      category_id:      this.categoryId() || undefined,
      subcategory_id:   this.subId() || undefined,
      transaction_date: this.date(),
      notes:            this.notes().trim() || undefined,
    };
    const req$ = this.isEdit()
      ? this.incomeSvc.updateIncome(this.editId()!, body)
      : this.incomeSvc.createIncome(body);
    req$.subscribe({
      next: () => {
        const pid = this.pendingId();
        if (pid) { this.pendingSvc.deletePending(pid).subscribe(); }
        this.router.navigateByUrl('/spending/income');
      },
      error: (e) => {
        this.errorMsg.set(e?.error?.error ?? 'Failed to save. Please try again.');
        this.saving.set(false);
      },
    });
  }
}
