import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';

declare var bootstrap: any; // Ensure Bootstrap bundle JS is included in index.html

@Component({
  selector: 'app-rmtl-edit-user',
  templateUrl: './rmtl-edit-user.component.html',
  styleUrls: ['./rmtl-edit-user.component.css']
})
export class RmtlEditUserComponent implements OnInit, AfterViewInit {
  userId!: any;
  user: any = {};
  statuses: string[] = [];

  // Roles support
  allRoles: string[] = [];       // Options list (from enums)
  selectedRoles: string[] = [];  // Bound to multi-select

  // UI state
  loading = false;
  responseMsg = '';
  responseSuccess = false;

  // Modals
  @ViewChild('previewModal') previewModalEl!: ElementRef;
  @ViewChild('alertModal') alertModalEl!: ElementRef;
  private previewModal!: any;
  private alertModal!: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiServicesService
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id')!;
    this.getUserById(this.userId);

    // Load enums for statuses and roles
    this.api.getEnums().subscribe({
      next: (res) => {
        this.statuses = res?.user_statuses || ['ACTIVE', 'INACTIVE', 'PENDING'];
        this.allRoles = res?.roles || ['ADMIN', 'OFFICER_INCHARGE'];
      },
      error: (err) => {
        console.error('Failed to fetch enums', err);
        this.statuses = ['ACTIVE', 'INACTIVE', 'PENDING'];
        this.allRoles = ['ADMIN', 'OFFICER_INCHARGE'];
      }
    });
  }

  ngAfterViewInit(): void {
    this.previewModal = new bootstrap.Modal(this.previewModalEl?.nativeElement, { backdrop: 'static' });
    this.alertModal = new bootstrap.Modal(this.alertModalEl?.nativeElement, { backdrop: 'static' });
  }

  getUserById(id: any): void {
    this.api.getUser(id).subscribe({
      next: (res) => {
        this.user = res || {};
        // Initialize multi-select from API data (array or CSV fallback)
        if (Array.isArray(this.user.roles) && this.user.roles.length) {
          this.selectedRoles = [...this.user.roles];
        } else if (typeof this.user.rolesStr === 'string') {
          this.selectedRoles = this.user.rolesStr.split(',').map((r: string) => r.trim()).filter(Boolean);
        } else {
          this.selectedRoles = [];
        }
      },
      error: (err) => {
        console.error('Failed to fetch user', err);
        alert('User not found!');
        this.router.navigate(['/wzlab/user/user-list']);
      }
    });
  }

  openPreview(form: NgForm): void {
    if (form.invalid) {
      form.control?.markAllAsTouched();
      return;
    }
    this.previewModal.show();
  }

  closePreview(): void {
    this.previewModal?.hide();
  }

  closeAlert(): void {
    this.alertModal?.hide();
    if (this.responseSuccess) {
      this.router.navigate(['/wzlab/user/user-list']);
    }
  }

  onConfirmUpdate(): void {
    this.loading = true;
    this.closePreview();

    // Build payload for backend: send roles as array
    const payload = {
      ...this.user,
      roles: this.selectedRoles
    };
    // If your backend requires CSV instead, use:
    // const payload = { ...this.user, rolesStr: this.selectedRoles.join(',') };

    this.api.updateUser(this.userId, payload).subscribe({
      next: () => {
        this.responseSuccess = true;
        this.responseMsg = 'User updated successfully!';
        this.loading = false;
        this.alertModal.show();
      },
      error: (err) => {
        console.error('Update failed', err);
        this.responseSuccess = false;
        this.responseMsg = err?.error?.message || 'Failed to update user.';
        this.loading = false;
        this.alertModal.show();
      }
    });
  }

  // Optional: keep a direct submit handler if some callers still trigger (ngSubmit)="onSubmit()"
  onSubmit(): void {
    this.openPreview({ invalid: false, control: { markAllAsTouched() {} } } as any);
  }

  cancel(): void {
    this.router.navigate(['/wzlab/user/user-list']);
  }
}
