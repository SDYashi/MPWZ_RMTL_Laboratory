import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from 'src/environment/environment';
import { UserPublic, Token } from '../interface/models'; 

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private tokenKey = 'access_token';
  private currentUserSubject: BehaviorSubject<UserPublic | null>;
  public currentUser: Observable<UserPublic | null>;

  constructor(private http: HttpClient, private router: Router) {
    this.currentUserSubject = new BehaviorSubject<UserPublic | null>(this.getUserFromToken());
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): UserPublic | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.currentUserSubject.next(this.getUserFromToken());
  }

  removeToken(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
  }

  login(username: string, password: string): Observable<Token> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
    const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

    return this.http.post<Token>(`${this.apiUrl}/token`, body, { headers }).pipe(
      tap(response => {
        this.setToken(response.access_token);
      })
    );
  }

  logout(): void {
    this.removeToken();
    this.router.navigate(['/wzlogin']);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // Decode JWT token
  private decodeToken(): any | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      const decodedPayload = atob(payload);
      return JSON.parse(decodedPayload);
    } catch (e) {
      console.error('Failed to decode token:', e);
      return null;
    }
  }

  // Get user data from token
  private getUserFromToken(): UserPublic | null {
    const decoded = this.decodeToken();
    if (!decoded) return null;

    return {
      id: decoded.user_id || 0,
      name: decoded.sub || '',
      username: decoded.sub || '',
      email: '', // No email in the token payload
      roles: decoded.roles || [],
      designation: decoded.designation || '',
      status: decoded.status || '',
      mobile: '', // No mobile in the token payload
      created_at: '', // No created_at in the token payload
      updated_at: '', // No updated_at in the token payload
      last_login_at: decoded.last_login_at || '',
      lab_id: decoded.lab_id || undefined
    };
  }

  getUserNameFromToken(): string | null {
    const decoded = this.decodeToken();
    return decoded?.name || decoded?.username || null;
  }

  getUserRolesFromToken(): string[] | null {
    const decoded = this.decodeToken();
    return decoded?.roles || null;
  }
  getuserfromtoken(): UserPublic | null {
    return this.getUserFromToken();
  }
}