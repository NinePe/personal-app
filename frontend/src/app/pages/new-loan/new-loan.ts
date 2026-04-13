import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  SpendingService, Person, Card, NewLoan, LoanPersonSummary, LoansSummary
} from '../../services/spending.service';

@Component({
  selector: 'app-new-loan',
  imports: [RouterLink],
  templateUrl: './new-loan.html',
  styleUrl: './new-loan.scss',
})
export class NewLoanPage implements OnInit {
  private svc    = inject(SpendingService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  // ── Form state ────────────────────────────────────
  direction        = signal<'i_lent' | 'i_borrowed'>('i_lent');
  amount           = signal<number | null>(null);
  personId         = signal<string | null>(null);
  transactionDate  = signal(new Date().toISOString().substring(0, 10));
  description      = signal('');
  cardId           = signal<string | null>(null);

  // ── Data ──────────────────────────────────────────
  people       = signal<Person[]>([]);
  cards        = signal<Card[]>([]);
  loansSummary = signal<LoansSummary | null>(null);

  loading = signal(true);
  saving  = signal(false);
  error   = signal('');

  editId = signal<string | null>(null);
  isEdit = computed(() => !!this.editId());

  // Person search
  personQuery = signal('');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    forkJoin({
      people:  this.svc.getPeople(),
      cards:   this.svc.getCards(),
      summary: this.svc.getLoansSummary(),
    }).subscribe(({ people, cards, summary }) => {
      this.people.set(people);
      this.cards.set(cards);
      this.loansSummary.set(summary);

      if (id) {
        this.editId.set(id);
        this.svc.getLoanById(id).subscribe(loan => {
          this.direction.set(loan.direction);
          this.amount.set(+loan.amount);
          this.personId.set(loan.person_id);
          this.transactionDate.set(String(loan.transaction_date).substring(0, 10));
          this.description.set(loan.description ?? '');
          this.cardId.set(loan.card_id ?? null);
          this.loading.set(false);
        });
      } else {
        this.loading.set(false);
      }
    });
  }

  // ── Computed ──────────────────────────────────────
  filteredPeople = computed(() => {
    const q = this.personQuery().toLowerCase().trim();
    if (!q) return this.people();
    return this.people().filter(p => p.name.toLowerCase().includes(q));
  });

  selectedPerson = computed(() =>
    this.people().find(p => p.id === this.personId()) ?? null
  );

  // Current balance with the selected person (before this transaction)
  currentBalance = computed(() => {
    const pid = this.personId();
    if (!pid) return 0;
    const row = this.loansSummary()?.people.find(p => p.id === pid);
    return row ? parseFloat(row.balance) : 0;
  });

  // Is this transaction a micropayment? i.e. it will REDUCE an existing opposite balance.
  // If I'm lending and I already owe them (balance < 0), this is a repayment.
  // If I'm borrowing and they already owe me (balance > 0), this is their repayment.
  isMicropayment = computed(() => {
    const bal = this.currentBalance();
    const dir = this.direction();
    if (bal === 0) return false;
    if (dir === 'i_lent'     && bal < 0) return true;  // paying back my debt
    if (dir === 'i_borrowed' && bal > 0) return true;  // they're paying me back
    return false;
  });

  // Projected balance after saving this transaction
  projectedBalance = computed(() => {
    const bal = this.currentBalance();
    const amt = this.amount() ?? 0;
    return this.direction() === 'i_lent' ? bal + amt : bal - amt;
  });

  selectedCard = computed(() =>
    this.cards().find(c => c.id === this.cardId()) ?? null
  );

  canSave = computed(() =>
    !!this.personId() && (this.amount() ?? 0) > 0 && !!this.transactionDate()
  );

  // ── Actions ───────────────────────────────────────
  setDirection(d: 'i_lent' | 'i_borrowed') { this.direction.set(d); }

  selectPerson(p: Person) { this.personId.set(p.id); }

  setAmount(val: string) {
    const n = parseFloat(val);
    this.amount.set(isNaN(n) ? null : n);
  }

  save() {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.error.set('');

    const body: NewLoan = {
      person_id:        this.personId()!,
      direction:        this.direction(),
      amount:           this.amount()!,
      description:      this.description() || undefined,
      transaction_date: this.transactionDate(),
      card_id:          this.cardId() || null,
    };

    const obs = this.isEdit()
      ? this.svc.updateLoan(this.editId()!, body)
      : this.svc.createLoan(body);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/loans']);
      },
      error: (e) => {
        this.error.set(e?.error?.error || 'Failed to save transaction');
        this.saving.set(false);
      },
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
}
