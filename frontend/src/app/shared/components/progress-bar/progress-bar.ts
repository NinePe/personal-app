import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  imports: [],
  template: `
    <div class="app-progress-wrap">
      <div class="app-progress-track" [class]="'app-progress-track--' + height">
        <div
          class="app-progress-fill"
          [class]="'app-progress-fill--' + color + (animated ? ' app-progress-fill--animated' : '')"
          [style.width.%]="clamped"
        ></div>
      </div>
      @if (showLabel) {
        <span class="app-progress-label">{{ clamped }}%</span>
      }
    </div>
  `,
  styles: `
    .app-progress-wrap { display: flex; align-items: center; gap: 0.5rem; width: 100%; }
    .app-progress-track {
      flex: 1; border-radius: 9999px; background: rgba(255,255,255,0.05); overflow: hidden;
      border: 1px solid rgba(255,255,255,0.06);
      &--sm { height: 6px; }
      &--md { height: 10px; }
    }
    .app-progress-fill {
      height: 100%; border-radius: 9999px; min-width: 0; position: relative;
      overflow: hidden;
      &--primary { background: linear-gradient(90deg, rgba(160,120,255,0.6), rgba(130,90,220,0.8)); box-shadow: 0 0 12px rgba(160,120,255,0.3); }
      &--secondary { background: linear-gradient(90deg, rgba(60,180,140,0.6), rgba(40,140,110,0.8)); box-shadow: 0 0 12px rgba(60,180,140,0.3); }
      &--success { background: linear-gradient(90deg, rgba(60,200,100,0.6), rgba(40,160,80,0.8)); box-shadow: 0 0 12px rgba(60,200,100,0.3); }
      &--animated { transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
      &--animated::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
        animation: shimmerFill 2s ease-in-out infinite;
      }
    }
    .app-progress-label {
      font-size: 0.75rem; font-weight: 600; color: rgba(200,180,230,0.7);
      font-family: 'Manrope', sans-serif; flex-shrink: 0; min-width: 2.5rem; text-align: right;
    }
    @keyframes shimmerFill {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent {
  @Input() value = 0;
  @Input() color: 'primary' | 'secondary' | 'success' = 'primary';
  @Input() height: 'sm' | 'md' = 'md';
  @Input() animated = true;
  @Input() showLabel = false;

  get clamped(): number { return Math.min(100, Math.max(0, this.value)); }
}
