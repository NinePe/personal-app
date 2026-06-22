import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

interface ActionItem {
  label: string;
  route: string;
  icon: string;
}

interface RouteMeta {
  title: string;
  parent?: string;
  parentRoute?: string;
  navItems?: NavItem[];
  actions?: ActionItem[];
}

// ── Route metadata — used by Shell to render breadcrumbs, nav, and action buttons ──
const ROUTE_META: Record<string, RouteMeta> = {
  '': { title: 'Home' },

  // ── Reading ──────────────────────────────────────────────
  'reading': {
    title: 'Reading', parent: 'Home', parentRoute: '',
    actions: [{ label: 'Add Book', route: '/reading/new-book', icon: 'add' }],
    navItems: [
      { label: 'Dashboard',  route: '/reading',            icon: 'dashboard' },
      { label: 'Session',    route: '/reading/session',     icon: 'timer' },
      { label: 'Completed',  route: '/reading/completed',   icon: 'check_circle' },
      { label: 'Authors',    route: '/reading/authors',     icon: 'person' },
      { label: 'Sagas',      route: '/reading/sagas',       icon: 'collections_bookmark' },
      { label: 'Genres',     route: '/reading/genres',      icon: 'category' },
    ],
  },
  'reading/session':    { title: 'Reading Session',  parent: 'Reading', parentRoute: '/reading' },
  'reading/completed':  { title: 'Completed Books',  parent: 'Reading', parentRoute: '/reading' },
  'reading/authors':    { title: 'Authors',          parent: 'Reading', parentRoute: '/reading' },
  'reading/sagas':      { title: 'Sagas',            parent: 'Reading', parentRoute: '/reading' },
  'reading/genres':     { title: 'Genres',           parent: 'Reading', parentRoute: '/reading' },
  'reading/new-book':   { title: 'New Book',         parent: 'Reading', parentRoute: '/reading' },

  // ── Cinema ───────────────────────────────────────────────
  'cinema': {
    title: 'Cinema & TV', parent: 'Home', parentRoute: '',
    navItems: [
      { label: 'Dashboard', route: '/cinema', icon: 'dashboard' },
      { label: 'Search',    route: '/cinema/search', icon: 'search' },
      { label: 'Library',   route: '/cinema/library', icon: 'video_library' },
    ],
  },
  'cinema/search':  { title: 'Search',    parent: 'Cinema & TV', parentRoute: '/cinema' },
  'cinema/library': { title: 'Library',   parent: 'Cinema & TV', parentRoute: '/cinema' },

  // ── Spending ─────────────────────────────────────────────
  'spending': {
    title: 'Spending', parent: 'Home', parentRoute: '',
    actions: [
      { label: 'Add Expense', route: '/spending/new',  icon: 'add_card' },
      { label: 'Add Income',  route: '/spending/new-income', icon: 'trending_up' },
    ],
    navItems: [
      { label: 'Expenses',     route: '/spending/expenses',     icon: 'payments' },
      { label: 'Income',       route: '/spending/income',       icon: 'trending_up' },
      { label: 'Payments',     route: '/spending/payments',     icon: 'credit_card' },
      { label: 'Budget',       route: '/spending/budget',       icon: 'pie_chart' },
      { label: 'Savings',      route: '/spending/savings',      icon: 'savings' },
      { label: 'Loans',        route: '/spending/loans',        icon: 'handshake' },
      { label: 'Places',       route: '/spending/places',       icon: 'place' },
      { label: 'People',       route: '/spending/people',       icon: 'group' },
      { label: 'Projections',  route: '/spending/projections',  icon: 'insights' },
      { label: 'Pending', route: '/spending/pending', icon: 'pending_actions' },
    ],
  },
  'spending/new':               { title: 'New Expense',    parent: 'Home', parentRoute: '/' },
  'spending/expenses':          { title: 'Expenses',       parent: 'Home', parentRoute: '/' },
  'spending/income':            { title: 'Income',         parent: 'Home', parentRoute: '/' },
  'spending/new-income':        { title: 'New Income',     parent: 'Income',   parentRoute: '/spending/income' },
  'spending/payments':          { title: 'Payments',       parent: 'Home', parentRoute: '/' },
  'spending/budget':            { title: 'Budget',         parent: 'Home', parentRoute: '/' },
  'spending/savings':           { title: 'Savings',        parent: 'Home', parentRoute: '/' },
  'spending/new-savings':       { title: 'New Goal',       parent: 'Savings',  parentRoute: '/spending/savings' },
  'spending/loans':             { title: 'Loans',          parent: 'Home', parentRoute: '/' },
  'spending/new-loan':          { title: 'New Loan',       parent: 'Loans',    parentRoute: '/spending/loans' },
  'spending/loan-history':      { title: 'Loan History',   parent: 'Loans',    parentRoute: '/spending/loans' },
  'spending/places':            { title: 'Places',         parent: 'Home', parentRoute: '/' },
  'spending/new-place':         { title: 'New Place',      parent: 'Places',   parentRoute: '/spending/places' },
  'spending/people':            { title: 'People',         parent: 'Home', parentRoute: '/' },
  'spending/new-person':        { title: 'New Person',     parent: 'People',   parentRoute: '/spending/people' },
  'spending/new-card':          { title: 'New Card',       parent: 'Home', parentRoute: '/' },
  'spending/payments/cycles':   { title: 'Billing Cycles', parent: 'Payments', parentRoute: '/spending/payments' },
  'spending/projections':       { title: 'Projections',    parent: 'Home', parentRoute: '/' },
  'spending/pending': { title: 'Pending Expenses', parent: 'Home', parentRoute: '/' },

  // ── Other ────────────────────────────────────────────────
  'growth':      { title: 'Growth',      parent: 'Home', parentRoute: '' },
  'wealth':      { title: 'Wealth',      parent: 'Home', parentRoute: '' },
  'mindfulness': { title: 'Mindfulness', parent: 'Home', parentRoute: '' },
};

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('pageTransition', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('250ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
    ]),
  ],
})
export class Shell implements OnInit, OnDestroy {
  private router = inject(Router);
  private sub?: Subscription;

  scrolled = signal(false);
  meta = signal<RouteMeta>({ title: '' });

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 20);
  }

  ngOnInit() {
    this.updateMeta(this.router.url);
    this.sub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => this.updateMeta(e.urlAfterRedirects));
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private updateMeta(url: string) {
    const path = url.replace(/^\//, '').split('?')[0];
    const match = this.findMeta(path);
    if (!match) { this.meta.set(ROUTE_META['']); return; }

    // Inherit navItems & actions from module root when child route lacks them
    const root = path.split('/')[0];
    const rootMeta = ROUTE_META[root];
    this.meta.set({
      ...match,
      navItems: match.navItems ?? rootMeta?.navItems,
      actions: match.actions ?? rootMeta?.actions,
    });
  }

  private findMeta(path: string): RouteMeta | undefined {
    if (ROUTE_META[path]) return ROUTE_META[path];
    const segments = path.split('/');
    for (let i = segments.length - 1; i > 0; i--) {
      const tryPath = segments.slice(0, i).join('/');
      if (ROUTE_META[tryPath]) return ROUTE_META[tryPath];
    }
    return undefined;
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }

  goBack() {
    const m = this.meta();
    if (m.parentRoute !== undefined) {
      this.router.navigate([m.parentRoute]);
    }
  }
}
