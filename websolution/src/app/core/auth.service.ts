// src/app/core/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from 'src/environment/environment';
import { UserPublic, Token } from '../interface/models';

type Role =
  | 'ADMIN'
  | 'OFFICER_INCHARGE'
  | 'STORE_INCHARGE'
  | 'TESTING_ASSISTANT'
  | 'EXECUTIVE'
  | string;

function b64UrlDecode(b64url: string) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0;
  return atob(b64 + '='.repeat(pad));
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private tokenKey = 'access_token';

  private currentUserSubject: BehaviorSubject<UserPublic | null>;
  public currentUser: Observable<UserPublic | null>;

  // expose roles separately (useful for menus or guards)
  private rolesSubject = new BehaviorSubject<Role[]>([]);
  public roles$ = this.rolesSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const user = this.getUserFromToken();
    this.currentUserSubject = new BehaviorSubject<UserPublic | null>(user);
    this.currentUser = this.currentUserSubject.asObservable();
    this.rolesSubject.next(user?.roles ?? []);
  }

  public get currentUserValue(): UserPublic | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    const user = this.getUserFromToken();
    this.currentUserSubject.next(user);
    this.rolesSubject.next(user?.roles ?? []);
  }

  removeToken(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
    this.rolesSubject.next([]);
  }

  login(username: string, password: string): Observable<Token> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
    const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

    return this.http.post<Token>(`${this.apiUrl}/token`, body, { headers }).pipe(
      tap(response => this.setToken(response.access_token))
    );
  }

  logout(): void {
    this.removeToken();
    this.router.navigate(['/wzlogin']);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // --- JWT helpers ---
  private decodeToken(): any | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const decodedPayload = b64UrlDecode(parts[1]);
      return JSON.parse(decodedPayload);
    } catch (e) {
      console.error('Failed to decode token:', e);
      return null;
    }
  }

  private getUserFromToken(): UserPublic | null {
    const decoded = this.decodeToken();
    if (!decoded) return null;

    return {
      id: decoded.user_id ?? 0,
      name: decoded.sub ?? '',
      username: decoded.sub ?? '',
      email: '',
      roles: Array.isArray(decoded.roles) ? decoded.roles : [],
      designation: decoded.designation ?? '',
      status: decoded.status ?? '',
      mobile: '',
      created_at: '',
      updated_at: '',
      last_login_at: decoded.last_login_at ?? '',
      lab_id: decoded.lab_id ?? undefined
    };
  }

  getUserNameFromToken(): string | null {
    const decoded = this.decodeToken();
    return decoded?.name ?? decoded?.username ?? decoded?.sub ?? null;
  }

  getUserRolesFromToken(): string[] | null {
    const decoded = this.decodeToken();
    return Array.isArray(decoded?.roles) ? decoded.roles : null;
  }

  getuserfromtoken(): UserPublic | null {
    return this.getUserFromToken();
  }

  getuseridfromtoken(): number | string | null {
    const user = this.getUserFromToken();
    return user?.id ?? null;
  }

  // --- Role checks (sync, template-friendly) ---
  hasAny(roles: Role[]): boolean {
    const mine = this.rolesSubject.value ?? [];
    return roles.some(r => mine.includes(r));
  }

  hasNone(roles: Role[]): boolean {
    const mine = this.rolesSubject.value ?? [];
    return !roles.some(r => mine.includes(r));
  }

  canShow(allow: Role[], deny: Role[] = []): boolean {
    return this.hasAny(allow) && this.hasNone(deny);
  }
}
