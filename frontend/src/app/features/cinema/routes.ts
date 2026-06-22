import { Routes } from '@angular/router';

export const cinemaRoutes: Routes = [
  { path: '', loadComponent: () => import('./pages/dashboard/cinema-dashboard').then(m => m.CinemaDashboard) },
  { path: 'search', loadComponent: () => import('./pages/search/cinema-search').then(m => m.CinemaSearch) },
  { path: 'library', loadComponent: () => import('./pages/library/cinema-library').then(m => m.CinemaLibrary) },
  { path: ':id', loadComponent: () => import('./pages/detail/cinema-detail').then(m => m.CinemaDetail) },
];
