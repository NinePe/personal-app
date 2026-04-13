import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpendingService, LoansSummary, LoanPersonSummary } from '../../services/spending.service';

type FilterKind = 'all' | 'lent' | 'borrowed';

@Component({
  selector: 'app-loans',
  imports: [RouterLink],
  templateUrl: './loans.html',
  styleUrl: './loans.scss',
})
export class Loans implements OnInit {
  private svc = inject(SpendingService);

  summary = signal<LoansSummary | null>(null);
  loading = signal(true);
  filter  = signal<FilterKind>('all');

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getLoansSummary().subscribe(s => {
      this.summary.set(s);
      this.loading.set(false);
    });
  }

  filteredPeople = computed(() => {
    const people = this.summary()?.people ?? [];
    const f = this.filter();
    if (f === 'lent')     return people.filter(p => +p.balance > 0);
    if (f === 'borrowed') return people.filter(p => +p.balance < 0);
    return people;
  });

  totalOwedToMe = computed(() => parseFloat(this.summary()?.totals.total_owed_to_me ?? '0'));
  totalIOwe     = computed(() => parseFloat(this.summary()?.totals.total_i_owe     ?? '0'));
  netWorth      = computed(() => this.totalOwedToMe() - this.totalIOwe());

  isLent(p: LoanPersonSummary)     { return +p.balance > 0; }
  isBorrowed(p: LoanPersonSummary) { return +p.balance < 0; }

  absBalance(p: LoanPersonSummary) { return Math.abs(+p.balance); }

  initial(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  fmt(n: number | string) {
    const v = parseFloat(String(n ?? 0));
    return '$' + (isNaN(v) ? 0 : v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  fmtDate(d: any) {
    if (!d) return '';
    const str = String(d).substring(0, 10);
    return new Date(str + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
