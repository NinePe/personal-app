import { Component, Input, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  imports: [FormsModule],
  templateUrl: './input.html',
  styleUrl: './input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => InputComponent), multi: true }],
})
export class InputComponent implements ControlValueAccessor {
  private static nextId = 0;

  @Input() label = '';
  @Input() type: 'text' | 'number' | 'date' | 'textarea' = 'text';
  @Input() placeholder = '';
  @Input() error: string | undefined;
  @Input() set disabled(value: boolean) { this._disabled = value; }

  readonly uid = `app-input-${InputComponent.nextId++}`;
  get inputId(): string { return this.uid; }
  get errorId(): string { return `${this.uid}-error`; }

  _disabled = false;
  value = '';
  onChange: (val: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(val: string): void { this.value = val ?? ''; }
  registerOnChange(fn: (val: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this._disabled = isDisabled; }

  onInput(val: string) {
    this.value = val;
    this.onChange(val);
  }
}
