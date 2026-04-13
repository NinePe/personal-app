import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpendingService, SavingsGoal } from '../../services/spending.service';

@Component({
  selector: 'app-savings',
  imports: [RouterLink],
  templateUrl: './savings.html',
  styleUrl:    './savings.scss',
})
export class Savings implements OnInit {
  private svc = inject(SpendingService);

  goals   = signal<SavingsGoal[]>([]);
  loading = signal(true);
  filter  = signal<'all' | 'active' | 'paused' | 'done'>('all');

  // Inline contribution form
  expandedId    = signal<string | null>(null);
  contribAmount = signal('');
  contribNote   = signal('');
  contribDate   = signal(new Date().toISOString().split('T')[0]);
  contribSaving = signal(false);

  ngOnInit() {
    this.svc.getSavingsGoals().subscribe(goals => {
      this.goals.set(goals);
      this.loading.set(false);
    });
  }

  // ── Computed ─────────────────────────────────────────────────
  filtered = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.goals() : this.goals().filter(g => g.status === f);
  });

  totalSaved = computed(() =>
    this.goals().reduce((s, g) => s + parseFloat(String(g.current_amount ?? 0)), 0)
  );

  totalTarget = computed(() =>
    this.goals().reduce((s, g) => s + parseFloat(String(g.target_amount)), 0)
  );

  overallPct = computed(() => {
    const t = this.totalTarget();
    return t > 0 ? Math.min(100, (this.totalSaved() / t) * 100) : 0;
  });

  counts = computed(() => ({
    all:    this.goals().length,
    active: this.goals().filter(g => g.status === 'active').length,
    paused: this.goals().filter(g => g.status === 'paused').length,
    done:   this.goals().filter(g => g.status === 'done').length,
  }));

  // ── Per-goal helpers ─────────────────────────────────────────
  pct(goal: SavingsGoal): number {
    const curr = parseFloat(String(goal.current_amount ?? 0));
    const tgt  = parseFloat(String(goal.target_amount));
    return tgt > 0 ? Math.min(100, (curr / tgt) * 100) : 0;
  }

  private ds(d: any): string {
    if (!d) return '';
    if (d instanceof Date) return d.toISOString().substring(0, 10);
    return String(d).substring(0, 10);
  }

  monthsLeft(goal: SavingsGoal): number | null {
    if (!goal.deadline) return null;
    const dl  = new Date(this.ds(goal.deadline) + 'T12:00:00');
    const now = new Date();
    const diff = (dl.getFullYear() - now.getFullYear()) * 12 + (dl.getMonth() - now.getMonth());
    return diff;
  }

  monthlyNeeded(goal: SavingsGoal): number {
    const remaining = parseFloat(String(goal.target_amount)) - parseFloat(String(goal.current_amount ?? 0));
    if (remaining <= 0) return 0;
    const ml = this.monthsLeft(goal);
    if (ml === null || ml <= 0) return remaining;
    return remaining / ml;
  }

  fmtDeadline(goal: SavingsGoal): string {
    if (!goal.deadline) return 'Sin fecha límite';
    return new Date(this.ds(goal.deadline) + 'T12:00:00')
      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  fmt(n: number | string | null | undefined) {
    const v = parseFloat(String(n ?? 0));
    return '$' + (isNaN(v) ? 0 : v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  gradientStyle(color: string) {
    return `linear-gradient(135deg, ${color}, ${color}bb)`;
  }

  tint(color: string) { return color + '18'; }

  // ── Contribution form ────────────────────────────────────────
  openContrib(goalId: string) {
    if (this.expandedId() === goalId) {
      this.expandedId.set(null);
    } else {
      this.expandedId.set(goalId);
      this.contribAmount.set('');
      this.contribNote.set('');
      this.contribDate.set(new Date().toISOString().split('T')[0]);
    }
  }

  saveContrib(goal: SavingsGoal) {
    const amt = parseFloat(this.contribAmount());
    if (!amt || amt <= 0) return;
    this.contribSaving.set(true);
    this.svc.addContribution(goal.id, {
      amount: amt,
      note: this.contribNote().trim() || undefined,
      contribution_date: this.contribDate(),
    }).subscribe({
      next: updated => {
        this.goals.update(list => list.map(g => g.id === updated.id ? updated : g));
        this.expandedId.set(null);
        this.contribSaving.set(false);
      },
      error: () => this.contribSaving.set(false),
    });
  }

  deleteGoal(id: string) {
    if (!confirm('¿Eliminar esta meta de ahorro?')) return;
    this.svc.deleteSavingsGoal(id).subscribe(() =>
      this.goals.update(list => list.filter(g => g.id !== id))
    );
  }

  statusLabel(s: string) {
    return s === 'active' ? 'Activa' : s === 'paused' ? 'Pausada' : 'Completada';
  }
}
