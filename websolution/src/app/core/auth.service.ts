// src/app/core/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
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
  | 'SUPERINTENDING_ENGINEER'
  | string;

function b64UrlDecodeToUtf8(b64url: string) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0;
  const bin = atob(b64 + '='.repeat(pad));
  // handle unicode safely
  try {
    return decodeURIComponent(
      bin.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
  } catch {
    return bin;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private tokenKey = 'access_token';

  // Reactive user + roles
  private currentUserSubject = new BehaviorSubject<UserPublic | null>(null);
  public currentUser = this.currentUserSubject.asObservable();
  public user$ = this.currentUser; // alias for convenience

  private rolesSubject = new BehaviorSubject<Role[]>([]);
  public roles$ = this.rolesSubject.asObservable();

  /** UI-wide soft refresh trigger (sidebars/menus can subscribe) */
  private refreshSubject = new Subject<void>();
  public refresh$ = this.refreshSubject.asObservable();

  private tokenCache: string | null = null;

  constructor(private http: HttpClient, private router: Router) {
    // Bootstrap state from existing token
    this.hydrateFromStorage();

    // Reflect changes from other tabs/windows
    window.addEventListener('storage', (e) => {
      if (e.key === this.tokenKey) {
        this.hydrateFromStorage();
        this.triggerRefresh();
      }
    });
  }

  // ---------------- Public API ----------------

  login(username: string, password: string): Observable<Token> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
    const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

    return this.http.post<Token>(`${this.apiUrl}/token`, body, { headers }).pipe(
      tap(response => this.setToken(response.access_token))
    );
  }

  logout(silent = false): void {
    this.removeToken();
    if (!silent) this.router.navigate(['/wzlogin']);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /** Set token, decode user/roles, emit, and notify UI */
  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.hydrateFromStorage();
    this.triggerRefresh();
  }

  removeToken(): void {
    localStorage.removeItem(this.tokenKey);
    this.tokenCache = null;
    this.currentUserSubject.next(null);
    this.rolesSubject.next([]);
    this.triggerRefresh();
  }

  /** Manually ask subscribers (e.g., sidebar) to rebuild */
  triggerRefresh(): void {
    this.refreshSubject.next();
  }

  // ---- Role checks for templates/components ----
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

  // ---- Token-derived helpers (optional) ----
  getUserNameFromToken(): string | null {
    const decoded = this.decodeTokenRaw();
    return decoded?.name ?? decoded?.username ?? decoded?.sub ?? null;
  }

  getUserRolesFromToken(): string[] | null {
    const decoded = this.decodeTokenRaw();
    return Array.isArray(decoded?.roles) ? decoded.roles : null;
  }

  getuserfromtoken(): UserPublic | null {
    return this.getUserFromToken();
  }

  getuseridfromtoken(): number | string | null {
    const user = this.getUserFromToken();
    return user?.id ?? null;
  }
  getlabidfromtoken(): number | null {
    const user = this.getUserFromToken();
    return user?.lab_id ?? null;
  }

  // ---------------- Internal ----------------

  /** Read token from storage, decode, emit user/roles, and logout if expired */
  private hydrateFromStorage() {
    const token = this.getToken();
    this.tokenCache = token;

    const user = this.getUserFromToken(token ?? undefined);
    if (user && this.isExpired(token ?? undefined)) {
      this.logout(true);
      return;
    }

    this.currentUserSubject.next(user);
    this.rolesSubject.next(user?.roles ?? []);
  }

  private decodeTokenRaw(token?: string): any | null {
    const t = token ?? this.getToken();
    if (!t) return null;
    try {
      const parts = t.split('.');
      if (parts.length !== 3) return null;
      const decodedPayload = b64UrlDecodeToUtf8(parts[1]);
      return JSON.parse(decodedPayload);
    } catch (e) {
      console.error('Failed to decode token:', e);
      return null;
    }
  }

  private isExpired(token?: string): boolean {
    const payload = this.decodeTokenRaw(token);
    const exp = payload?.exp;
    if (!exp) return false; // if no exp, assume not expired
    const nowSec = Math.floor(Date.now() / 1000);
    return nowSec >= exp;
  }

  private getUserFromToken(token?: string): UserPublic | null {
    const decoded = this.decodeTokenRaw(token);
    if (!decoded) return null;

    return {
      id: decoded.user_id ?? 0,
      name: decoded.name ?? decoded.sub ?? decoded.username ?? '',
      username: decoded.sub ?? decoded.username ?? '',
      email: decoded.email ?? '',
      roles: Array.isArray(decoded.roles) ? decoded.roles : [],
      designation: decoded.designation ?? '',
      status: decoded.status ?? '',
      mobile: decoded.mobile ?? '',
      created_at: '',
      updated_at: '',
      last_login_at: decoded.last_login_at ?? '',
      lab_id: decoded.lab_id ?? undefined
    };
  }

}
