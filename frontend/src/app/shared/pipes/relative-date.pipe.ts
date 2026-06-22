import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'relativeDate',
  pure: true,
  standalone: true,
})
export class RelativeDatePipe implements PipeTransform {
  private rtf: Intl.RelativeTimeFormat | null = null;

  constructor() {
    // Intl.RelativeTimeFormat may not be available in all environments
    if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
      this.rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    }
  }

  transform(value: string | Date | number | null | undefined): string {
    if (value == null) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const absDiffSec = Math.abs(diffSec);

    if (absDiffSec < 5) {
      return 'just now';
    }

    if (absDiffSec < 60) {
      return this.formatRelative(diffSec, 'second');
    }

    const diffMin = Math.round(diffSec / 60);
    const absDiffMin = Math.abs(diffMin);

    if (absDiffMin < 60) {
      return this.formatRelative(diffMin, 'minute');
    }

    const diffHour = Math.round(diffMin / 60);
    const absDiffHour = Math.abs(diffHour);

    if (absDiffHour < 24) {
      return this.formatRelative(diffHour, 'hour');
    }

    const diffDay = Math.round(diffHour / 24);
    const absDiffDay = Math.abs(diffDay);

    if (absDiffDay < 7) {
      return this.formatRelative(diffDay, 'day');
    }

    const diffWeek = Math.round(diffDay / 7);
    const absDiffWeek = Math.abs(diffWeek);

    if (absDiffWeek < 5) {
      return this.formatRelative(diffWeek, 'week');
    }

    const diffMonth = Math.round(diffDay / 30);
    const absDiffMonth = Math.abs(diffMonth);

    if (absDiffMonth < 12) {
      return this.formatRelative(diffMonth, 'month');
    }

    const diffYear = Math.round(diffDay / 365);
    return this.formatRelative(diffYear, 'year');
  }

  private formatRelative(value: number, unit: Intl.RelativeTimeFormatUnit): string {
    if (this.rtf) {
      return this.rtf.format(value, unit);
    }

    // Fallback if Intl.RelativeTimeFormat is not available
    const abs = Math.abs(value);
    const isPast = value < 0;
    const unitStr = unit + (abs === 1 ? '' : 's');

    if (isPast) {
      if (abs === 1) return `1 ${unitStr} ago`;
      return `${abs} ${unitStr} ago`;
    }

    if (abs === 1) return `in 1 ${unitStr}`;
    return `in ${abs} ${unitStr}`;
  }
}
