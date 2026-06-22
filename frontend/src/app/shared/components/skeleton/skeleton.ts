import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  imports: [],
  template: `
    <div class="app-skeleton" [class]="'app-skeleton--' + variant" [style.width]="width" [style.height]="height">
      <div class="app-skeleton__shimmer"></div>
    </div>
  `,
  styles: `
    .app-skeleton {
      position: relative;
      overflow: hidden;
      background: rgba(255,255,255,0.04);
      border-radius: 0.5rem;
      contain: strict;
    }
    .app-skeleton--text { height: 1rem; border-radius: 0.375rem; }
    .app-skeleton--card { height: 12rem; border-radius: 1.25rem; }
    .app-skeleton--avatar { width: 3rem; height: 3rem; border-radius: 50%; }
    .app-skeleton--circle { border-radius: 50%; }
    .app-skeleton__shimmer {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%);
      animation: shimmer 1.8s ease-in-out infinite;
    }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonComponent {
  @Input() variant: 'text' | 'card' | 'avatar' | 'circle' = 'text';
  @Input() width = '100%';
  @Input() height = 'auto';
}
