import { Routes } from '@angular/router';

export const purchasesRoutes: Routes = [
  { path: '',           loadComponent: () => import('./pages/dashboard/purchases-dashboard').then(m => m.PurchasesDashboard) },
  { path: 'new',        loadComponent: () => import('./pages/purchase-form/purchase-form').then(m => m.PurchaseForm) },
  { path: 'categories', loadComponent: () => import('./pages/purchase-form/purchase-form').then(m => m.PurchaseForm) },
  { path: ':id',        loadComponent: () => import('./pages/purchase-detail/purchase-detail').then(m => m.PurchaseDetail) },
];
