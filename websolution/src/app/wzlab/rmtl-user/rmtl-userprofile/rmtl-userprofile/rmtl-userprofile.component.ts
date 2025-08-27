import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { AuthService } from 'src/app/core/auth.service';

export interface UserProfile {
  id: number;
  username: string;
  name: string;
  email: string;
  designation: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  mobile: string;
  lab_id: number | null;
  roles: string[];
  created_at: string;     // ISO
  updated_at: string;     // ISO
  last_login_at: string;  // ISO
}

@Component({
  selector: 'app-rmtl-userprofile',
  templateUrl: './rmtl-userprofile.component.html',
  styleUrls: ['./rmtl-userprofile.component.css']
})
export class RmtlUserprofileComponent implements OnInit {
  user?: UserProfile;
  loading = false;
  errorMsg = '';

  constructor(
    private api: ApiServicesService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMsg = '';

    const token = this.getTokenSafely();
    if (!token) {
      this.loading = false;
      this.errorMsg = 'Not logged in. Token missing.';
      return;
    }

    const payload = this.decodeJwtPayload(token);
    const userId = this.extractUserId(payload);

    if (userId == null) {
      this.loading = false;
      this.errorMsg = 'Invalid token: user_id not found.';
      return;
    }

    this.api.getUser(userId).subscribe({
      next: (res:any ) => {
        // normalize roles array
        if (!Array.isArray(res.roles)) res.roles = [];
        this.user = res;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Failed to load user profile.';
        this.loading = false;
      }
    });
  }

  refresh(): void {
    this.loadProfile();
  }

  // --- helpers ---

  private getTokenSafely(): string | null {
    // Prefer AuthService if it exposes getToken()
    try {
      const byService = (this.auth as any)?.getToken?.();
      if (byService) return byService as string;
    } catch {}
    // Fallbacks: adjust keys to your app if needed
    return (
      localStorage.getItem('access_token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('access_token') ||
      sessionStorage.getItem('token')
    );
  }

  private decodeJwtPayload(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64 = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
      const json = atob(base64);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private extractUserId(payload: any): number | null {
    if (!payload) return null;

    // Common claim names
    const direct =
      payload.user_id ??
      payload.userId ??
      payload.id;

    if (typeof direct === 'number') return direct;
    if (typeof direct === 'string' && /^\d+$/.test(direct)) return Number(direct);

    // Sometimes sub is used
    if (typeof payload.sub === 'string' && /^\d+$/.test(payload.sub)) return Number(payload.sub);

    return null;
  }

  get statusBadgeClass(): string {
    const s = (this.user?.status || '').toUpperCase();
    if (s === 'ACTIVE') return 'bg-success';
    if (s === 'INACTIVE') return 'bg-secondary';
    return 'bg-info';
  }

  get initials(): string {
    const n = (this.user?.name || this.user?.username || '').trim();
    if (!n) return '?';
    const parts = n.split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
  }
}
