import { Component, input, output, signal, computed } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  template: `
    <div class="stars" [class.readonly]="readonly()">
      @for (i of [1,2,3,4,5]; track i) {
        <span class="star-wrap"
              (mouseenter)="onHover($event, i)"
              (mousemove)="onHover($event, i)"
              (mouseleave)="hover.set(null)"
              (click)="onClick($event, i)">
          <span class="material-symbols-outlined star-icon"
                [class.star-full]="displayValue() >= i"
                [class.star-half-filled]="displayValue() >= i - 0.5 && displayValue() < i"
                [class.star-empty]="displayValue() < i - 0.5">
            {{ displayValue() >= i ? 'star' : (displayValue() >= i - 0.5 ? 'star_half' : 'star') }}
          </span>
        </span>
      }
      @if (showLabel()) {
        <span class="star-label">{{ displayValue().toFixed(1) }}</span>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .stars {
      display: inline-flex; align-items: center; gap: .15rem;
      user-select: none;
    }
    .stars:not(.readonly) .star-wrap { cursor: pointer; }
    .star-wrap {
      position: relative;
      width: 32px; height: 32px;
      display: inline-block;
    }
    .star-icon {
      position: absolute; top: 0; left: 0;
      font-size: 32px; line-height: 1;
      pointer-events: none;
      transition: color .12s;
    }
    .star-full         { color: #e8a040; font-variation-settings: 'FILL' 1; }
    .star-half-filled  { color: #e8a040; font-variation-settings: 'FILL' 1; }
    .star-empty        { color: #d4c3be; font-variation-settings: 'FILL' 0; }
    .readonly .star-wrap { pointer-events: none; }
    .star-label {
      margin-left: .5rem;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: .88rem; font-weight: 800;
      color: #77553d;
    }
    :host(.sm) .star-wrap { width: 22px; height: 22px; }
    :host(.sm) .star-icon { font-size: 22px; }
    :host(.sm) .star-label { font-size: .72rem; }
    :host(.lg) .star-wrap { width: 40px; height: 40px; }
    :host(.lg) .star-icon { font-size: 40px; }
  `],
})
export class StarRating {
  value     = input<number>(0);
  readonly  = input<boolean>(false);
  showLabel = input<boolean>(false);
  valueChange = output<number>();

  hover = signal<number | null>(null);
  displayValue = computed(() => this.hover() ?? this.value());

  private resolveHalf(event: MouseEvent, starIndex: number): number {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = event.clientX - rect.left;
    return x < rect.width / 2 ? starIndex - 0.5 : starIndex;
  }

  onHover(event: MouseEvent, starIndex: number) {
    if (this.readonly()) return;
    this.hover.set(this.resolveHalf(event, starIndex));
  }

  onClick(event: MouseEvent, starIndex: number) {
    if (this.readonly()) return;
    const val = this.resolveHalf(event, starIndex);
    this.valueChange.emit(this.value() === val ? 0 : val);
  }
}
