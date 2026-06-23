import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CardsService, Card } from '@app/services/cards.service';
import { BudgetService, Category, Subcategory } from '@app/services/budget.service';
import { PeopleService, Person } from '@app/services/people.service';
import { PlacesService, Place } from '@app/services/places.service';
import { ExpensesService, SplitEntry } from '@app/services/expenses.service';
import { PendingService } from '@app/services/pending.service';

type PaymentType = 'debit' | 'credit';
type SplitMethod = 'equal' | 'specific' | 'percentage';

interface SplitRow {
  label: string; avatarInitial: string;
  is_me: boolean; person_id?: string;
  amount: number; percentage: number;
}

const CAT_ICONS: Record<string, string> = {
  'Dining': 'restaurant', 'Travel': 'commute', 'Retail': 'shopping_bag',
  'Health': 'favorite', 'Entertainment': 'music_note', 'Housing': 'home',
  'Transport': 'directions_car', 'Education': 'school',
  'Subscriptions': 'autorenew', 'Other': 'more_horiz',
};

@Component({
  selector: 'app-spending',
  imports: [FormsModule, RouterLink],
  templateUrl: './spending.html',
  styleUrl: './spending.scss',
})
export class Spending implements OnInit {
  private cardsSvc     = inject(CardsService);
  private budgetSvc    = inject(BudgetService);
  private peopleSvc    = inject(PeopleService);
  private placesSvc    = inject(PlacesService);
  private expensesSvc  = inject(ExpensesService);
  private pendingSvc   = inject(PendingService);
  private sanitizer = inject(DomSanitizer);
  private router    = inject(Router);
  private route     = inject(ActivatedRoute);

  editId = signal<string | null>(null);
  pendingId = signal<string | null>(null);
  isEdit = computed(() => !!this.editId());

  cards      = signal<Card[]>([]);
  categories = signal<Category[]>([]);
  people     = signal<Person[]>([]);
  allPlaces  = signal<Place[]>([]);

  // Form
  amount       = signal('');
  paymentType  = signal<PaymentType>('debit');
  selectedCard = signal<Card | null>(null);
  selectedCat  = signal<Category | null>(null);
  selectedSub  = signal<Subcategory | null>(null);
  txDate          = signal(new Date().toISOString().split('T')[0]);
  selectedPlace   = signal<Place | null>(null);
  placeSearch     = signal('');
  showPlacePicker = signal(false);
  expDescription = signal('');
  expNotes       = signal('');
  isSplit      = signal(false);
  splitMethod  = signal<SplitMethod>('equal');
  splitRows    = signal<SplitRow[]>([]);
  receiptFile    = signal<File | null>(null);
  receiptPreview = signal<SafeResourceUrl | null>(null);
  saving  = signal(false);
  saved   = signal(false);
  errorMsg = signal('');
  showDateInput = signal(false);
  showPeoplePicker = signal(false);

  subcategories  = computed(() => this.selectedCat()?.subcategories ?? []);
  filteredCards  = computed(() => this.cards().filter(c => c.type === this.paymentType()));
  filteredPlaces = computed(() => {
    const q = this.placeSearch().toLowerCase().trim();
    if (!q) return this.allPlaces().slice(0, 8);
    return this.allPlaces().filter(p => p.name.toLowerCase().includes(q)).slice(0, 8);
  });
  canCreatePlace = computed(() => {
    const q = this.placeSearch().trim();
    return q.length > 0 && !this.allPlaces().some(p => p.name.toLowerCase() === q.toLowerCase());
  });
  splitPeopleNames = computed(() => {
    const names = this.splitRows().filter(r => !r.is_me).map(r => r.label);
    return names.length ? 'Adding ' + names.join(' and ') : 'Only you';
  });
  hasSplitPeople = computed(() => this.splitRows().some(r => !r.is_me));

  ngOnInit() {
    const pendingId = this.route.snapshot.queryParamMap.get('pending');
    const editId = this.route.snapshot.paramMap.get('id');

    const base$ = forkJoin({
      cards:      this.cardsSvc.getCards(),
      categories: this.budgetSvc.getCategories(),
      people:     this.peopleSvc.getPeople(),
      places:     this.placesSvc.getPlaces(),
    });

    if (editId) {
      this.editId.set(editId);
      forkJoin({ base: base$, expense: this.expensesSvc.getExpenseById(editId) })
        .subscribe(({ base, expense }) => {
          this.cards.set(base.cards);
          this.categories.set(base.categories);
          this.people.set(base.people);
          this.allPlaces.set(base.places);

          this.amount.set(String(expense.amount));
          const pType: PaymentType = expense.card.type === 'credit' ? 'credit' : 'debit';
          this.paymentType.set(pType);
          const card = base.cards.find(c => c.id === expense.card.id);
          if (card) this.selectedCard.set(card);
          const cat = base.categories.find(c => c.id === expense.category.id);
          if (cat) {
            this.selectedCat.set(cat);
            const sub = cat.subcategories.find(s => s.id === expense.subcategory?.id);
            if (sub) this.selectedSub.set(sub);
          }
          const place = base.places.find(p => p.id === expense.place?.id);
          if (place) { this.selectedPlace.set(place); this.placeSearch.set(place.name); }
          const ds = (d: any) => d instanceof Date ? d.toISOString().substring(0,10) : String(d).substring(0,10);
          this.txDate.set(ds(expense.transaction_date));
          this.expDescription.set(expense.description ?? '');
          this.expNotes.set(expense.notes ?? '');

          if (expense.is_split && expense.splits?.length) {
            this.isSplit.set(true);
            this.splitMethod.set((expense.split_method as SplitMethod) ?? 'equal');
            this.splitRows.set(expense.splits.map(sp => ({
              label: sp.is_me ? 'You (Me)' : (sp.person?.name ?? 'Unknown'),
              avatarInitial: sp.is_me ? 'ME' : (sp.person?.name?.charAt(0).toUpperCase() ?? '?'),
              is_me: sp.is_me ?? false,
              person_id: (sp as any).person?.id,
              amount: parseFloat(String(sp.amount ?? 0)),
              percentage: parseFloat(String(sp.percentage ?? 0)),
            })));
          }
        });
    } else {
      base$.subscribe(({ cards, categories, people, places }) => {
        this.cards.set(cards);
        this.categories.set(categories);
        this.people.set(people);
        this.allPlaces.set(places);
        // After data loads, apply pending pre-fill
        if (pendingId) this.applyPending(pendingId, cards, categories, places, people);
      });
    }
  }

  private applyPending(pendingId: string, cards: Card[], categories: Category[], places: Place[], people: Person[]) {
    this.pendingId.set(pendingId);
    this.pendingSvc.getPendingById(pendingId).subscribe(p => {
      if (p.amount) this.amount.set(String(p.amount));
      if (p.description) this.expDescription.set(p.description);
      if (p.transaction_date) this.txDate.set(p.transaction_date);
      if (p.notes) this.expNotes.set(p.notes);

      // Match category
      if (p.category_name && categories.length) {
        const match = this.fuzzyFind(p.category_name, categories.map(c => c.name));
        if (match) {
          const cat = categories.find(c => c.name === match);
          if (cat) {
            this.selectedCat.set(cat);
            if (p.subcategory_name && cat.subcategories?.length) {
              const subMatch = this.fuzzyFind(p.subcategory_name, cat.subcategories.map((s: any) => s.name));
              if (subMatch) {
                const sub = cat.subcategories.find((s: any) => s.name === subMatch);
                if (sub) this.selectedSub.set(sub);
              }
            }
          }
        }
      }

      // Match card
      if (p.payment_method && cards.length) {
        const match = this.fuzzyFind(p.payment_method, cards.map(c => c.name + (c.last_four ? ' ····' + c.last_four : '')));
        if (match) {
          const card = cards.find(c => (c.name + (c.last_four ? ' ····' + c.last_four : '')) === match);
          if (card) {
            this.paymentType.set(card.type as PaymentType);
            this.selectedCard.set(card);
          }
        }
      }

      // Match place
      if (p.place_name) {
        const placeMatch = this.fuzzyFind(p.place_name, places.map(pl => pl.name));
        if (placeMatch) {
          const place = places.find(pl => pl.name === placeMatch);
          if (place) this.selectPlace(place);
        } else {
          this.placeSearch.set(p.place_name);
          this.showPlacePicker.set(true);
        }
      }

      if (p.is_split && p.split_people?.length) {
        this.isSplit.set(true);
      }
    });
  }

  private fuzzyFind(query: string, options: string[]): string | null {
    const q = query.toLowerCase().trim();
    // Exact match
    const exact = options.find(o => o.toLowerCase() === q);
    if (exact) return exact;
    // Contains match
    const contains = options.find(o => o.toLowerCase().includes(q) || q.includes(o.toLowerCase()));
    if (contains) return contains;
    // Word overlap
    const words = q.split(/\s+/);
    for (const o of options) {
      const oLower = o.toLowerCase();
      if (words.some(w => oLower.includes(w))) return o;
    }
    return null;
  }

  catIcon(name: string) { return CAT_ICONS[name] ?? 'more_horiz'; }

  onPlaceSearch(val: string) {
    this.placeSearch.set(val);
    this.showPlacePicker.set(true);
    if (!val) this.selectedPlace.set(null);
  }

  onPlaceBlur() {
    // Small delay so mousedown on dropdown items fires first
    setTimeout(() => this.showPlacePicker.set(false), 150);
  }

  selectPlace(p: Place) {
    this.selectedPlace.set(p);
    this.placeSearch.set(p.name);
    this.showPlacePicker.set(false);
  }

  clearPlace() {
    this.selectedPlace.set(null);
    this.placeSearch.set('');
  }

  createAndSelectPlace() {
    const name = this.placeSearch().trim();
    if (!name) return;
    this.placesSvc.createPlace({ name }).subscribe(p => {
      this.allPlaces.update(ps => [...ps, p]);
      this.selectPlace(p);
    });
  }

  setPaymentType(t: PaymentType) {
    this.paymentType.set(t);
    this.selectedCard.set(null);
  }

  selectCard(c: Card)         { this.selectedCard.set(c); }
  selectCategory(c: Category) { this.selectedCat.set(c); this.selectedSub.set(null); }
  selectSub(s: Subcategory)   { this.selectedSub.set(s); }

  formatDateDisplay(d: string) {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  getWeekday(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  }

  toggleSplit() {
    this.isSplit.update(v => !v);
    if (this.isSplit()) {
      this.splitRows.set([{ label: 'You (Me)', avatarInitial: 'ME', is_me: true, amount: 0, percentage: 0 }]);
      this.recalc();
    }
  }

  setSplitMethod(m: SplitMethod) { this.splitMethod.set(m); this.recalc(); }

  addPerson(p: Person) {
    if (this.splitRows().some(r => r.person_id === p.id)) {
      this.splitRows.update(rs => rs.filter(r => r.person_id !== p.id));
    } else {
      this.splitRows.update(rs => [...rs, {
        label: p.name, avatarInitial: p.name.charAt(0).toUpperCase(),
        is_me: false, person_id: p.id, amount: 0, percentage: 0,
      }]);
    }
    this.recalc();
  }

  isPersonAdded(p: Person) { return this.splitRows().some(r => r.person_id === p.id); }

  private recalc() {
    const amt = parseFloat(this.amount()) || 0;
    const rows = this.splitRows();
    if (!rows.length) return;
    if (this.splitMethod() === 'equal') {
      const each = parseFloat((amt / rows.length).toFixed(2));
      const pct  = parseFloat((100 / rows.length).toFixed(2));
      this.splitRows.set(rows.map(r => ({ ...r, amount: each, percentage: pct })));
    } else if (this.splitMethod() === 'percentage') {
      this.splitRows.set(rows.map(r => ({ ...r, amount: parseFloat(((amt * r.percentage) / 100).toFixed(2)) })));
    }
  }

  onAmountInput(val: string) { this.amount.set(val); if (this.isSplit()) this.recalc(); }

  onSpecificChange(i: number, val: number) {
    this.splitRows.update(rs => rs.map((r, idx) => idx === i ? { ...r, amount: val } : r));
  }
  onPctChange(i: number, val: number) {
    this.splitRows.update(rs => rs.map((r, idx) => idx === i ? { ...r, percentage: val } : r));
    this.recalc();
  }

  pctTotal() { return this.splitRows().reduce((s, r) => s + r.percentage, 0); }

  onFile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    this.receiptFile.set(f);
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      this.receiptPreview.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    };
    reader.readAsDataURL(f);
  }
  removeFile() { this.receiptFile.set(null); this.receiptPreview.set(null); }

  isValid() { return parseFloat(this.amount()) > 0 && !!this.selectedCard() && !!this.selectedCat(); }

  save() {
    if (!this.isValid() || this.saving()) return;
    this.saving.set(true); this.errorMsg.set('');
    const payload: any = {
      amount: parseFloat(this.amount()),
      description: this.expDescription() || undefined,
      card_id: this.selectedCard()!.id,
      category_id: this.selectedCat()!.id,
      subcategory_id: this.selectedSub()?.id,
      place_id: this.selectedPlace()?.id,
      transaction_date: this.txDate(),
      notes: this.expNotes() || undefined,
      is_split: this.isSplit(),
      split_method: this.isSplit() ? this.splitMethod() : undefined,
      splits: this.isSplit() ? this.splitRows().map(r => ({
        person_id: r.person_id, is_me: r.is_me,
        amount: this.splitMethod() !== 'percentage' ? r.amount : undefined,
        percentage: this.splitMethod() === 'percentage' ? r.percentage : undefined,
      })) : undefined,
    };
    const req$ = this.isEdit()
      ? this.expensesSvc.updateExpense(this.editId()!, payload)
      : this.expensesSvc.createExpense(payload);

    req$.subscribe({
      next: (exp) => {
        // If this was a pending expense, delete it
        const cleanupPending = () => {
          const pid = this.pendingId();
          if (pid) {
            this.pendingSvc.deletePending(pid).subscribe();
            this.pendingId.set(null);
          }
        };

        if (this.isEdit()) {
          cleanupPending();
          this.saving.set(false);
          this.router.navigateByUrl('/spending/expenses');
          return;
        }
        const done = () => {
          cleanupPending();
          if (this.receiptFile()) {
            this.expensesSvc.uploadReceipt(exp.id, this.receiptFile()!).subscribe({
              next: () => this.router.navigateByUrl('/spending/expenses'),
              error: () => this.router.navigateByUrl('/spending/expenses'),
            });
          } else {
            this.router.navigateByUrl('/spending/expenses');
          }
        };
        done();
      },
      error: (err) => { this.saving.set(false); this.errorMsg.set(err.error?.error ?? 'Error saving'); },
    });
  }

  private reset() {
    this.amount.set(''); this.selectedCard.set(null); this.selectedCat.set(null);
    this.selectedSub.set(null); this.selectedPlace.set(null); this.placeSearch.set('');
    this.isSplit.set(false); this.splitRows.set([]);
    this.receiptFile.set(null); this.receiptPreview.set(null);
  }
}
