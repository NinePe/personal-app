import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CinemaService, CinemaStats, DailyBar, WatchHistoryItem } from '@app/services/cinema.service';

@Component({
  selector: 'app-cinema-dashboard',
  imports: [RouterLink],
  templateUrl: './cinema-dashboard.html',
  styleUrl: './cinema-dashboard.scss',
})
export class CinemaDashboard implements OnInit {
  private svc = inject(CinemaService);
  stats = signal<CinemaStats | null>(null);
  loading = signal(true);
  suggestions = signal<any[]>([]);
  daily = signal<DailyBar[]>([]);
  history = signal<WatchHistoryItem[]>([]);
  historyTotal = signal(0);
  historyPage = signal(1);
  period = signal<'week' | 'month' | 'year' | 'all'>('all');
  expanded = signal(false);

  maxVal = computed(() => Math.max(...this.daily().map(d => d.total_minutes), 1));

  barWidth = computed(() => {
    const n = this.daily().length;
    if (n <= 0) return '0px';
    if (n <= 3) return '100px';
    if (n <= 7) return '80px';
    if (n <= 14) return '55px';
    if (n <= 31) return '38px';
    return '30px';
  });

  // SVG line chart points
  linePoints = computed(() => {
    const data = this.daily();
    if (!data.length) return '';
    const w = 100, max = this.maxVal();
    const yMin = 10, yMax = 90;
    return data.map((d, i) => {
      const x = data.length === 1 ? 50 : (i / (data.length - 1)) * w;
      const y = yMax - (d.total_minutes / max) * (yMax - yMin);
      return `${x},${y}`;
    }).join(' ');
  });

  areaPoints = computed(() => {
    const pts = this.linePoints();
    if (!pts) return '';
    const last = pts.split(' ').pop()!;
    return `0,90 ${pts} ${last.split(',')[0]},90`;
  });

  ngOnInit() {
    this.svc.getStats().subscribe(s => { this.stats.set(s); this.loading.set(false); });
    this.svc.getSuggestions().subscribe(r => this.suggestions.set(r.suggestions));
    this.loadHistory(1);
  }

  setPeriod(p: string) {
    this.period.set(p as any);
    this.loadHistory(1);
  }

  loadHistory(page: number) {
    this.historyPage.set(page);
    this.svc.getHistory(page, 10, this.period()).subscribe(h => {
      this.daily.set(h.daily);
      this.history.set(h.history);
      this.historyTotal.set(h.total);
    });
  }

  ceil(v: number) { return Math.ceil(v); }
  dotX(i: number) { return this.daily().length === 1 ? 50 : (i / (this.daily().length - 1)) * 100; }
  dotY(min: number) { return 90 - (min / this.maxVal()) * 80; }
  dotLabel(min: number) { return (min / 60).toFixed(1) + 'h'; }
  toggleExpand() { this.expanded.update(v => !v); }

  hours(v: number) { return (v / 60).toFixed(0); }
  pct(part: number, total: number) { return total ? Math.round(part / total * 100) : 0; }
  fmtDate(d: string) { if (!d) return ''; return new Date(d + 'T12:00:00').toLocaleDateString('es-PE', { month: 'short', day: 'numeric' }); }
  fmtRuntime(min?: number) { if (!min) return ''; const h = Math.floor(min / 60); const m = min % 60; return h > 0 ? `${h}h ${m}m` : `${m}m`; }
  isEpisode(i: WatchHistoryItem) { return i.media_type === 'episode'; }
  totalPages() { return Math.ceil(this.historyTotal() / 10); }
}
