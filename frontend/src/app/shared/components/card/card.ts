import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-card',
  imports: [],
  templateUrl: './card.html',
  styleUrl: './card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  @Input() hoverable = true;
  @Input() padding: 'none' | 'md' | 'lg' = 'md';

  get classes(): string {
    const base = 'app-card';
    const hover = this.hoverable ? 'app-card--hoverable' : '';
    return [base, hover].filter(Boolean).join(' ');
  }
}
