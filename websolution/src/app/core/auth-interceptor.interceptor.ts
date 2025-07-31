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
    let clonedRequest = req;
    const access_token = localStorage.getItem('access_token');
    const isFormData = req.body instanceof FormData;

    // 🧠 Avoid overwriting existing Content-Type (e.g., for x-www-form-urlencoded)
    if (!isFormData && !req.headers.has('Content-Type')) {
      clonedRequest = clonedRequest.clone({
        setHeaders: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    }

    // 🔐 Add Authorization only if token exists and NOT for /token login endpoint
    if (access_token && !req.url.includes('/token')) {
      clonedRequest = clonedRequest.clone({
        setHeaders: {
          Authorization: `Bearer ${access_token}`
        }
      });
    }

    // ⏳ Show loader
    this.loaderService.show();

    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.router.navigate(['/wzlogin']);
        }
        return throwError(() => error);
      }),
      finalize(() => {
        // ✅ Hide loader on complete/error
        this.loaderService.hide();
      })
    );
  }
}
