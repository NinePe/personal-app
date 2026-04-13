import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  SpendingService, ExpenseType, Category, MonthlyBudget,
  MonthlyBudgetType, TrendPoint, Subcategory
} from '../../services/spending.service';

// ── Palette for chart lines ───────────────────────────────────
export const CHART_COLORS = [
  '#68558d','#366859','#78565f','#2563eb','#0891b2','#15803d','#f59e0b',
];

interface ActiveTypeRow {
  expense_type_id: string;
  name: string; icon: string; color: string;
  percentage: number;
}

interface ChartSeries { id: string; label: string; color: string; points: { x: number; y: number; val: number }[]; }

@Component({
  selector: 'app-budget',
  imports: [RouterLink, FormsModule],
  templateUrl: './budget.html',
  styleUrl: './budget.scss',
})
export class Budget implements OnInit {
  private svc = inject(SpendingService);

  // ── State ─────────────────────────────────────────────────
  expenseTypes   = signal<ExpenseType[]>([]);
  categories     = signal<Category[]>([]);
  monthlyBudgets = signal<MonthlyBudget[]>([]);
  trendRaw       = signal<TrendPoint[]>([]);

  loading     = signal(true);
  trendLoading = signal(false);

  // Trend date filter
  trendFilter  = signal<'6m' | '1y' | 'all' | 'custom'>('6m');
  trendFrom    = signal('');
  trendTo      = signal('');

  // Drill-down state
  selectedTypeId     = signal<string | null>(null);
  selectedCategoryId = signal<string | null>(null);

  // Config section state
  configMonth  = signal(new Date().getMonth() + 1);
  configYear   = signal(new Date().getFullYear());
  configSalary = signal<number>(0);
  activeTypes  = signal<ActiveTypeRow[]>([]);
  configSaving = signal(false);
  configError  = signal('');
  configSuccess = signal(false);

  // Category editing state
  editingCatId     = signal<string | null>(null);
  newSubName       = signal<string>('');
  addingSubForCat  = signal<string | null>(null);
  editingSubId     = signal<string | null>(null);
  editingSubName   = signal<string>('');
  showNewCatForm   = signal(false);
  newCatName       = signal('');
  newCatIcon       = signal('category');
  newCatColor      = signal('#68558d');
  newCatTypeId     = signal('');

  // New expense type form
  showNewTypeForm  = signal(false);
  newTypeName      = signal('');
  newTypeIcon      = signal('category');
  newTypeColor     = signal('#68558d');
  expandedTypeId   = signal<string | null>(null);

  readonly CHART_COLORS = CHART_COLORS;

  // Month labels
  MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  ngOnInit() {
    forkJoin([
      this.svc.getExpenseTypes(),
      this.svc.getCategories(),
      this.svc.getMonthlyBudgets(),
    ]).subscribe(([types, cats, budgets]) => {
      this.expenseTypes.set(types);
      this.categories.set(cats);
      this.monthlyBudgets.set(budgets);
      this.loading.set(false);
      this.loadTrends();
      this.loadConfigForMonth();
    });
  }

  setTrendFilter(f: '6m' | '1y' | 'all' | 'custom') {
    this.trendFilter.set(f);
    if (f !== 'custom') this.loadTrends();
  }

  applyTrendCustom() {
    if (this.trendFrom() && this.trendTo()) this.loadTrends();
  }

  // ── Trends ────────────────────────────────────────────────
  loadTrends() {
    this.trendLoading.set(true);
    const params: any = {};
    if (this.selectedCategoryId()) params.category_id = this.selectedCategoryId();
    else if (this.selectedTypeId()) params.expense_type_id = this.selectedTypeId();

    const f = this.trendFilter();
    if (f === '6m') {
      params.months = 6;
    } else if (f === '1y') {
      const y = new Date().getFullYear();
      params.from = `${y}-01-01`;
      params.to   = `${y}-12-31`;
    } else if (f === 'all') {
      params.from = '2000-01-01';
      params.to   = '2099-12-31';
    } else {
      if (!this.trendFrom() || !this.trendTo()) { this.trendLoading.set(false); return; }
      params.from = this.trendFrom();
      params.to   = this.trendTo();
    }

    this.svc.getBudgetTrends(params).subscribe(data => {
      this.trendRaw.set(data);
      this.trendLoading.set(false);
    });
  }

  selectType(id: string) {
    if (this.selectedTypeId() === id) {
      this.selectedTypeId.set(null);
      this.selectedCategoryId.set(null);
    } else {
      this.selectedTypeId.set(id);
      this.selectedCategoryId.set(null);
    }
    this.loadTrends();
  }

  selectCategory(id: string) {
    if (this.selectedCategoryId() === id) {
      this.selectedCategoryId.set(null);
    } else {
      this.selectedCategoryId.set(id);
    }
    this.loadTrends();
  }

  clearDrilldown() {
    this.selectedTypeId.set(null);
    this.selectedCategoryId.set(null);
    this.loadTrends();
  }

  // ── Chart computation ─────────────────────────────────────
  // Derive chart month axis from actual trend data (not hardcoded)
  chartMonths = computed<{ year: number; month: number; label: string }[]>(() => {
    const raw = this.trendRaw();
    if (!raw.length) {
      // fallback: last 6 months
      const result = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        result.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: this.MONTHS[d.getMonth()] });
      }
      return result;
    }
    // Build unique sorted (year, month) pairs from data
    const seen = new Set<string>();
    const pairs: { year: number; month: number }[] = [];
    for (const r of raw) {
      const key = `${r.year}-${r.month}`;
      if (!seen.has(key)) { seen.add(key); pairs.push({ year: r.year, month: r.month }); }
    }
    pairs.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    return pairs.map(p => ({ ...p, label: this.MONTHS[p.month - 1] }));
  });

  // SVG canvas constants  (wide viewBox to match the chart card aspect ratio)
  readonly VB_W     = 1000;
  readonly VB_H     = 320;
  readonly PLOT_X0  = 56;    // left edge of plot area (after y-labels)
  readonly PLOT_X1  = 980;   // right edge
  readonly PLOT_TOP = 18;    // top grid line y
  readonly BASELINE = 240;   // bottom grid line y (data y=0)

  chartSeries = computed<ChartSeries[]>(() => {
    const raw = this.trendRaw();
    const months = this.chartMonths();
    if (!raw.length) return [];

    // Group by series id
    const map = new Map<string, ChartSeries>();
    raw.forEach(r => {
      if (!map.has(r.id)) {
        const colorIdx = map.size % CHART_COLORS.length;
        map.set(r.id, {
          id: r.id, label: r.label,
          color: r.color || CHART_COLORS[colorIdx],
          points: [],
        });
      }
    });

    // Fill zero-values for missing months (in correct order)
    map.forEach(series => {
      months.forEach(m => {
        const pt = raw.find(r => r.id === series.id && r.year === m.year && r.month === m.month);
        series.points.push({ x: 0, y: 0, val: pt ? parseFloat(pt.total) : 0 });
      });
    });

    // Normalize y to SVG coords
    const allVals = [...map.values()].flatMap(s => s.points.map(p => p.val));
    const maxVal  = Math.max(...allVals, 1);
    const drawH   = this.BASELINE - this.PLOT_TOP;
    const plotW   = this.PLOT_X1 - this.PLOT_X0;
    const xStep   = plotW / Math.max(months.length - 1, 1);

    map.forEach(series => {
      series.points = series.points.map((p, i) => ({
        ...p,
        x: this.PLOT_X0 + i * xStep,
        y: this.BASELINE - (p.val / maxVal) * drawH,
      }));
    });

    return [...map.values()];
  });

  // Chart max value (explicitly computed once, avoid re-deriving in multiple places)
  chartMax = computed(() => {
    const allVals = this.trendRaw().map(r => parseFloat(r.total));
    return Math.max(...allVals, 1);
  });

  // Format number as compact money with commas, locale-independent
  private fmtCompact(n: number): string {
    if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000)     return '$' + (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    return '$' + Math.round(n).toString();
  }

  // 5 Y-axis gridline labels: max, 3/4, 1/2, 1/4, 0
  yAxisTicks = computed(() => {
    const max = this.chartMax();
    const drawH = this.BASELINE - this.PLOT_TOP;
    return [1, 0.75, 0.5, 0.25, 0].map(ratio => ({
      label: ratio === 0 ? '$0' : this.fmtCompact(max * ratio),
      y:     this.PLOT_TOP + (1 - ratio) * drawH,
    }));
  });

  // Smooth cubic-Bézier path derived from a Catmull-Rom spline.
  // Yields organic curves without overshoot.
  path(series: ChartSeries): string {
    const pts = series.points;
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    const tension = 0.22;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? pts[i + 1];
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }

  // Area path = curve + close back to baseline on both ends
  areaPath(series: ChartSeries): string {
    const pts = series.points;
    if (!pts.length) return '';
    const first = pts[0], last = pts[pts.length - 1];
    return this.path(series)
      + ` L ${last.x.toFixed(1)},${this.BASELINE}`
      + ` L ${first.x.toFixed(1)},${this.BASELINE} Z`;
  }

  chartXpos(index: number): number {
    const months = this.chartMonths();
    const plotW  = this.PLOT_X1 - this.PLOT_X0;
    const xStep  = plotW / Math.max(months.length - 1, 1);
    return this.PLOT_X0 + index * xStep;
  }

  // ── Config ────────────────────────────────────────────────
  loadConfigForMonth() {
    const m = this.configMonth(), y = this.configYear();
    const existing = this.monthlyBudgets().find(b => b.month === m && b.year === y);
    if (existing) {
      this.configSalary.set(Number(existing.salary));
      this.activeTypes.set(existing.types.map(t => ({
        expense_type_id: t.expense_type_id,
        name:  t.name  || this.expenseTypes().find(e => e.id === t.expense_type_id)?.name || '',
        icon:  t.icon  || this.expenseTypes().find(e => e.id === t.expense_type_id)?.icon || 'category',
        color: t.color || this.expenseTypes().find(e => e.id === t.expense_type_id)?.color || '#68558d',
        percentage: Number(t.percentage),
      })));
    } else {
      this.configSalary.set(0);
      this.activeTypes.set([]);
    }
  }

  percentageTotal = computed(() =>
    this.activeTypes().reduce((s, t) => s + (Number(t.percentage) || 0), 0)
  );

  isTypeActive(id: string) {
    return this.activeTypes().some(t => t.expense_type_id === id);
  }

  toggleType(type: ExpenseType) {
    if (this.isTypeActive(type.id)) {
      this.activeTypes.update(list => list.filter(t => t.expense_type_id !== type.id));
    } else {
      this.activeTypes.update(list => [...list, {
        expense_type_id: type.id,
        name: type.name, icon: type.icon, color: type.color,
        percentage: 0,
      }]);
    }
  }

  updatePct(id: string, val: number) {
    this.activeTypes.update(list =>
      list.map(t => t.expense_type_id === id ? { ...t, percentage: val } : t)
    );
  }

  salaryFor(row: ActiveTypeRow): number {
    return Math.round((row.percentage / 100) * this.configSalary());
  }

  saveConfig() {
    const total = this.percentageTotal();
    if (Math.abs(total - 100) > 0.01) {
      this.configError.set(`Percentages must sum to 100% (currently ${total.toFixed(1)}%)`);
      return;
    }
    this.configError.set('');
    this.configSaving.set(true);
    this.svc.saveMonthlyBudget({
      month: this.configMonth(), year: this.configYear(),
      salary: this.configSalary(),
      types: this.activeTypes().map(t => ({
        expense_type_id: t.expense_type_id, percentage: t.percentage,
      })),
    }).subscribe({
      next: () => {
        this.configSaving.set(false);
        this.configSuccess.set(true);
        setTimeout(() => this.configSuccess.set(false), 2500);
        this.svc.getMonthlyBudgets().subscribe(b => this.monthlyBudgets.set(b));
      },
      error: (e) => {
        this.configError.set(e?.error?.error || 'Save failed');
        this.configSaving.set(false);
      },
    });
  }

  loadBudgetRow(b: MonthlyBudget) {
    this.configMonth.set(b.month);
    this.configYear.set(b.year);
    this.loadConfigForMonth();
  }

  nextMonth() {
    let m = this.configMonth(), y = this.configYear();
    if (m === 12) { m = 1; y++; } else m++;
    this.configMonth.set(m); this.configYear.set(y);
    this.loadConfigForMonth();
  }

  prevMonth() {
    let m = this.configMonth(), y = this.configYear();
    if (m === 1) { m = 12; y--; } else m--;
    this.configMonth.set(m); this.configYear.set(y);
    this.loadConfigForMonth();
  }

  configMonthLabel = computed(() =>
    `${this.MONTHS[this.configMonth() - 1]} ${this.configYear()}`
  );

  // ── Category CRUD ─────────────────────────────────────────
  categoriesForType = computed(() => {
    const typeId = this.selectedTypeId();
    const cats = this.categories();
    if (!typeId) return cats;
    return cats.filter(c => c.expense_type_id === typeId);
  });

  addCategory() {
    const name = this.newCatName().trim();
    if (!name) return;
    this.svc.createCategory({
      name, icon: this.newCatIcon(), color: this.newCatColor(),
      expense_type_id: this.newCatTypeId() || undefined,
      sort_order: this.categories().length,
    }).subscribe(cat => {
      this.categories.update(list => [...list, { ...cat, subcategories: [] }]);
      this.showNewCatForm.set(false);
      this.newCatName.set(''); this.newCatIcon.set('category'); this.newCatColor.set('#68558d');
    });
  }

  deleteCategory(id: string) {
    if (!confirm('Delete this category? All associated expenses will lose their category link.')) return;
    this.svc.deleteCategory(id).subscribe(() =>
      this.categories.update(list => list.filter(c => c.id !== id))
    );
  }

  startAddSub(catId: string) {
    this.addingSubForCat.set(catId);
    this.newSubName.set('');
  }

  addSubcategory(catId: string) {
    const name = this.newSubName().trim();
    if (!name) return;
    const cat = this.categories().find(c => c.id === catId);
    this.svc.createSubcategory(catId, { name, sort_order: cat?.subcategories.length ?? 0 })
      .subscribe(sub => {
        this.categories.update(list => list.map(c =>
          c.id === catId ? { ...c, subcategories: [...c.subcategories, sub] } : c
        ));
        this.addingSubForCat.set(null);
        this.newSubName.set('');
      });
  }

  startEditSub(sub: Subcategory) {
    this.editingSubId.set(sub.id);
    this.editingSubName.set(sub.name);
  }

  saveEditSub(catId: string, subId: string) {
    const name = this.editingSubName().trim();
    if (!name) return;
    this.svc.updateSubcategory(subId, { name }).subscribe(updated => {
      this.categories.update(list => list.map(c =>
        c.id === catId
          ? { ...c, subcategories: c.subcategories.map(s => s.id === subId ? updated : s) }
          : c
      ));
      this.editingSubId.set(null);
    });
  }

  deleteSub(catId: string, subId: string) {
    this.svc.deleteSubcategory(subId).subscribe(() =>
      this.categories.update(list => list.map(c =>
        c.id === catId ? { ...c, subcategories: c.subcategories.filter(s => s.id !== subId) } : c
      ))
    );
  }

  // ── Expense Type ↔ Category linking ──────────────────────
  toggleExpanded(typeId: string) {
    this.expandedTypeId.set(this.expandedTypeId() === typeId ? null : typeId);
  }

  isCatInType(cat: Category, typeId: string): boolean {
    return cat.expense_type_id === typeId;
  }

  toggleCatForType(cat: Category, typeId: string) {
    const newTypeId = cat.expense_type_id === typeId ? undefined : typeId;
    this.svc.updateCategory(cat.id, { ...cat, expense_type_id: newTypeId }).subscribe(updated => {
      this.categories.update(list =>
        list.map(c => c.id === cat.id ? { ...c, expense_type_id: newTypeId } : c)
      );
    });
  }

  catsForType(typeId: string): Category[] {
    return this.categories().filter(c => c.expense_type_id === typeId);
  }

  unassignedCategories(): Category[] {
    return this.categories().filter(c => !c.expense_type_id);
  }

  // ── Expense Type CRUD ─────────────────────────────────────
  addExpenseType() {
    const name = this.newTypeName().trim();
    if (!name) return;
    this.svc.createExpenseType({
      name, icon: this.newTypeIcon(), color: this.newTypeColor(),
      sort_order: this.expenseTypes().length,
    }).subscribe(t => {
      this.expenseTypes.update(list => [...list, t]);
      this.showNewTypeForm.set(false);
      this.newTypeName.set(''); this.newTypeIcon.set('category'); this.newTypeColor.set('#68558d');
    });
  }

  deleteExpenseType(id: string) {
    if (!confirm('Delete this expense type?')) return;
    this.svc.deleteExpenseType(id).subscribe(() =>
      this.expenseTypes.update(list => list.filter(t => t.id !== id))
    );
  }

  // ── Helpers ───────────────────────────────────────────────
  fmt(n: number | string) {
    return '$' + parseFloat(String(n)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  fmtFull(n: number | string) {
    return '$' + parseFloat(String(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  monthName(m: number) { return this.MONTHS[m - 1]; }

  budgetForType(typeId: string, budget: MonthlyBudget): number {
    const t = budget.types.find(t => t.expense_type_id === typeId);
    return t ? (Number(t.percentage) / 100) * Number(budget.salary) : 0;
  }

  totalPctForBudget(b: MonthlyBudget): number {
    return b.types.reduce((s, t) => s + Number(t.percentage), 0);
  }

  TYPE_ICONS = ['bolt','auto_awesome','energy_savings_leaf','category','home','restaurant',
    'commute','local_hospital','school','fitness_center','shopping_bag','flight_takeoff',
    'devices','music_note','sports_esports','pets','child_care'];

  activeRowFor(typeId: string): ActiveTypeRow | undefined {
    return this.activeTypes().find(t => t.expense_type_id === typeId);
  }

  typeName(id: string): string {
    return this.expenseTypes().find(t => t.id === id)?.name ?? '';
  }

  catName(id: string): string {
    return this.categories().find(c => c.id === id)?.name ?? '';
  }

  countCatsForType(typeId: string): number {
    return this.categories().filter(c => c.expense_type_id === typeId).length;
  }

  readonly Math = Math;
}
