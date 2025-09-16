import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { AuthService } from 'src/app/core/auth.service';
import { Modal } from 'bootstrap';

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
  created_at: string;
  updated_at: string;
  last_login_at: string;
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
  successMsg = '';
  warnMsg = '';

  // Modals
  @ViewChild('editProfileModalRef', { static: false }) editProfileModalRef!: ElementRef;
  @ViewChild('changePwdModalRef', { static: false }) changePwdModalRef!: ElementRef;
  private editProfileModal?: Modal;
  private changePwdModal?: Modal;

  // Template-driven models
  profileModel = {
    name: '',
    email: '',
    designation: '',
    status: 'ACTIVE',
    mobile: '',
    lab_id: null as number | null
  };

  pwdModel = {
    current_password: '',
    new_password: '',
    confirm_password: ''
  };

  // UI state
  submittingProfile = false;
  submittingPwd = false;
  statuses = ['ACTIVE', 'INACTIVE'];

  constructor(
    private api: ApiServicesService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  ngAfterViewInit(): void {
    if (this.editProfileModalRef) {
      this.editProfileModal = new Modal(this.editProfileModalRef.nativeElement, { backdrop: 'static' });
    }
    if (this.changePwdModalRef) {
      this.changePwdModal = new Modal(this.changePwdModalRef.nativeElement, { backdrop: 'static' });
    }
  }

  // ---------- load / refresh ----------
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
      next: (res: any) => {
        if (!Array.isArray(res.roles)) res.roles = [];
        this.user = res as UserProfile;
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

  // ---------- Edit Profile (template-driven) ----------
  openEditProfile(): void {
    if (!this.user) return;
    this.profileModel = {
      name: this.user.name || '',
      email: this.user.email || '',
      designation: this.user.designation || '',
      status: (this.user.status || 'ACTIVE').toUpperCase(),
      mobile: this.user.mobile || '',
      lab_id: this.user.lab_id ?? null
    };
    this.successMsg = '';
    this.warnMsg = '';
    this.submittingProfile = false;
    this.editProfileModal?.show();
  }

  submitProfile(form: any): void {
    if (!this.user) return;
    if (form.invalid) {
      // show validation states
      Object.values(form.controls).forEach((c: any) => c.markAsTouched());
      return;
    }
    this.submittingProfile = true;

    const payload: any = {
      name: this.profileModel.name?.trim(),
      email: this.profileModel.email?.trim(),
      designation: (this.profileModel.designation || '').trim(),
      status: (this.profileModel.status || 'ACTIVE').toUpperCase(),
      mobile: (this.profileModel.mobile || '').trim(),
      lab_id: this.profileModel.lab_id === null || this.profileModel.lab_id === ('' as any)
        ? null
        : Number(this.profileModel.lab_id)
    };

    this.api.updateUser(this.user.id, payload).subscribe({
      next: (updated: any) => {
        this.user = { ...this.user!, ...updated };
        this.successMsg = 'Profile updated successfully.';
        this.submittingProfile = false;
        this.editProfileModal?.hide();
      },
      error: (err) => {
        console.error(err);
        this.warnMsg = err?.error?.detail || 'Failed to update profile.';
        this.submittingProfile = false;
      }
    });
  }

  // ---------- Change Password (template-driven) ----------
  openChangePassword(): void {
    this.pwdModel = {
      current_password: '',
      new_password: '',
      confirm_password: ''
    };
    this.successMsg = '';
    this.warnMsg = '';
    this.submittingPwd = false;
    this.changePwdModal?.show();
  }

  submitPassword(form: any): void {
    if (form.invalid) {
      Object.values(form.controls).forEach((c: any) => c.markAsTouched());
      return;
    }
    if (this.pwdModel.new_password !== this.pwdModel.confirm_password) {
      // set a custom error by toggling a local message (template shows it)
      this.warnMsg = 'Passwords do not match.';
      return;
    }
    this.submittingPwd = true;

    this.api.changePassword(this.pwdModel.current_password, this.pwdModel.new_password).subscribe({
      next: () => {
        this.successMsg = 'Password changed successfully.';
        this.submittingPwd = false;
        this.changePwdModal?.hide();
      },
      error: (err) => {
        console.error(err);
        this.warnMsg = err?.error?.detail || 'Failed to change password.';
        this.submittingPwd = false;
      }
    });
  }

  // ---------- helpers ----------
  private getTokenSafely(): string | null {
    try {
      const byService = (this.auth as any)?.getToken?.();
      if (byService) return byService as string;
    } catch {}
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
    const direct = payload.user_id ?? payload.userId ?? payload.id;
    if (typeof direct === 'number') return direct;
    if (typeof direct === 'string' && /^\d+$/.test(direct)) return Number(direct);
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
