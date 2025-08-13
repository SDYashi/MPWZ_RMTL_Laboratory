import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private loading: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Opt-out per request: { headers: { 'x-disable-loader': 'true' } }
    const skip = req.headers.get('x-disable-loader') === 'true';

    if (!skip) this.loading.show();

    return next.handle(req).pipe(
      finalize(() => { if (!skip) this.loading.hide(); })
    );
  }
}
