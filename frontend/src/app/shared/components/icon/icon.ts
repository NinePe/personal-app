import { Component, Input, HostListener, ChangeDetectionStrategy, signal } from '@angular/core';

@Component({
  selector: 'app-icon',
  imports: [],
  template: `
    <span
      class="material-symbols-outlined app-icon"
      [class]="'app-icon--' + iconSize"
      [style.fontVariationSettings]="fontVariation()"
      [style.color]="iconColor"
      [style.fontSize]="pixelSize()"
    >{{ iconName }}</span>
  `,
  styles: `
    .app-icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; font-style: normal; line-height: 1; letter-spacing: normal; word-wrap: normal; white-space: nowrap; direction: ltr; user-select: none; transition: font-variation-settings 0.3s ease, text-shadow 0.3s ease; }
    .app-icon--sm  { width: 16px; height: 16px; }
    .app-icon--md  { width: 20px; height: 20px; }
    .app-icon--lg  { width: 24px; height: 24px; }
    .app-icon--xl  { width: 32px; height: 32px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  @Input() set name(value: string) { this._name.set(value); }
  @Input() set size(value: 'sm' | 'md' | 'lg' | 'xl') { this._size.set(value); }
  @Input() set filled(value: boolean) { this._filled.set(value); }
  @Input() set color(value: string | undefined) { this._color.set(value); }

  private _name = signal('');
  private _size = signal<'sm' | 'md' | 'lg' | 'xl'>('md');
  private _filled = signal(false);
  private _color = signal<string | undefined>(undefined);

  get iconName(): string { return this._name(); }
  get iconSize(): string { return this._size(); }
  get iconColor(): string | undefined { return this._color(); }

  private hovering = signal(false);

  @HostListener('mouseenter') onEnter() { this.hovering.set(true); }
  @HostListener('mouseleave') onLeave() { this.hovering.set(false); }

  fontVariation(): string {
    const fill = this._filled() || this.hovering() ? 1 : 0;
    return `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' 24`;
  }

  pixelSize(): string {
    const map: Record<string, string> = { sm: '16px', md: '20px', lg: '24px', xl: '32px' };
    return map[this._size()] || '20px';
  }
}
