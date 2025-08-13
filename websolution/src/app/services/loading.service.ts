import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private activeRequests = 0;
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  readonly loading$: Observable<boolean> = this._loading$.asObservable();

  /** Increment when a request/task starts */
  show(): void {
    this.activeRequests++;
    if (!this._loading$.value) this._loading$.next(true);
  }

  /** Decrement when a request/task ends */
  hide(): void {
    if (this.activeRequests > 0) this.activeRequests--;
    if (this.activeRequests === 0 && this._loading$.value) this._loading$.next(false);
  }

  /** For very custom use-cases */
  set(value: boolean): void {
    this.activeRequests = value ? Math.max(this.activeRequests, 1) : 0;
    this._loading$.next(value);
  }
}
