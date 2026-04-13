import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SpendingService, Card, BillingCycle, MonthStat, PersonSplit, SplitDetailRow, CARD_COLORS } from '../../services/spending.service';

export const SPLIT_COLORS = ['#68558d', '#366859', '#78565f', '#ccb7f5', '#b9eedb'];

interface CycleForm { name: string; from_date: string; to_date: string; }

@Component({
  selector: 'app-payments',
  imports: [RouterLink],
  templateUrl: './payments.html',
  styleUrl: './payments.scss',
})
export class Payments implements OnInit {
  private svc = inject(SpendingService);

  cards        = signal<Card[]>([]);
  selectedCard = signal<Card | null>(null);

  // Credit card state
  cycles       = signal<BillingCycle[]>([]);
  selectedCycleId = signal<string | null>(null);

  // Debit card state
  monthlyStats    = signal<MonthStat[]>([]);
  selectedMonthKey = signal<string | null>(null); // 'YEAR-MONTH' e.g. '2026-4'

  splitPeople  = signal<PersonSplit[]>([]);
  loading      = signal(true);
  splitLoading = signal(false);

  // Create form
  showNewForm  = signal(false);
  newForm      = signal<CycleForm>({ name: '', from_date: '', to_date: '' });
  saving       = signal(false);

  // Edit form
  editingId    = signal<string | null>(null);
  editForm     = signal<CycleForm>({ name: '', from_date: '', to_date: '' });

  readonly SPLIT_COLORS = SPLIT_COLORS;
  readonly currentYear  = new Date().getFullYear();

  isDebit = computed(() => this.selectedCard()?.type === 'debit');

  // Top 5 months: prioritise current+recent months (DESC by year, month)
  topMonthlyStats = computed(() => {
    const stats = [...this.monthlyStats()];
    stats.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
    return stats.slice(0, 5);
  });

  ngOnInit() {
    this.svc.getCards().subscribe(cards => {
      this.cards.set(cards);
      const card = cards.find(c => c.type === 'credit') ?? cards[0] ?? null;
      this.selectedCard.set(card);
      if (card) this.loadForCard(card.id);
      else this.loading.set(false);
    });
  }

  loadForCard(cardId: string) {
    this.loading.set(true);
    const card = this.selectedCard();
    const now  = new Date();
    const m = now.getMonth() + 1, y = now.getFullYear();

    if (card?.type === 'debit') {
      const key = `${y}-${m}`;
      forkJoin({
        stats:  this.svc.getMonthlyStats(cardId, y),
        splits: this.svc.getPeopleSplit(m, y, cardId),
      }).subscribe(({ stats, splits }) => {
        this.monthlyStats.set(stats);
        this.splitPeople.set(splits);
        this.selectedMonthKey.set(key);
        this.loading.set(false);
      });
    } else {
      forkJoin({
        cycles: this.svc.getCycles(cardId),
        splits: this.svc.getPeopleSplit(m, y, cardId),
      }).subscribe(({ cycles, splits }) => {
        this.cycles.set(cycles);
        this.splitPeople.set(splits);
        this.loading.set(false);
      });
    }
  }

  selectCard(c: Card) {
    if (this.selectedCard()?.id === c.id) return;
    this.selectedCard.set(c);
    this.showNewForm.set(false);
    this.editingId.set(null);
    this.selectedCycleId.set(null);
    this.selectedMonthKey.set(null);
    this.loadForCard(c.id);
  }

  // ── Debit: month selection ───────────────────────────────────
  selectMonth(stat: MonthStat) {
    const key = `${stat.year}-${stat.month}`;
    this.selectedMonthKey.set(key);
    const cardId = this.selectedCard()?.id;
    if (!cardId) return;
    this.splitLoading.set(true);
    this.svc.getPeopleSplitByRange(stat.from_date, stat.to_date, cardId)
      .subscribe(splits => {
        this.splitPeople.set(splits);
        this.splitLoading.set(false);
      });
  }

  isCurrentMonth(stat: MonthStat) {
    const now = new Date();
    return stat.month === now.getMonth() + 1 && stat.year === now.getFullYear();
  }

  isMonthSelected(stat: MonthStat) {
    return this.selectedMonthKey() === `${stat.year}-${stat.month}`;
  }

  fmtMonth(month: number, year: number) {
    return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  activeMonthStat = computed(() => {
    const key = this.selectedMonthKey();
    if (!key) return null;
    const [y, m] = key.split('-').map(Number);
    return this.monthlyStats().find(s => s.year === y && s.month === m) ?? null;
  });

  // ── Credit: cycle selection ──────────────────────────────────
  selectCycle(cycle: BillingCycle) {
    const id = this.selectedCycleId() === cycle.id ? null : cycle.id;
    this.selectedCycleId.set(id);
    if (!id) return;
    const cardId = this.selectedCard()?.id;
    if (!cardId) return;
    this.splitLoading.set(true);
    this.svc.getPeopleSplitByRange(cycle.from_date, cycle.to_date, cardId)
      .subscribe(splits => {
        this.splitPeople.set(splits);
        this.splitLoading.set(false);
      });
  }

  activeCycle = computed(() => {
    const id = this.selectedCycleId();
    if (id) return this.cycles().find(c => c.id === id) ?? null;
    return this.currentCycle();
  });

  activePeriodLabel = computed(() => {
    if (this.isDebit()) {
      const s = this.activeMonthStat();
      return s ? this.fmtMonth(s.month, s.year) : 'Current month';
    }
    return this.activeCycle()?.name ?? 'Current cycle';
  });

  // ── Cycle CRUD ───────────────────────────────────────────────
  openNewForm() {
    this.showNewForm.set(true);
    this.editingId.set(null);
    this.newForm.set({ name: '', from_date: '', to_date: '' });
  }
  cancelNew() { this.showNewForm.set(false); }

  saveNew() {
    const f = this.newForm();
    const cardId = this.selectedCard()?.id;
    if (!f.name || !f.from_date || !f.to_date || !cardId) return;
    this.saving.set(true);
    this.svc.createCycle(cardId, f).subscribe({
      next: () => {
        this.svc.getCycles(cardId).subscribe(cycles => {
          this.cycles.set(cycles);
          this.showNewForm.set(false);
          this.saving.set(false);
        });
      },
      error: () => this.saving.set(false),
    });
  }

  startEdit(cycle: BillingCycle) {
    this.editingId.set(cycle.id);
    this.showNewForm.set(false);
    this.editForm.set({
      name:      cycle.name,
      from_date: this.ds(cycle.from_date),
      to_date:   this.ds(cycle.to_date),
    });
  }
  cancelEdit() { this.editingId.set(null); }

  saveEdit(cycle: BillingCycle) {
    const f = this.editForm();
    if (!f.name || !f.from_date || !f.to_date) return;
    this.saving.set(true);
    this.svc.updateCycle(cycle.id, f).subscribe({
      next: updated => {
        this.cycles.update(list => list.map(c => c.id === updated.id ? { ...c, ...updated } : c));
        this.editingId.set(null);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  deleteCycle(id: string) {
    if (!confirm('Delete this billing cycle?')) return;
    this.svc.deleteCycle(id).subscribe(() => {
      this.cycles.update(list => list.filter(c => c.id !== id));
      if (this.selectedCycleId() === id) this.selectedCycleId.set(null);
    });
  }

  // ── Date helper ──────────────────────────────────────────────
  private ds(d: any): string {
    if (!d) return '';
    if (d instanceof Date) return d.toISOString().substring(0, 10);
    return String(d).substring(0, 10);
  }

  currentCycle = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.cycles().find(c => this.ds(c.from_date) <= today && today <= this.ds(c.to_date))
      ?? this.cycles()[0] ?? null;
  });

  splitTotal = computed(() =>
    this.splitPeople().reduce((s, p) => s + parseFloat(p.amount), 0)
  );

  availableCredit = computed(() => {
    const c = this.selectedCard();
    if (!c) return null;
    // Prefer the backend-computed value (credit_limit − unpaid cycle totals).
    // Fall back to stored available_credit, then credit_limit.
    if (c.computed_available_credit != null) return +c.computed_available_credit;
    return c.available_credit ?? c.credit_limit ?? null;
  });

  consumedCredit = computed(() => {
    const c = this.selectedCard();
    if (!c) return null;
    if (c.consumed_credit != null) return +c.consumed_credit;
    // Fallback: derive from current in-memory cycles
    return this.cycles().filter(cy => !cy.paid)
      .reduce((s, cy) => s + parseFloat(cy.total || '0'), 0);
  });

  creditUsagePct = computed(() => {
    const c = this.selectedCard();
    const consumed = this.consumedCredit();
    if (!c?.credit_limit || consumed == null) return null;
    return Math.min(100, (consumed / +c.credit_limit) * 100);
  });

  toggleCyclePaid(cycle: BillingCycle, ev: Event) {
    ev.stopPropagation();
    const newPaid = !cycle.paid;
    // optimistic update
    this.cycles.update(list => list.map(c =>
      c.id === cycle.id ? { ...c, paid: newPaid, paid_at: newPaid ? new Date().toISOString() : null } : c
    ));
    this.svc.setCyclePaid(cycle.id, newPaid).subscribe({
      next: () => {
        // Refresh cards so the computed available_credit on the header updates
        this.svc.getCards().subscribe(cards => {
          this.cards.set(cards);
          const sel = cards.find(c => c.id === this.selectedCard()?.id);
          if (sel) this.selectedCard.set(sel);
        });
      },
      error: () => {
        // Roll back optimistic update
        this.cycles.update(list => list.map(c =>
          c.id === cycle.id ? { ...c, paid: cycle.paid, paid_at: cycle.paid_at } : c
        ));
      },
    });
  }

  currentCount = computed(() => {
    if (this.isDebit()) return this.activeMonthStat()?.count ?? 0;
    return this.currentCycle()?.count ?? 0;
  });

  fmt(n: number | string | null | undefined) {
    const v = parseFloat(String(n ?? 0));
    return '$' + (isNaN(v) ? 0 : v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  fmtDate(d: any) {
    const str = this.ds(d);
    if (!str) return '';
    const date = new Date(str + 'T12:00:00');
    if (isNaN(date.getTime())) return str;
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }

  cardGradient(color?: string) {
    const c = CARD_COLORS[color ?? 'purple'] ?? CARD_COLORS['purple'];
    return `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)`;
  }

  isCycleActive(cycle: BillingCycle) {
    const today = new Date().toISOString().split('T')[0];
    return this.ds(cycle.from_date) <= today && today <= this.ds(cycle.to_date);
  }

  setNewField(field: keyof CycleForm, val: string) {
    this.newForm.update(f => ({ ...f, [field]: val }));
  }
  setEditField(field: keyof CycleForm, val: string) {
    this.editForm.update(f => ({ ...f, [field]: val }));
  }

  // ── Split detail modal ──────────────────────────────────────
  showSplitDetail   = signal(false);
  splitDetailRows   = signal<SplitDetailRow[]>([]);
  splitDetailPerson = signal<PersonSplit | null>(null);
  splitDetailLoading = signal(false);

  openSplitDetail(person?: PersonSplit) {
    this.splitDetailPerson.set(person ?? null);
    this.showSplitDetail.set(true);
    this.splitDetailLoading.set(true);

    let from: string, to: string;
    if (this.isDebit()) {
      const stat = this.activeMonthStat();
      from = stat?.from_date ?? ''; to = stat?.to_date ?? '';
    } else {
      const cycle = this.activeCycle();
      from = cycle ? this.ds(cycle.from_date) : '';
      to   = cycle ? this.ds(cycle.to_date) : '';
    }
    if (!from || !to) { this.splitDetailLoading.set(false); return; }

    const cardId   = this.selectedCard()?.id;
    const personId = person ? (person.is_me ? 'me' : person.person_id ?? undefined) : undefined;

    this.svc.getSplitDetail(from, to, cardId, personId).subscribe(rows => {
      this.splitDetailRows.set(rows);
      this.splitDetailLoading.set(false);
    });
  }

  closeSplitDetail() {
    this.showSplitDetail.set(false);
    this.splitDetailRows.set([]);
    this.splitDetailPerson.set(null);
  }

  splitDetailTotal = computed(() =>
    this.splitDetailRows().reduce((s, r) => s + parseFloat(r.split_amount || '0'), 0)
  );

  fmtShortDate(d: any) {
    const str = this.ds(d);
    if (!str) return '';
    const date = new Date(str + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
