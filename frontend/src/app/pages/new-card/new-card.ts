import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SpendingService, Bank, CARD_COLORS } from '../../services/spending.service';

type CardType = 'credit' | 'debit';

@Component({
  selector: 'app-new-card',
  imports: [FormsModule, RouterLink],
  templateUrl: './new-card.html',
  styleUrl: './new-card.scss',
})
export class NewCard implements OnInit {
  private svc    = inject(SpendingService);
  private router = inject(Router);

  banks = signal<Bank[]>([]);

  readonly CARD_COLORS = CARD_COLORS;
  readonly colorKeys   = Object.keys(CARD_COLORS);

  // Form fields
  cardType        = signal<CardType>('credit');
  selectedColor   = signal('purple');
  bankId          = signal('');
  cardName        = signal('');
  holderName      = signal('');
  lastFour        = signal('');
  creditLimit     = signal('');
  availableCredit = signal('');
  billingDay      = signal('1');
  paymentDay      = signal('15');

  saving  = signal(false);
  errorMsg = signal('');

  isCredit = computed(() => this.cardType() === 'credit');

  previewGradient = computed(() => {
    const c = this.CARD_COLORS[this.selectedColor()] ?? this.CARD_COLORS['purple'];
    return `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)`;
  });

  // Live card preview
  previewNumber  = computed(() => {
    const l = this.lastFour().replace(/\D/g, '').slice(0, 4);
    return '•••• •••• •••• ' + (l.padEnd(4, '·'));
  });
  previewHolder  = computed(() => this.holderName().toUpperCase() || 'CARD HOLDER');
  previewLimit   = computed(() => {
    const v = parseFloat(this.creditLimit());
    return isNaN(v) ? '$0.00' : '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2 });
  });
  previewBank    = computed(() => {
    const b = this.banks().find(b => b.id === this.bankId());
    return b?.name ?? 'Bank';
  });

  ngOnInit() {
    this.svc.getBanks().subscribe(b => this.banks.set(b));
  }

  setType(t: CardType) {
    this.cardType.set(t);
  }

  isValid() {
    return this.cardName().trim().length > 0 &&
           this.holderName().trim().length > 0 &&
           this.lastFour().replace(/\D/g,'').length === 4;
  }

  save() {
    if (!this.isValid() || this.saving()) return;
    this.saving.set(true);
    this.errorMsg.set('');

    const body: any = {
      name:         this.cardName().trim(),
      type:         this.cardType(),
      color:        this.selectedColor(),
      bank_id:      this.bankId() || undefined,
      last_four:    this.lastFour().replace(/\D/g,'').slice(0, 4),
      holder_name:  this.holderName().trim(),
    };

    if (this.isCredit()) {
      body.credit_limit       = parseFloat(this.creditLimit())   || null;
      body.available_credit   = parseFloat(this.availableCredit()) || null;
      body.billing_cycle_day  = parseInt(this.billingDay())   || null;
      body.payment_due_day    = parseInt(this.paymentDay())   || null;
    }

    this.svc.createCard(body).subscribe({
      next: () => this.router.navigate(['/payments']),
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(err.error?.error ?? 'Error creating card');
      },
    });
  }
}
