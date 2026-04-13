import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cinema',
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-green-50 flex flex-col items-center justify-center gap-4">
      <h1 class="text-3xl font-bold text-green-700">Cinema & TV</h1>
      <p class="text-green-400">Module coming soon...</p>
      <a routerLink="/" class="text-sm text-green-600 underline">← Back to home</a>
    </div>
  `,
})
export class Cinema {}
