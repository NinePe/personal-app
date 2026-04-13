import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpendingService, ProjectionGrid, ProjectionLine } from '../../services/spending.service';

@Component({
  selector: 'app-projections',
  imports: [RouterLink],
  templateUrl: './projections.html',
  styleUrl: './projections.scss',
})
export class Projections implements OnInit {
  private svc = inject(SpendingService);

  grid      = signal<ProjectionGrid | null>(null);
  year      = signal(new Date().getFullYear());
  loading   = signal(true);

  // Map of "{lineId}-{month}" → amount for O(1) lookup + editing
  cells     = signal<Map<string, number>>(new Map());

  // UI state
  openMenuMonth = signal<number | null>(null);
  editingLineId = signal<string | null>(null);
  editingName   = signal('');
  showAddForm   = signal<'income' | 'expense' | null>(null);
  newLineName   = signal('');

  readonly MONTHS = [
    { m: 1,  label: 'Jan'  }, { m: 2,  label: 'Feb'  }, { m: 3,  label: 'Mar'  },
    { m: 4,  label: 'Apr'  }, { m: 5,  label: 'May'  }, { m: 6,  label: 'Jun'  },
    { m: 7,  label: 'Jul'  }, { m: 8,  label: 'Aug'  }, { m: 9,  label: 'Sep'  },
    { m: 10, label: 'Oct'  }, { m: 11, label: 'Nov'  }, { m: 12, label: 'Dec'  },
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getProjections(this.year()).subscribe(g => {
      this.grid.set(g);
      // Build the cells map
      const map = new Map<string, number>();
      g.values.forEach(v => map.set(this.key(v.line_id, v.month), +v.amount));
      // Inject auto values (Cuota TC)
      Object.entries(g.autoValues || {}).forEach(([lineId, monthMap]) => {
        Object.entries(monthMap).forEach(([m, amt]) => {
          map.set(this.key(lineId, +m), +amt);
        });
      });
      this.cells.set(map);
      this.loading.set(false);
    });
  }

  key(lineId: string, month: number) { return `${lineId}-${month}`; }

  // ── Computed sections ─────────────────────────────
  incomeLines  = computed(() => this.grid()?.lines.filter(l => l.kind === 'income')  ?? []);
  expenseLines = computed(() => this.grid()?.lines.filter(l => l.kind === 'expense') ?? []);

  cellValue(lineId: string, month: number): number {
    return this.cells().get(this.key(lineId, month)) ?? 0;
  }

  monthIncomeTotal(month: number): number {
    return this.incomeLines().reduce((s, l) => s + this.cellValue(l.id, month), 0);
  }
  monthExpenseTotal(month: number): number {
    return this.expenseLines().reduce((s, l) => s + this.cellValue(l.id, month), 0);
  }
  monthNet(month: number): number {
    return this.monthIncomeTotal(month) - this.monthExpenseTotal(month);
  }

  yearTotalIncome  = computed(() => this.MONTHS.reduce((s, { m }) => s + this.monthIncomeTotal(m),  0));
  yearTotalExpense = computed(() => this.MONTHS.reduce((s, { m }) => s + this.monthExpenseTotal(m), 0));
  yearNet          = computed(() => this.yearTotalIncome() - this.yearTotalExpense());

  rowTotal(lineId: string): number {
    return this.MONTHS.reduce((s, { m }) => s + this.cellValue(lineId, m), 0);
  }

  // Running cumulative net balance: sum of monthNet(1..month)
  cumulativeNet(month: number): number {
    let sum = 0;
    for (let m = 1; m <= month; m++) sum += this.monthNet(m);
    return sum;
  }

  // ── Cell editing ─────────────────────────────────
  onCellChange(line: ProjectionLine, month: number, value: string) {
    if (line.is_auto) return; // auto rows are read-only
    const amount = parseFloat(value) || 0;
    // Optimistic update
    this.cells.update(map => {
      const next = new Map(map);
      next.set(this.key(line.id, month), amount);
      return next;
    });
    this.svc.setProjectionValue({
      line_id: line.id, year: this.year(), month, amount,
    }).subscribe();
  }

  // ── Year navigation ──────────────────────────────
  prevYear() { this.year.update(y => y - 1); this.load(); }
  nextYear() { this.year.update(y => y + 1); this.load(); }

  // ── Month actions ────────────────────────────────
  toggleMenu(month: number) {
    this.openMenuMonth.update(cur => cur === month ? null : month);
  }

  cloneToNext(month: number) {
    const dstMonth = month === 12 ? 1 : month + 1;
    const dstYear  = month === 12 ? this.year() + 1 : this.year();
    this.svc.cloneProjectionMonth({
      srcYear: this.year(), srcMonth: month, dstYear, dstMonth,
    }).subscribe(() => {
      if (dstYear === this.year()) this.load();
      else this.openMenuMonth.set(null);
    });
    this.openMenuMonth.set(null);
  }

  cloneToAllRemaining(month: number) {
    // Clones month → all subsequent months in the current year
    const src = month;
    const requests = [];
    for (let dst = month + 1; dst <= 12; dst++) {
      requests.push(this.svc.cloneProjectionMonth({
        srcYear: this.year(), srcMonth: src, dstYear: this.year(), dstMonth: dst,
      }));
    }
    // Fire them sequentially-ish (we just subscribe to all; last one reloads)
    let pending = requests.length;
    if (pending === 0) { this.openMenuMonth.set(null); return; }
    requests.forEach(r => r.subscribe(() => {
      if (--pending === 0) this.load();
    }));
    this.openMenuMonth.set(null);
  }

  clearMonth(month: number) {
    if (!confirm(`Clear all values for ${this.MONTHS[month - 1].label} ${this.year()}?`)) return;
    this.svc.clearProjectionMonth(this.year(), month).subscribe(() => this.load());
    this.openMenuMonth.set(null);
  }

  // ── Row actions ──────────────────────────────────
  startEditLine(line: ProjectionLine) {
    if (line.is_auto) return;
    this.editingLineId.set(line.id);
    this.editingName.set(line.name);
  }

  saveEditLine() {
    const id = this.editingLineId();
    const name = this.editingName().trim();
    if (!id || !name) { this.cancelEditLine(); return; }
    this.svc.updateProjectionLine(id, { name }).subscribe(() => {
      this.grid.update(g => {
        if (!g) return g;
        return { ...g, lines: g.lines.map(l => l.id === id ? { ...l, name } : l) };
      });
      this.editingLineId.set(null);
    });
  }

  cancelEditLine() { this.editingLineId.set(null); }

  deleteLine(line: ProjectionLine) {
    if (line.is_auto) return;
    if (!confirm(`Delete "${line.name}" and all its values?`)) return;
    this.svc.deleteProjectionLine(line.id).subscribe(() => {
      this.grid.update(g => {
        if (!g) return g;
        return { ...g, lines: g.lines.filter(l => l.id !== line.id) };
      });
      // Remove its cells too
      this.cells.update(map => {
        const next = new Map(map);
        for (const k of [...next.keys()]) if (k.startsWith(line.id + '-')) next.delete(k);
        return next;
      });
    });
  }

  // ── Add row form ─────────────────────────────────
  openAdd(kind: 'income' | 'expense') {
    this.showAddForm.set(kind);
    this.newLineName.set('');
  }

  saveNewLine() {
    const kind = this.showAddForm();
    const name = this.newLineName().trim();
    if (!kind || !name) return;
    const nextSort = (this.grid()?.lines
      .filter(l => l.kind === kind)
      .reduce((m, l) => Math.max(m, l.sort_order), 0) ?? 0) + 1;
    this.svc.createProjectionLine({ kind, name, sort_order: nextSort }).subscribe(line => {
      this.grid.update(g => g ? { ...g, lines: [...g.lines, line] } : g);
      this.showAddForm.set(null);
      this.newLineName.set('');
    });
  }

  cancelAdd() { this.showAddForm.set(null); }

  // ── Helpers ──────────────────────────────────────
  fmt(n: number): string {
    if (!n && n !== 0) return '';
    if (n === 0) return '0';
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  fmtMoney(n: number): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  isCurrentMonth(month: number): boolean {
    const now = new Date();
    return month === now.getMonth() + 1 && this.year() === now.getFullYear();
  }
}
