import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PurchasesService, PurchaseStats, PredictionGroup, PurchaseItem } from '@app/services/purchases.service';

@Component({
  selector: 'app-purchases-dashboard',
  imports: [RouterLink],
  templateUrl: './purchases-dashboard.html',
  styleUrl: './purchases-dashboard.scss',
})
export class PurchasesDashboard implements OnInit {
  private svc = inject(PurchasesService);

  stats = signal<PurchaseStats | null>(null);
  predictions = signal<PredictionGroup[]>([]);
  items = signal<PurchaseItem[]>([]);
  loading = signal(true);
  filter = signal<'all' | 'active' | 'finished'>('all');

  // Computed
  activeCount = computed(() => this.stats()?.totals?.active_items ?? 0);
  spentMonth = computed(() => this.stats()?.totals?.spent_this_month ?? 0);
  spentLast  = computed(() => this.stats()?.totals?.spent_last_month ?? 0);
  trend = computed(() => {
    const a = this.spentMonth(), b = this.spentLast();
    if (!b) return 0;
    return ((a - b) / b) * 100;
  });

  runningOut = computed(() => this.predictions().find(p => p.type === 'running_out')?.items ?? []);
  restock = computed(() => this.predictions().find(p => p.type === 'restock')?.items ?? []);
  bestValue = computed(() => this.predictions().find(p => p.type === 'best_value')?.items ?? []);
  priceTrends = computed(() => this.predictions().find(p => p.type === 'price_trends')?.items ?? []);

  byCategory = computed(() => this.stats()?.byCategory ?? []);
  bySubcategory = computed(() => this.stats()?.bySubcategory ?? []);
  monthly = computed(() => (this.stats()?.monthly ?? []).slice().reverse());
  maxMonthly = computed(() => Math.max(...this.monthly().map(m => m.total), 1));

  filteredItems = computed(() => {
    const f = this.filter();
    if (f === 'active') return this.items().filter(i => !i.finished_date);
    if (f === 'finished') return this.items().filter(i => i.finished_date);
    return this.items();
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    Promise.all([
      this.svc.getStats().toPromise(),
      this.svc.getPredictions().toPromise(),
      this.svc.getItems({ limit: 30 }).toPromise(),
    ]).then(([s, p, i]) => {
      this.stats.set(s as any); this.predictions.set(p as any); this.items.set(i as any);
      this.loading.set(false);
    });
  }

  setFilter(f: 'all' | 'active' | 'finished') { this.filter.set(f); }

  markFinished(id: string) {
    this.svc.updateItem(id, { finished_date: new Date().toISOString().split('T')[0] }).subscribe(() => this.load());
  }

  barH(v: number) { return `${(v / this.maxMonthly()) * 100}%`; }
}
