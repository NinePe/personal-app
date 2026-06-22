import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  imports: [],
  template: `
    <div class="app-toast-stack" role="alert" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="app-toast" [class]="'app-toast--' + toast.type">
          <span class="app-toast__icon material-symbols-outlined" aria-hidden="true">
            {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info' }}
          </span>
          <p class="app-toast__message">{{ toast.message }}</p>
          <button class="app-toast__dismiss" (click)="toastService.dismiss(toast.id)" aria-label="Dismiss">
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
          <div class="app-toast__timer" [style.animation-duration.px]="4000"></div>
        </div>
      }
    </div>
  `,
  styles: `
    .app-toast-stack {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 200;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 380px;
    }
    .app-toast {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.75rem 1rem;
      border-radius: 1rem;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.3);
      animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: relative;
      overflow: hidden;
    }
    .app-toast--success { background: rgba(30,80,50,0.85); color: #ffffff; border-color: rgba(80,200,120,0.3); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.3), 0 0 20px rgba(80,200,120,0.12); }
    .app-toast--error { background: rgba(120,30,50,0.85); color: #ffffff; border-color: rgba(220,60,80,0.3); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.3), 0 0 20px rgba(220,60,80,0.12); }
    .app-toast--info { background: rgba(60,30,100,0.85); color: #ffffff; border-color: rgba(160,120,255,0.3); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.3), 0 0 20px rgba(160,120,255,0.12); }
    .app-toast__icon { font-size: 1.25rem; flex-shrink: 0; font-variation-settings: 'FILL' 1; }
    .app-toast__message { flex: 1; font-size: 0.8125rem; font-weight: 500; margin: 0; line-height: 1.4; }
    .app-toast__dismiss {
      display: grid; place-items: center; width: 24px; height: 24px;
      border-radius: 50%; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.1);
      color: #ffffff; cursor: pointer; flex-shrink: 0; padding: 0;
      backdrop-filter: blur(8px);
      &:hover { background: rgba(255,255,255,0.2); }
      .material-symbols-outlined { font-size: 0.875rem; }
    }
    .app-toast__timer {
      position: absolute; bottom: 0; left: 0; height: 3px;
      background: rgba(255,255,255,0.25); animation: timerShrink 4s linear forwards;
    }
    @keyframes slideUp {
      0% { transform: translateY(12px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes timerShrink {
      0% { width: 100%; }
      100% { width: 0%; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  toastService = inject(ToastService);
}
