import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-mindfulness',
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-teal-50 flex flex-col items-center justify-center gap-4">
      <h1 class="text-3xl font-bold text-teal-700">Mindfulness</h1>
      <p class="text-teal-400">Module coming soon...</p>
      <a routerLink="/" class="text-sm text-teal-600 underline">← Back to home</a>
    </div>
  `,
})
export class Mindfulness {}
