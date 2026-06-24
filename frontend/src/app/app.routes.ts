import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/pages/home').then(m => m.Home) },
  { path: 'reading', loadChildren: () => import('./features/reading/routes').then(m => m.readingRoutes) },
  { path: 'cinema', loadChildren: () => import('./features/cinema/routes').then(m => m.cinemaRoutes) },
  { path: 'spending', loadChildren: () => import('./features/spending/routes').then(m => m.spendingRoutes) },
  { path: 'purchases', loadChildren: () => import('./features/purchases/routes').then(m => m.purchasesRoutes) },
  { path: 'wealth', loadComponent: () => import('./features/spending/pages/expense-form/wealth').then(m => m.Wealth) },
  { path: 'growth', loadComponent: () => import('./features/growth/pages/growth').then(m => m.Growth) },
  { path: 'mindfulness', loadComponent: () => import('./features/mindfulness/pages/mindfulness').then(m => m.Mindfulness) },
  { path: '**', redirectTo: '' },
];
