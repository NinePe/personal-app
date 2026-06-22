import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-badge',
  imports: [],
  template: `
    <span class="app-badge" [class]="'app-badge--' + variant + ' app-badge--' + color + ' app-badge--' + size" [class.app-badge--pulse]="pulse">
      <ng-content />
    </span>
  `,
  styles: `
    .app-badge {
      display: inline-flex;
      align-items: center;
      border-radius: 9999px;
      font-family: 'Manrope', sans-serif;
      font-weight: 600;
      line-height: 1;
      transition: all 0.2s ease;
    }
    .app-badge--sm  { padding: 0.2rem 0.5rem; font-size: 0.65rem; }
    .app-badge--md  { padding: 0.3rem 0.75rem; font-size: 0.75rem; }
    .app-badge--soft {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(8px);
    }
    .app-badge--soft.primary { color: #c8b0f0; }
    .app-badge--soft.secondary { color: #80d0b0; }
    .app-badge--soft.tertiary { color: #d090a8; }
    .app-badge--soft.success { color: #60d080; }
    .app-badge--soft.error { color: #e06070; }
    .app-badge--solid {
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.12);
    }
    .app-badge--solid.primary { background: rgba(160,120,255,0.3); color: #f0e8ff; }
    .app-badge--solid.secondary { background: rgba(80,180,140,0.25); color: #d0f0e0; }
    .app-badge--solid.error { background: rgba(220,50,80,0.3); color: #ffe0e0; }
    .app-badge--pulse { animation: pulseGlass 2.5s ease-in-out infinite; }
    @keyframes pulseGlass { 0%, 100% { opacity: 1; box-shadow: 0 0 0 rgba(160,120,255,0); } 50% { opacity: 0.85; box-shadow: 0 0 12px rgba(160,120,255,0.15); } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  @Input() color: 'primary' | 'secondary' | 'tertiary' | 'success' | 'error' = 'primary';
  @Input() variant: 'solid' | 'soft' = 'soft';
  @Input() size: 'sm' | 'md' = 'sm';
  @Input() pulse = false;
}
