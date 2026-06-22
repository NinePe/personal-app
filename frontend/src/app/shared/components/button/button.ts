import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.html',
  styleUrl: './button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'ghost' = 'primary';
  @Input() disabled = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() icon: string | undefined;
  @Input() fullWidth = false;
  @Output() btnClick = new EventEmitter<MouseEvent>();

  get classes(): string {
    const base = 'app-btn';
    const variant = `app-btn--${this.variant}`;
    const size = `app-btn--${this.size}`;
    const full = this.fullWidth ? 'app-btn--full' : '';
    const iconOnly = this.icon ? 'app-btn--icon' : '';
    return [base, variant, size, full, iconOnly].filter(Boolean).join(' ');
  }
}
