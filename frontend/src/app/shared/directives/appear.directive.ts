import { Directive, ElementRef, inject, Input, OnDestroy, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appear]',
  standalone: true,
})
export class AppearDirective implements OnInit, OnDestroy {
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private renderer = inject(Renderer2);

  @Input() appearOnce = true;

  private observer: IntersectionObserver | null = null;
  private hasAppeared = false;

  ngOnInit(): void {
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          this.renderer.addClass(this.elementRef.nativeElement, 'animate-slide-up');

          if (this.appearOnce) {
            this.hasAppeared = true;
            this.disconnect();
          }
        }
      }
    });

    this.observer.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
