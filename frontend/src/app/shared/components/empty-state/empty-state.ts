import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  imports: [],
  template: `
    <div class="app-empty animate-slide-up">
      <span class="material-symbols-outlined app-empty__icon">{{ icon }}</span>
      <h3 class="app-empty__heading">{{ heading }}</h3>
      <p class="app-empty__message">{{ message }}</p>
      @if (actionLabel) {
        <button class="app-empty__action" (click)="onAction()">{{ actionLabel }}</button>
      }
    </div>
  `,
  styles: `
    .app-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2.5rem 1.5rem;
      background: rgba(255,255,255,0.03);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 1.25rem;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .app-empty__icon {
      font-size: 3.5rem;
      color: rgba(160,120,255,0.3);
      text-shadow: 0 0 30px rgba(160,120,255,0.15), 0 0 60px rgba(160,120,255,0.08);
      margin-bottom: 1rem;
      font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 48;
    }
    .app-empty__heading {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: #e8e0f0;
      margin: 0 0 0.5rem;
    }
    .app-empty__message {
      font-size: 0.875rem;
      color: rgba(200,180,230,0.6);
      max-width: 24rem;
      margin: 0 0 1.25rem;
      line-height: 1.5;
    }
    .app-empty__action {
      padding: 0.6rem 1.5rem;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 9999px;
      background: rgba(160,120,255,0.25);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #f0e8ff;
      font-family: 'Manrope', sans-serif;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 4px 20px rgba(160,120,255,0.2);
      &:hover { transform: scale(1.02); background: rgba(160,120,255,0.4); box-shadow: 0 6px 30px rgba(160,120,255,0.35), 0 0 60px rgba(160,120,255,0.15); }
      &:active { transform: scale(0.97); }
    }
    @keyframes slideUp {
      0% { transform: translateY(8px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  private router = inject(Router);
  @Input() icon = 'inbox';
  @Input() heading = '';
  @Input() message = '';
  @Input() actionLabel: string | undefined;
  @Input() actionRoute: string | undefined;
  @Output() actionClick = new EventEmitter<void>();

  onAction() {
    this.actionClick.emit();
    if (this.actionRoute) this.router.navigate([this.actionRoute]);
  }
}
