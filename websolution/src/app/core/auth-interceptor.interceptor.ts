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
export class AuthInterceptorInterceptor implements HttpInterceptor {

  constructor(
    private router: Router,
    private loaderService: LoadingService
  ) {}

  // 🔧 Utility: Convert object to URL-encoded string
  private toUrlEncoded(obj: any): string {
    return Object.keys(obj)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
      .join('&');
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let clonedRequest = req;
    const access_token = localStorage.getItem('access_token');
    const isFormData = req.body instanceof FormData;

    // 🧠 Detect /token and encode body
    const isTokenRequest = req.url.includes('/token') && req.method === 'POST';

    if (isTokenRequest && typeof req.body === 'object') {
      const encodedBody = this.toUrlEncoded(req.body);

      clonedRequest = req.clone({
        body: encodedBody,
        setHeaders: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });
    }
    else if (!isFormData && !req.headers.has('Content-Type')) {
      // Default for other JSON requests
      clonedRequest = req.clone({
        setHeaders: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    }

    if (access_token && !req.url.includes('/token')) {
      clonedRequest = clonedRequest.clone({
        setHeaders: {
          Authorization: `Bearer ${access_token}`
        }
      });
    }

    this.loaderService.show();

    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.router.navigate(['/wzlogin']);
        }
        return throwError(() => error);
      }),
      finalize(() => {
        this.loaderService.hide();
      })
    );
  }
}