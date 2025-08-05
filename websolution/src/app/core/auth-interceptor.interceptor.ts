import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { catchError, finalize, Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {


  constructor(
    private router: Router,
    private loaderService: LoadingService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let cloned = req;

    const token = localStorage.getItem('access_token');
    const isFormData = req.body instanceof FormData;
    const hasBody = req.body != null; // safer than checking method
    const isLogin = /\/token(?:$|[/?#])/i.test(req.url);

    const setHeaders: Record<string, string> = {};

    // Default Accept if not set anywhere
    if (!req.headers.has('Accept')) {
      setHeaders['Accept'] = 'application/json';
    }

    // Content-Type:
    // - only when request has a body
    // - not FormData (browser sets boundary)
    // - only if header not already set by the caller
    if (hasBody && !isFormData && !req.headers.has('Content-Type')) {
      setHeaders['Content-Type'] = isLogin
        ? 'application/x-www-form-urlencoded'
        : 'application/json';
    }

    // Authorization: add if we have a token, not login, and not already set
    if (token && !isLogin && !req.headers.has('Authorization')) {
      setHeaders['Authorization'] = `Bearer ${token}`;
    }

    if (Object.keys(setHeaders).length > 0) {
      cloned = req.clone({ setHeaders });
    }

    // loader
    this.loaderService.show();

    return next.handle(cloned).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.router.navigate(['/wzlogin']);
        }
        return throwError(() => error);
      }),
      finalize(() => this.loaderService.hide())
    );
  }
}
