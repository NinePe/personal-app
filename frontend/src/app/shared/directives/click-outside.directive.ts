import { Directive, ElementRef, EventEmitter, inject, OnDestroy, OnInit, Output } from '@angular/core';

@Directive({
  selector: '[clickOutside]',
  standalone: true,
})
export class ClickOutsideDirective implements OnInit, OnDestroy {
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @Output() clickOutside = new EventEmitter<void>();

  private handleClick = (event: MouseEvent) => {
    const target = event.target as Node;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.clickOutside.emit();
    }
  };

  ngOnInit(): void {
    document.addEventListener('click', this.handleClick);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleClick);
  }
}
