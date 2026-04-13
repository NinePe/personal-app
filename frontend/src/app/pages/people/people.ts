import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SpendingService, Person, PersonSplit } from '../../services/spending.service';

export const REL_COLORS: Record<string, { bg: string; text: string }> = {
  friend:       { bg: '#c7fce9', text: '#316354' },
  family:       { bg: '#ebe0ff', text: '#5c4980' },
  coworker:     { bg: '#dbeafe', text: '#1e3a8a' },
  organization: { bg: '#fef9c3', text: '#854d0e' },
  other:        { bg: '#f1f5f9', text: '#475569' },
};

export type DateFilter = 'month' | 'year' | 'all' | 'custom';

@Component({
  selector: 'app-people',
  imports: [RouterLink],
  templateUrl: './people.html',
  styleUrl: './people.scss',
})
export class People implements OnInit {
  private svc = inject(SpendingService);

  people      = signal<Person[]>([]);
  splitPeople = signal<PersonSplit[]>([]);
  loading     = signal(true);
  deletingId  = signal<string | null>(null);

  // ── Date filter state ─────────────────────────────
  activeFilter  = signal<DateFilter>('month');
  currentMonth  = new Date().getMonth() + 1;
  currentYear   = new Date().getFullYear();
  customFrom    = signal('');
  customTo      = signal('');

  readonly REL_COLORS = REL_COLORS;

  ngOnInit() {
    this.svc.getPeople().subscribe(people => {
      this.people.set(people);
      this.loadSplits();
    });
  }

  setFilter(f: DateFilter) {
    this.activeFilter.set(f);
    if (f !== 'custom') this.loadSplits();
  }

  applyCustom() {
    if (this.customFrom() && this.customTo()) this.loadSplits();
  }

  loadSplits() {
    this.loading.set(true);
    const f = this.activeFilter();
    let obs;

    if (f === 'month') {
      obs = this.svc.getPeopleSplit(this.currentMonth, this.currentYear);
    } else if (f === 'year') {
      obs = this.svc.getPeopleSplitByRange(`${this.currentYear}-01-01`, `${this.currentYear}-12-31`);
    } else if (f === 'all') {
      obs = this.svc.getPeopleSplitByRange('2000-01-01', '2099-12-31');
    } else {
      const from = this.customFrom(), to = this.customTo();
      if (!from || !to) { this.loading.set(false); return; }
      obs = this.svc.getPeopleSplitByRange(from, to);
    }

    obs.subscribe(splits => {
      this.splitPeople.set(splits);
      this.loading.set(false);
    });
  }

  periodLabel = computed(() => {
    const f = this.activeFilter();
    if (f === 'month') {
      return new Date(this.currentYear, this.currentMonth - 1, 1)
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (f === 'year')  return String(this.currentYear);
    if (f === 'all')   return 'All Time';
    const from = this.customFrom(), to = this.customTo();
    return from && to ? `${from} – ${to}` : 'Custom';
  });

  splitMap = computed(() => {
    const m = new Map<string | null, PersonSplit>();
    this.splitPeople().forEach(s => m.set(s.person_id, s));
    return m;
  });

  totalShared = computed(() =>
    this.splitPeople().reduce((s, p) => s + parseFloat(p.amount), 0)
  );

  avgPerPerson = computed(() => {
    const count = this.splitPeople().length;
    return count ? this.totalShared() / count : 0;
  });

  splitFor(person: Person): PersonSplit | undefined {
    return this.splitMap().get(person.id);
  }

  fmt(n: number | string) {
    return '$' + parseFloat(String(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  initial(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  relLabel(rel: string) {
    return rel.charAt(0).toUpperCase() + rel.slice(1);
  }

  deletePerson(id: string) {
    if (!confirm('Remove this person from your circle?')) return;
    this.deletingId.set(id);
    this.svc.deletePerson(id).subscribe({
      next: () => {
        this.people.update(list => list.filter(p => p.id !== id));
        this.deletingId.set(null);
      },
      error: () => this.deletingId.set(null),
    });
  }
}
