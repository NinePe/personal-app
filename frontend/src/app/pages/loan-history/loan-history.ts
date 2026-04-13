import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { SpendingService, LoanHistory, Loan } from '../../services/spending.service';

@Component({
  selector: 'app-loan-history',
  imports: [RouterLink],
  templateUrl: './loan-history.html',
  styleUrl: './loan-history.scss',
})
export class LoanHistoryPage implements OnInit {
  private svc    = inject(SpendingService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  history = signal<LoanHistory | null>(null);
  loading = signal(true);

  ngOnInit() {
    const personId = this.route.snapshot.paramMap.get('personId');
    if (!personId) return;
    this.load(personId);
  }

  load(personId: string) {
    this.loading.set(true);
    this.svc.getLoanHistory(personId).subscribe(h => {
      this.history.set(h);
      this.loading.set(false);
    });
  }

  balance = computed(() => parseFloat(this.history()?.balance ?? '0'));
  absBalance = computed(() => Math.abs(this.balance()));
  direction = computed<'lent' | 'borrowed' | 'settled'>(() => {
    const b = this.balance();
    if (b > 0) return 'lent';
    if (b < 0) return 'borrowed';
    return 'settled';
  });

  // Running balance per transaction (newest first → walk from oldest)
  transactionsWithRunning = computed(() => {
    const txs = this.history()?.transactions ?? [];
    const sorted = [...txs].sort((a, b) => {
      const da = String(a.transaction_date), db = String(b.transaction_date);
      if (da !== db) return da.localeCompare(db);
      return String(a.created_at).localeCompare(String(b.created_at));
    });
    let running = 0;
    const withRun = sorted.map(t => {
      running += t.direction === 'i_lent' ? +t.amount : -(+t.amount);
      return { ...t, running };
    });
    // return newest first for display
    return withRun.reverse();
  });

  deleteTx(tx: Loan) {
    if (!confirm('Delete this transaction? The balance will be recalculated.')) return;
    this.svc.deleteLoan(tx.id).subscribe(() => {
      const personId = this.history()?.person.id;
      if (personId) this.load(personId);
    });
  }

  // ── Helpers ───────────────────────────────────────
  initial(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  fmt(n: number | string) {
    const v = parseFloat(String(n ?? 0));
    return '$' + (isNaN(v) ? 0 : Math.abs(v)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  fmtDate(d: any) {
    if (!d) return '';
    const str = String(d).substring(0, 10);
    return new Date(str + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
}
