import { Routes } from '@angular/router';

export const readingRoutes: Routes = [
  { path: '', loadComponent: () => import('./pages/dashboard/reading').then(m => m.Reading) },
  { path: 'session', loadComponent: () => import('./pages/session/reading-session').then(m => m.ReadingSessionPage) },
  { path: 'completed', loadComponent: () => import('./pages/completed/reading-completed').then(m => m.ReadingCompletedPage) },
  { path: 'authors', loadComponent: () => import('./pages/authors/reading-authors').then(m => m.ReadingAuthorsPage) },
  { path: 'sagas', loadComponent: () => import('./pages/sagas/reading-sagas').then(m => m.ReadingSagasPage) },
  { path: 'genres', loadComponent: () => import('./pages/genres/reading-genres').then(m => m.ReadingGenresPage) },
  { path: 'new-book', loadComponent: () => import('./pages/book-form/new-book').then(m => m.NewBookPage) },
  { path: 'new-book/:id', loadComponent: () => import('./pages/book-form/new-book').then(m => m.NewBookPage) },
];
