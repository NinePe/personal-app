import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SpendingService, Card, BillingCycle, MonthStat } from '../../services/spending.service';

interface Row {
  id: string;
  name: string;
  from_date: string;
  to_date: string;
  total: string;
  count: number;
  isActive: boolean;
  paid: boolean;
  isCycle: boolean;  // false for debit monthly rows (no paid toggle)
}

@Component({
  selector: 'app-cycles-history',
  imports: [RouterLink],
  templateUrl: './cycles-history.html',
  styleUrl: './cycles-history.scss',
})
export class CyclesHistory implements OnInit {
  private svc   = inject(SpendingService);
  private route = inject(ActivatedRoute);

  card       = signal<Card | null>(null);
  allRows    = signal<Row[]>([]);
  loading    = signal(true);

  // Pagination
  pageSize   = signal(10);
  page       = signal(1);
  sortKey    = signal<'from_date' | 'total' | 'count'>('from_date');
  sortDir    = signal<'asc' | 'desc'>('desc');
  searchTerm = signal('');

  ngOnInit() {
    const cardId = this.route.snapshot.paramMap.get('cardId');
    if (!cardId) return;

    this.svc.getCards().subscribe(cards => {
      const c = cards.find(x => x.id === cardId) ?? null;
      this.card.set(c);
      if (!c) { this.loading.set(false); return; }

      if (c.type === 'credit') {
        this.svc.getCycles(cardId).subscribe(cycles => {
          this.allRows.set(cycles.map(cy => this.cycleToRow(cy)));
          this.loading.set(false);
        });
      } else {
        // For debit: fetch monthly stats for current + previous years
        const currentYear = new Date().getFullYear();
        forkJoin([
          this.svc.getMonthlyStats(cardId, currentYear),
          this.svc.getMonthlyStats(cardId, currentYear - 1),
          this.svc.getMonthlyStats(cardId, currentYear - 2),
        ]).subscribe(([a, b, cc]) => {
          const all = [...a, ...b, ...cc]
            .filter(s => +s.total > 0 || s.count > 0 || this.isCurrentMonth(s))
            .map(s => this.statToRow(s));
          this.allRows.set(all);
          this.loading.set(false);
        });
      }
    });
  }

  private cycleToRow(c: BillingCycle): Row {
    const today = new Date().toISOString().split('T')[0];
    return {
      id:        c.id,
      name:      c.name,
      from_date: String(c.from_date).substring(0, 10),
      to_date:   String(c.to_date).substring(0, 10),
      total:     c.total,
      count:     c.count,
      isActive:  String(c.from_date).substring(0, 10) <= today && today <= String(c.to_date).substring(0, 10),
      paid:      c.paid,
      isCycle:   true,
    };
  }

  private statToRow(s: MonthStat): Row {
    return {
      id:        `${s.year}-${s.month}`,
      name:      new Date(s.year, s.month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      from_date: s.from_date,
      to_date:   s.to_date,
      total:     s.total,
      count:     s.count,
      isActive:  this.isCurrentMonth(s),
      paid:      false,
      isCycle:   false,
    };
  }

  togglePaid(row: Row, ev: Event) {
    ev.stopPropagation();
    if (!row.isCycle) return;
    const newPaid = !row.paid;
    this.allRows.update(list => list.map(r =>
      r.id === row.id ? { ...r, paid: newPaid } : r
    ));
    this.svc.setCyclePaid(row.id, newPaid).subscribe({
      error: () => {
        this.allRows.update(list => list.map(r =>
          r.id === row.id ? { ...r, paid: row.paid } : r
        ));
      },
    });
  }

  private isCurrentMonth(s: MonthStat) {
    const now = new Date();
    return s.month === now.getMonth() + 1 && s.year === now.getFullYear();
  }

  // ── Filtering + sorting + pagination ───────────────────────
  filteredRows = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    let rows = this.allRows();
    if (term) {
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(term) ||
        r.from_date.includes(term) ||
        r.to_date.includes(term)
      );
    }
    const key = this.sortKey(), dir = this.sortDir();
    const mul = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (key === 'total') return (parseFloat(a.total) - parseFloat(b.total)) * mul;
      if (key === 'count') return (a.count - b.count) * mul;
      return (a.from_date.localeCompare(b.from_date)) * mul;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize())));

  paginatedRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredRows().slice(start, start + this.pageSize());
  });

  totalAmount = computed(() =>
    this.filteredRows().reduce((s, r) => s + parseFloat(r.total || '0'), 0)
  );
  totalCount  = computed(() => this.filteredRows().reduce((s, r) => s + r.count, 0));

  unpaidAmount = computed(() =>
    this.filteredRows()
      .filter(r => r.isCycle && !r.paid)
      .reduce((s, r) => s + parseFloat(r.total || '0'), 0)
  );
  paidAmount = computed(() =>
    this.filteredRows()
      .filter(r => r.isCycle && r.paid)
      .reduce((s, r) => s + parseFloat(r.total || '0'), 0)
  );
  hasAnyCycle = computed(() => this.filteredRows().some(r => r.isCycle));

  // ── Actions ────────────────────────────────────────────────
  setPage(p: number) {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
  }
  prevPage() { this.setPage(this.page() - 1); }
  nextPage() { this.setPage(this.page() + 1); }

  setSort(key: 'from_date' | 'total' | 'count') {
    if (this.sortKey() === key) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('desc');
    }
    this.page.set(1);
  }

  setSearch(val: string) {
    this.searchTerm.set(val);
    this.page.set(1);
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.page.set(1);
  }

  // Page number strip (up to 7 visible)
  pageNumbers = computed<number[]>(() => {
    const total = this.totalPages(), cur = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    let start = Math.max(2, cur - 2);
    let end   = Math.min(total - 1, cur + 2);
    if (start > 2) pages.push(-1);       // ellipsis placeholder
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push(-1);
    pages.push(total);
    return pages;
  });

  // ── Formatters ─────────────────────────────────────────────
  fmt(n: number | string) {
    const v = parseFloat(String(n ?? 0));
    return '$' + (isNaN(v) ? 0 : v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  fmtDate(d: string) {
    if (!d) return '';
    const date = new Date(d + 'T12:00:00');
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }
}
