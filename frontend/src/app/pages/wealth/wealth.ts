import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-wealth',
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-indigo-50 flex flex-col items-center justify-center gap-4">
      <h1 class="text-3xl font-bold text-indigo-700">Wealth Tracker</h1>
      <p class="text-indigo-400">Module coming soon...</p>
      <a routerLink="/" class="text-sm text-indigo-600 underline">← Back to home</a>
    </div>
  `,
})
export class Wealth {}
