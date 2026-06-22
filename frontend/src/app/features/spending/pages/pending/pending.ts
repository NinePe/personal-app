import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PendingService, PendingExpense } from '@app/services/pending.service';

@Component({
  selector: 'app-pending',
  imports: [RouterLink],
  templateUrl: './pending.html',
  styleUrl: './pending.scss',
})
export class PendingPage implements OnInit {
  private svc = inject(PendingService);
  private router = inject(Router);

  pending = signal<PendingExpense[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.getPending().subscribe(items => {
      this.pending.set(items);
      this.loading.set(false);
    });
  }

  isIncome(item: PendingExpense) {
    return item.type === 'income';
  }

  process(item: PendingExpense) {
    if (item.type === 'income') {
      this.router.navigate(['/spending/new-income'], { queryParams: { pending: item.id } });
    } else {
      this.router.navigate(['/spending/new'], { queryParams: { pending: item.id } });
    }
  }

  ignore(item: PendingExpense) {
    this.svc.updateStatus(item.id, 'ignored').subscribe(() => this.load());
  }

  fmt(n: number | null | undefined) {
    const v = parseFloat(String(n ?? 0));
    return 'S/ ' + (isNaN(v) ? 0 : v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  fmtDate(d: string | null) {
    if (!d) return '';
    const dateStr = d.substring(0, 10);
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-PE', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
