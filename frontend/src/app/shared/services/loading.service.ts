import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  start() { this._loading.set(true); }
  stop() { this._loading.set(false); }
}
