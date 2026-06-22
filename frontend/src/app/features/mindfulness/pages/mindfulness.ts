import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-mindfulness',
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center gap-6 p-8" style="background: linear-gradient(135deg, #0f0a1a 0%, #1a1030 50%, #1e1145 100%);">
      <div class="flex flex-col items-center gap-4 p-10 rounded-3xl" style="background: rgba(255,255,255,0.04); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.08);">
        <span class="material-symbols-outlined text-5xl" style="color: #34d399; text-shadow: 0 0 30px rgba(52,211,153,0.5);">self_improvement</span>
        <h1 class="text-3xl font-bold" style="font-family: 'Plus Jakarta Sans', sans-serif; color: #f0e8ff;">Mindfulness</h1>
        <p style="color: rgba(200,180,230,0.6); font-family: 'Manrope', sans-serif;">Module coming soon...</p>
        <a routerLink="/" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105" style="background: rgba(160,120,255,0.18); color: #f0e8ff; border: 1px solid rgba(255,255,255,0.12); font-family: 'Manrope', sans-serif;">
          <span class="material-symbols-outlined text-base">arrow_back</span>
          Back to home
        </a>
      </div>
    </div>
  `,
})
export class Mindfulness {}
