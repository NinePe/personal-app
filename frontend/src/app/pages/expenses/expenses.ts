import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SpendingService, Expense, ExpenseSummary, CategoryStat } from '../../services/spending.service';

const CAT_ICONS: Record<string, string> = {
  'Dining': 'restaurant', 'Travel': 'commute', 'Retail': 'shopping_bag',
  'Health': 'favorite', 'Entertainment': 'music_note', 'Housing': 'home',
  'Transport': 'directions_car', 'Education': 'school',
  'Subscriptions': 'autorenew', 'Other': 'more_horiz',
};

const CHART_COLORS = ['#68558d','#366859','#78565f','#ccb7f5','#c7fce9','#ffd1dc','#bea9e7','#b9eedb'];

interface DonutSeg { dash: number; gap: number; offset: number; color: string; }
interface CatWithPct extends CategoryStat { percentage: number; chartColor: string; }

export type DateFilter = 'month' | 'year' | 'all' | 'custom';

@Component({
  selector: 'app-expenses',
  imports: [RouterLink],
  templateUrl: './expenses.html',
  styleUrl: './expenses.scss',
})
export class ExpensesDashboard implements OnInit {
  private svc = inject(SpendingService);

  expenses    = signal<Expense[]>([]);
  summary     = signal<ExpenseSummary | null>(null);
  prevSummary = signal<ExpenseSummary | null>(null);
  loading     = signal(true);

  // ── Date filter state ─────────────────────────────
  activeFilter = signal<DateFilter>('month');
  currentMonth = signal(new Date().getMonth() + 1);
  currentYear  = signal(new Date().getFullYear());
  customFrom   = signal('');
  customTo     = signal('');

  // ── Computed ──────────────────────────────────────
  totalAmount = computed(() => parseFloat(this.summary()?.total ?? '0') || 0);
  prevTotal   = computed(() => parseFloat(this.prevSummary()?.total ?? '0') || 0);

  trendPct = computed(() => {
    if (this.activeFilter() !== 'month') return null;
    const cur = this.totalAmount(), prev = this.prevTotal();
    if (!prev) return null;
    return ((cur - prev) / prev) * 100;
  });

  categoriesWithPct = computed((): CatWithPct[] => {
    const cats = this.summary()?.byCategory ?? [];
    const total = cats.reduce((s, c) => s + parseFloat(c.total), 0);
    return cats.map((c, i) => ({
      ...c,
      percentage: total > 0 ? (parseFloat(c.total) / total) * 100 : 0,
      chartColor: CHART_COLORS[i % CHART_COLORS.length],
    }));
  });

  donutSegments = computed((): DonutSeg[] => {
    const cats = this.categoriesWithPct();
    if (!cats.length) return [];
    const r = 48, circ = 2 * Math.PI * r;
    let offset = 0;
    return cats.map(c => {
      const dash = (c.percentage / 100) * circ;
      const seg: DonutSeg = { dash, gap: circ - dash, offset, color: c.chartColor };
      offset += dash;
      return seg;
    });
  });

  topCategory = computed(() => this.categoriesWithPct()[0]?.name ?? '—');

  // ── Pagination ──────────────────────────────────
  pageSize = 10;
  page     = signal(1);

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.expenses().length / this.pageSize))
  );

  paginatedExpenses = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.expenses().slice(start, start + this.pageSize);
  });

  pageNumbers = computed<number[]>(() => {
    const total = this.totalPages(), cur = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    const start = Math.max(2, cur - 1);
    const end   = Math.min(total - 1, cur + 1);
    if (start > 2) pages.push(-1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push(-1);
    pages.push(total);
    return pages;
  });

  setPage(p: number) {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
  }

  periodLabel = computed(() => {
    const f = this.activeFilter();
    if (f === 'month') {
      return new Date(this.currentYear(), this.currentMonth() - 1, 1)
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (f === 'year') return String(this.currentYear());
    if (f === 'all')  return 'All Time';
    const from = this.customFrom(), to = this.customTo();
    if (from && to) return `${from} – ${to}`;
    return 'Custom';
  });

  canGoNext = computed(() => {
    if (this.activeFilter() !== 'month') return false;
    const now = new Date();
    return this.currentYear() < now.getFullYear() ||
      (this.currentYear() === now.getFullYear() && this.currentMonth() < now.getMonth() + 1);
  });

  // ── Lifecycle ─────────────────────────────────────
  ngOnInit() { this.load(); }

  setFilter(f: DateFilter) {
    this.activeFilter.set(f);
    this.page.set(1);
    if (f !== 'custom') this.load();
  }

  applyCustom() {
    if (this.customFrom() && this.customTo()) this.load();
  }

  load() {
    this.loading.set(true);
    this.page.set(1);
    const f = this.activeFilter();

    let expenseParams: any = {};
    let summaryObs;
    let prevSummaryObs;

    if (f === 'month') {
      const m = this.currentMonth(), y = this.currentYear();
      const pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y;
      expenseParams = { month: m, year: y };
      summaryObs    = this.svc.getSummary(m, y);
      prevSummaryObs = this.svc.getSummary(pm, py);
    } else if (f === 'year') {
      const y = this.currentYear();
      const from = `${y}-01-01`, to = `${y}-12-31`;
      expenseParams = { from, to };
      summaryObs    = this.svc.getSummaryByRange(from, to);
      prevSummaryObs = this.svc.getSummaryByRange(`${y - 1}-01-01`, `${y - 1}-12-31`);
    } else if (f === 'all') {
      expenseParams = {};
      summaryObs    = this.svc.getSummaryByRange('2000-01-01', '2099-12-31');
      prevSummaryObs = null;
    } else {
      const from = this.customFrom(), to = this.customTo();
      if (!from || !to) { this.loading.set(false); return; }
      expenseParams = { from, to };
      summaryObs    = this.svc.getSummaryByRange(from, to);
      prevSummaryObs = null;
    }

    if (!prevSummaryObs) this.prevSummary.set(null);

    forkJoin({
      expenses: this.svc.getExpenses(expenseParams),
      summary:  summaryObs,
      ...(prevSummaryObs ? { prev: prevSummaryObs } : {}),
    }).subscribe((res: any) => {
      this.expenses.set(res.expenses);
      this.summary.set(res.summary);
      if (res.prev) this.prevSummary.set(res.prev);
      this.loading.set(false);
    });
  }

  prevMonth() {
    let m = this.currentMonth() - 1, y = this.currentYear();
    if (m < 1) { m = 12; y--; }
    this.currentMonth.set(m); this.currentYear.set(y);
    this.load();
  }
  nextMonth() {
    if (!this.canGoNext()) return;
    let m = this.currentMonth() + 1, y = this.currentYear();
    if (m > 12) { m = 1; y++; }
    this.currentMonth.set(m); this.currentYear.set(y);
    this.load();
  }
  prevYear() {
    this.currentYear.update(y => y - 1);
    this.load();
  }
  nextYear() {
    if (this.currentYear() >= new Date().getFullYear()) return;
    this.currentYear.update(y => y + 1);
    this.load();
  }

  catIcon(name: string) { return CAT_ICONS[name] ?? 'more_horiz'; }

  formatDate(d: any) {
    const str = d instanceof Date ? d.toISOString().substring(0, 10) : String(d).substring(0, 10);
    return new Date(str + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatAmount(n: number | string) {
    return '$' + parseFloat(String(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  absTrend() { return Math.abs(this.trendPct() ?? 0).toFixed(1); }

  deleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return;
    this.svc.deleteExpense(id).subscribe(() =>
      this.expenses.update(list => list.filter(e => e.id !== id))
    );
  }
}
