import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { SpendingService } from '../../services/spending.service';

const ICONS = [
  { value: 'savings',         label: 'Savings'    },
  { value: 'flight_takeoff',  label: 'Travel'     },
  { value: 'home',            label: 'Home'       },
  { value: 'directions_car',  label: 'Car'        },
  { value: 'school',          label: 'Education'  },
  { value: 'devices',         label: 'Tech'       },
  { value: 'favorite',        label: 'Health'     },
  { value: 'beach_access',    label: 'Vacation'   },
  { value: 'shopping_bag',    label: 'Shopping'   },
  { value: 'restaurant',      label: 'Food'       },
  { value: 'sports_esports',  label: 'Gaming'     },
  { value: 'fitness_center',  label: 'Fitness'    },
  { value: 'diamond',         label: 'Luxury'     },
  { value: 'child_care',      label: 'Family'     },
  { value: 'business_center', label: 'Business'   },
  { value: 'celebration',     label: 'Event'      },
];

const COLORS = [
  '#68558d', '#366859', '#3b82f6', '#ec4899',
  '#f59e0b', '#15803d', '#0891b2', '#7c3aed',
  '#dc2626', '#78565f', '#1f2937', '#d97706',
];

@Component({
  selector: 'app-new-savings',
  imports: [RouterLink],
  templateUrl: './new-savings.html',
  styleUrl:    './new-savings.scss',
})
export class NewSavings implements OnInit {
  private svc    = inject(SpendingService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  // Edit mode
  editId   = signal<string | null>(null);
  isEdit   = computed(() => !!this.editId());

  // Form fields
  name         = signal('');
  targetAmount = signal('');
  deadline     = signal('');
  icon         = signal('savings');
  color        = signal('#68558d');
  notes        = signal('');
  status       = signal<'active' | 'paused' | 'done'>('active');

  saving   = signal(false);
  errorMsg = signal('');

  readonly ICONS  = ICONS;
  readonly COLORS = COLORS;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      this.svc.getSavingsGoals().subscribe(goals => {
        const g = goals.find(g => g.id === id);
        if (!g) return;
        this.name.set(g.name);
        this.targetAmount.set(String(g.target_amount));
        this.deadline.set(g.deadline ? this.ds(g.deadline) : '');
        this.icon.set(g.icon);
        this.color.set(g.color);
        this.notes.set(g.notes ?? '');
        this.status.set(g.status);
      });
    }
  }

  private ds(d: any): string {
    if (!d) return '';
    if (d instanceof Date) return d.toISOString().substring(0, 10);
    return String(d).substring(0, 10);
  }

  // ── Computed preview ────────────────────────────────────────
  amountDisplay = computed(() => {
    const v = parseFloat(this.targetAmount());
    if (isNaN(v)) return '$0.00';
    return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });

  deadlineDisplay = computed(() => {
    if (!this.deadline()) return 'No deadline';
    return new Date(this.deadline() + 'T12:00:00')
      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  monthsLeft = computed(() => {
    if (!this.deadline()) return null;
    const dl  = new Date(this.deadline() + 'T12:00:00');
    const now = new Date();
    return (dl.getFullYear() - now.getFullYear()) * 12 + (dl.getMonth() - now.getMonth());
  });

  monthlyNeeded = computed(() => {
    const t  = parseFloat(this.targetAmount());
    const ml = this.monthsLeft();
    if (!t || isNaN(t)) return null;
    if (ml === null || ml <= 0) return null;
    return t / ml;
  });

  gradientStyle = computed(() =>
    `linear-gradient(135deg, ${this.color()}, ${this.color()}bb)`
  );

  isValid = computed(() =>
    this.name().trim().length > 0 && parseFloat(this.targetAmount()) > 0
  );

  // ── Icon helper (label) ─────────────────────────────────────
  iconLabel = computed(() =>
    ICONS.find(i => i.value === this.icon())?.label ?? 'Savings'
  );

  fmt(n: number) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ── Save ────────────────────────────────────────────────────
  save() {
    if (!this.isValid() || this.saving()) return;
    this.saving.set(true);
    this.errorMsg.set('');

    const body = {
      name:          this.name().trim(),
      target_amount: parseFloat(this.targetAmount()),
      deadline:      this.deadline() || undefined,
      icon:          this.icon(),
      color:         this.color(),
      notes:         this.notes().trim() || undefined,
      status:        this.status(),
    };

    const req$ = this.isEdit()
      ? this.svc.updateSavingsGoal(this.editId()!, body)
      : this.svc.createSavingsGoal(body);

    req$.subscribe({
      next: () => this.router.navigateByUrl('/savings'),
      error: (e) => {
        this.errorMsg.set(e?.error?.error ?? 'Failed to save. Try again.');
        this.saving.set(false);
      },
    });
  }
}
