import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SpendingService, Income, IncomeCategory, IncomeSummary } from '../../services/spending.service';

type FilterMode = 'month' | 'year' | 'all' | 'custom';

@Component({
  selector: 'app-income',
  imports: [RouterLink],
  templateUrl: './income.html',
  styleUrl:    './income.scss',
})
export class IncomePage implements OnInit {
  private svc = inject(SpendingService);

  incomeList  = signal<Income[]>([]);
  categories  = signal<IncomeCategory[]>([]);
  summary     = signal<IncomeSummary | null>(null);
  loading     = signal(true);
  filter      = signal<FilterMode>('month');
  customFrom  = signal('');
  customTo    = signal('');
  search      = signal('');
  activeCatId = signal<string | null>(null);
  page        = signal(0);

  readonly PAGE_SIZE = 15;
  readonly currentMonth = new Date().getMonth() + 1;
  readonly currentYear  = new Date().getFullYear();

  ngOnInit() {
    this.svc.getIncomeCategories().subscribe(cats => this.categories.set(cats));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.page.set(0);
    forkJoin({
      income:  this.svc.getIncome(this.filterParams()),
      summary: this.svc.getIncomeSummary(this.currentMonth, this.currentYear),
    }).subscribe(({ income, summary }) => {
      this.incomeList.set(income);
      this.summary.set(summary);
      this.loading.set(false);
    });
  }

  private filterParams() {
    const f = this.filter();
    if (f === 'month')  return { month: this.currentMonth, year: this.currentYear };
    if (f === 'year')   return { year: this.currentYear };
    if (f === 'custom' && this.customFrom() && this.customTo())
      return { from: this.customFrom(), to: this.customTo() };
    return {}; // all
  }

  setFilter(f: FilterMode) { this.filter.set(f); if (f !== 'custom') this.load(); }
  applyCustom() { if (this.customFrom() && this.customTo()) this.load(); }

  filtered = computed(() => {
    let list = this.incomeList();
    const q   = this.search().toLowerCase();
    const cat = this.activeCatId();
    if (q)   list = list.filter(i =>
      (i.description ?? '').toLowerCase().includes(q) ||
      (i.category?.name ?? '').toLowerCase().includes(q)
    );
    if (cat) list = list.filter(i => i.category_id === cat);
    return list;
  });

  paged      = computed(() => this.filtered().slice(this.page() * this.PAGE_SIZE, (this.page() + 1) * this.PAGE_SIZE));
  totalPages = computed(() => Math.ceil(this.filtered().length / this.PAGE_SIZE));
  pages      = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));

  toggleCategory(id: string) { this.activeCatId.set(this.activeCatId() === id ? null : id); this.page.set(0); }

  deleteIncome(id: string) {
    if (!confirm('Delete this income entry?')) return;
    this.svc.deleteIncome(id).subscribe(() =>
      this.incomeList.update(list => list.filter(i => i.id !== id))
    );
  }

  changePct = computed(() => {
    const s = this.summary();
    if (!s?.prev_total) return null;
    const curr = parseFloat(s.total), prev = parseFloat(s.prev_total);
    return prev > 0 ? (curr - prev) / prev * 100 : null;
  });

  filterLabel = computed(() => {
    switch (this.filter()) {
      case 'month':  return 'This Month';
      case 'year':   return 'This Year';
      case 'all':    return 'All Time';
      case 'custom': return `${this.customFrom()} → ${this.customTo()}`;
    }
  });

  fmt(n: number | string | null | undefined) {
    const v = parseFloat(String(n ?? 0));
    return '$' + (isNaN(v) ? 0 : v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  fmtDate(d: any) {
    if (!d) return '';
    const str = d instanceof Date ? d.toISOString().substring(0, 10) : String(d).substring(0, 10);
    const dt  = new Date(str + 'T12:00:00');
    return isNaN(dt.getTime()) ? str : dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }
}
