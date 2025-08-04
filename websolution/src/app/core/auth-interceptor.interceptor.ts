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

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let cloned = req;
    const token = localStorage.getItem('access_token');

    const isFormData = req.body instanceof FormData;
    const hasBody = ['GET','POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    const isLogin = /\/token(?:$|[/?#])/i.test(req.url); // login

    // Set Content-Type only if:
    // - request has a body
    // - header not already set
    // - not FormData (browser sets its own boundary)
    if (hasBody && !isFormData && !req.headers.has('Content-Type')) {
      if (isLogin) {
        // Only login uses x-www-form-urlencoded
        cloned = cloned.clone({
          setHeaders: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        });
      } else {
        // Everything else uses JSON
        cloned = cloned.clone({
          setHeaders: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
      }
    }

    // Add Authorization for all calls except the login endpoint
    if (token && !isLogin) {
      cloned = cloned.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
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

