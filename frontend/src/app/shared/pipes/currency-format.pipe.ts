import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyFormat',
  pure: true,
  standalone: true,
})
export class CurrencyFormatPipe implements PipeTransform {
  private formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  private compactFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  transform(value: number | null | undefined, compact?: boolean): string {
    if (value == null || isNaN(value)) {
      return '$0.00';
    }

    if (compact) {
      return this.compactFormatter.format(value);
    }

    return this.formatter.format(value);
  }
}
