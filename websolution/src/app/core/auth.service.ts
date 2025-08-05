import { Injectable } from '@angular/core';
import{ HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Token } from '../interface/models';
import { UserPublic } from '../interface/models';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private tokenKey = 'access_token';
  private currentUserSubject: BehaviorSubject<UserPublic | null>;
  public currentUser: Observable<UserPublic | null>;

  constructor(private http: HttpClient, private router: Router) {
    this.currentUserSubject = new BehaviorSubject<UserPublic | null>(null); // Initialize with null
    this.currentUser = this.currentUserSubject.asObservable();
    this.loadCurrentUser(); // Attempt to load user on service init
  }

  public get currentUserValue(): UserPublic | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  removeToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  login(username: string, password: string): Observable<Token> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
    const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

    return this.http.post<Token>(`${this.apiUrl}/token`, body, { headers }).pipe(
      tap(response => {
        this.setToken(response.access_token);
        // After successful login, fetch the current user details
        this.fetchCurrentUserDetails().subscribe({
          next: (user) => {
            this.currentUserSubject.next(user);
          },
          error: (err) => {
            console.error('Failed to fetch current user details after login:', err);
            this.logout(); // Logout if user details can't be fetched
          }
        });
      }),
      catchError(error => {
        console.error('Login failed:', error);
        return throwError(() => new Error('Invalid credentials'));
      })
    );
  }

  logout(): void {
    this.removeToken();
    this.currentUserSubject.next(null);
    this.router.navigate(['/wzlogin']);
  }

  // Fetches the current user's details using their token
  private fetchCurrentUserDetails(): Observable<UserPublic> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('No token found'));
    }
    return this.http.get<UserPublic>(`${this.apiUrl}/users/me`).pipe(
      catchError(error => {
        console.error('Error fetching current user details:', error);
        return throwError(() => new Error('Failed to fetch user details'));
      })
    );
  }

  private loadCurrentUser(): void {
    const token = this.getToken();
    if (token) {
      this.fetchCurrentUserDetails().subscribe({
        next: (user) => {
          this.currentUserSubject.next(user);
        },
        error: (err) => {
          console.error('Auto-login failed:', err);
          this.logout(); // Clear invalid token
        }
      });
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
