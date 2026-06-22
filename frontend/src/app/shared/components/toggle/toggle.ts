import { Component, Input, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-toggle',
  imports: [],
  template: `
    <div class="app-toggle" [class.app-toggle--disabled]="_disabled"
         role="switch" [attr.aria-checked]="value"
         [attr.aria-label]="label || null"
         tabindex="0"
         (keydown.enter)="toggle(); $event.preventDefault()"
         (keydown.space)="toggle(); $event.preventDefault()">
      <input type="checkbox" class="app-toggle__input"
        [checked]="value"
        [disabled]="_disabled"
        aria-hidden="true"
        tabindex="-1"
      />
      <span class="app-toggle__track">
        <span class="app-toggle__thumb"></span>
      </span>
      @if (label) {
        <span class="app-toggle__label" aria-hidden="true">{{ label }}</span>
      }
    </div>
  `,
  styles: `
    .app-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      user-select: none;
      &--disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .app-toggle__input { position: absolute; opacity: 0; width: 0; height: 0; }
    .app-toggle__track {
      width: 44px; height: 24px;
      border-radius: 9999px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.1);
      position: relative;
      transition: background 0.25s cubic-bezier(0.65, 0, 0.35, 1), box-shadow 0.25s ease;
      flex-shrink: 0;
      backdrop-filter: blur(4px);
    }
    .app-toggle__input:checked + .app-toggle__track {
      background: rgba(160,120,255,0.4);
      border-color: rgba(160,120,255,0.3);
      box-shadow: 0 0 15px rgba(160,120,255,0.3);
    }
    .app-toggle__input:focus-visible + .app-toggle__track {
      box-shadow: 0 0 0 2px rgba(160, 120, 255, 0.25), 0 0 15px rgba(160,120,255,0.15);
    }
    .app-toggle__thumb {
      position: absolute;
      top: 2px; left: 2px;
      width: 18px; height: 18px;
      border-radius: 50%;
      background: rgba(255,255,255,0.9);
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
      transition: transform 0.25s cubic-bezier(0.65, 0, 0.35, 1);
    }
    .app-toggle__input:checked + .app-toggle__track .app-toggle__thumb {
      transform: translateX(20px);
    }
    .app-toggle__label {
      font-size: 0.875rem;
      font-weight: 500;
      color: rgba(200,180,230,0.8);
      font-family: 'Manrope', sans-serif;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ToggleComponent), multi: true }],
})
export class ToggleComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() set disabled(value: boolean) { this._disabled = value; }

  _disabled = false;
  value = false;
  onChange: (val: boolean) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(val: boolean): void { this.value = val ?? false; }
  registerOnChange(fn: (val: boolean) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this._disabled = isDisabled; }

  toggle() {
    this.value = !this.value;
    this.onChange(this.value);
    this.onTouched();
  }
}
