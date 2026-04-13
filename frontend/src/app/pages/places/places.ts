import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpendingService, PlaceStat, Category } from '../../services/spending.service';

type FilterMode = 'month' | 'year' | 'all' | 'custom';

@Component({
  selector: 'app-places',
  imports: [RouterLink],
  templateUrl: './places.html',
  styleUrl: './places.scss',
})
export class Places implements OnInit {
  private svc = inject(SpendingService);

  places     = signal<PlaceStat[]>([]);
  categories = signal<Category[]>([]);
  loading    = signal(true);
  filter     = signal<FilterMode>('month');
  customFrom = signal('');
  customTo   = signal('');
  search     = signal('');
  activeCategory = signal<string | null>(null);

  ngOnInit() {
    this.svc.getCategories().subscribe(cats => this.categories.set(cats));
    this.load();
  }

  load() {
    this.loading.set(true);
    const f = this.filter();
    this.svc.getPlaceStats(
      f,
      f === 'custom' ? this.customFrom() : undefined,
      f === 'custom' ? this.customTo()   : undefined,
    ).subscribe(data => {
      this.places.set(data);
      this.loading.set(false);
    });
  }

  setFilter(f: FilterMode) {
    this.filter.set(f);
    if (f !== 'custom') this.load();
  }

  applyCustom() { if (this.customFrom() && this.customTo()) this.load(); }

  filtered = computed(() => {
    let list = this.places();
    const q = this.search().toLowerCase();
    const cat = this.activeCategory();
    if (q)   list = list.filter(p => p.name.toLowerCase().includes(q));
    if (cat) list = list.filter(p => p.category === cat);
    return list;
  });

  totalSpent = computed(() =>
    this.filtered().reduce((s, p) => s + parseFloat(p.total_spent || '0'), 0)
  );

  toggleCategory(name: string) {
    this.activeCategory.set(this.activeCategory() === name ? null : name);
  }

  deletePlace(id: string) {
    if (!confirm('Delete this place?')) return;
    this.svc.deletePlace(id).subscribe(() =>
      this.places.update(list => list.filter(p => p.id !== id))
    );
  }

  categoryMeta(name?: string): { icon: string; color: string; name: string } {
    return this.categories().find(c => c.name === name)
      ?? { icon: 'location_on', color: '#8373a0', name: name ?? 'Other' };
  }

  fmt(n: number | string) {
    const v = parseFloat(String(n));
    return '$' + (isNaN(v) ? '0' : v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  filterLabel = computed(() => {
    switch (this.filter()) {
      case 'month':  return 'This Month';
      case 'year':   return 'This Year';
      case 'all':    return 'All Time';
      case 'custom': return `${this.customFrom()} → ${this.customTo()}`;
    }
  });

  formatLastVisit(date?: string): string {
    if (!date) return 'No visits';
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7)   return `${diff} days ago`;
    if (diff < 30)  return `${Math.floor(diff / 7)} week${diff >= 14 ? 's' : ''} ago`;
    if (diff < 365) return `${Math.floor(diff / 30)} month${diff >= 60 ? 's' : ''} ago`;
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
}
