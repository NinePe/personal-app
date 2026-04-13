import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-growth',
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-blue-50 flex flex-col items-center justify-center gap-4">
      <h1 class="text-3xl font-bold text-blue-700">Personal Growth</h1>
      <p class="text-blue-400">Module coming soon...</p>
      <a routerLink="/" class="text-sm text-blue-600 underline">← Back to home</a>
    </div>
  `,
})
export class Growth {}
