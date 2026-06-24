import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PurchasesService, PurchaseItem, PurchaseHistoryItem, SubcategoryCompare } from '@app/services/purchases.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-purchase-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './purchase-detail.html',
  styleUrl: './purchase-detail.scss',
})
export class PurchaseDetail implements OnInit {
  Math = Math;
  private svc = inject(PurchasesService);
  private route = inject(ActivatedRoute);

  item = signal<PurchaseItem | null>(null);
  history = signal<PurchaseHistoryItem[]>([]);
  compare = signal<SubcategoryCompare | null>(null);
  loading = signal(true);

  // Computed
  avgPrice = computed(() => this.compare()?.stats?.avg_price ?? 0);
  avgDays = computed(() => this.compare()?.stats?.avg_days ?? 0);
  avgCostDay = computed(() => this.compare()?.stats?.avg_cost_per_day ?? 0);
  avgCostMonth = computed(() => this.compare()?.stats?.avg_cost_per_month ?? 0);
  timesPurchased = computed(() => this.compare()?.stats?.times_purchased ?? 0);
  comparisonItems = computed(() => this.compare()?.items ?? []);
  maxPrice = computed(() => Math.max(...this.comparisonItems().map(i => i.price), 1));

  // Chart for price vs duration
  chartPoints = computed(() => {
    const items = this.comparisonItems();
    if (items.length < 2) return '';
    const w = 100, maxDur = Math.max(...items.map(i => i.duration_days || 0), 1);
    const maxP = this.maxPrice();
    return items.map((item, i) => {
      const x = (i / Math.max(items.length - 1, 1)) * w;
      const y = 90 - ((item.price / maxP) * 80);
      return `${x},${y}`;
    }).join(' ');
  });

  // Usage over time (cumulative)
  usageData = computed(() => {
    const items = [...this.comparisonItems()].sort((a, b) => a.purchase_date.localeCompare(b.purchase_date));
    if (!items.length) return [];
    let cum = 0;
    return items.map(item => {
      cum += item.price;
      return { ...item, cumulative: cum };
    });
  });

  maxCumulative = computed(() => Math.max(...this.usageData().map(d => d.cumulative), 1));

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loading.set(true);
    this.svc.getItem(id).subscribe(item => {
      this.item.set(item);
      this.history.set(item.history || []);
      if (item.subcategory_id) {
        this.svc.compareSubcategory(item.subcategory_id).subscribe(c => this.compare.set(c));
      }
      this.loading.set(false);
    });
  }

  markFinished() {
    const id = this.item()?.id;
    if (!id) return;
    this.svc.updateItem(id, { finished_date: new Date().toISOString().split('T')[0] }).subscribe(() => {
      this.item.update(i => i ? { ...i, finished_date: new Date().toISOString().split('T')[0] } : null);
    });
  }
}
