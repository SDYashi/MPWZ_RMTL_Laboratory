import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';

declare var bootstrap: any; // ensure Bootstrap bundle JS is included in index.html

@Component({
  selector: 'app-rmtl-edit-user',
  templateUrl: './rmtl-edit-user.component.html',
  styleUrls: ['./rmtl-edit-user.component.css']
})
export class RmtlEditUserComponent implements OnInit, AfterViewInit {
  userId!: any;
  user: any = {};
  statuses: string[] = [];

  loading = false;
  responseMsg = '';
  responseSuccess = false;
  selectedRoles: string[] = [];
  roles: string[] = ['ADMIN', 'OFFICER_INCHARGE']; 
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

    this.api.getEnums().subscribe({
      next: (res) => {
        this.statuses = res?.user_statuses || ['ACTIVE', 'INACTIVE', 'PENDING'];
      },
      error: (err) => {
        console.error('Failed to fetch enums', err);
        this.statuses = ['ACTIVE', 'INACTIVE', 'PENDING'];
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
        this.user.rolesStr = this.user.roles?.join(', ') || '';
      },
      error: (err) => {
        console.error('Failed to fetch user', err);
        alert('User not found!');
        this.router.navigate(['/wzlab/user/user-list']);
      }
    });
  }

  /** Derived roles array from rolesStr for preview + submit disabling */
  get parsedRoles(): string[] {
    return (this.user?.rolesStr || '')
      .split(',')
      .map((r: string) => r.trim())
      .filter((r: string) => !!r);
  }

  /** Original submit (hooked to preview now) */
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

  /** Confirmed submit from preview modal */
  onConfirmUpdate(): void {
    this.loading = true;
    this.closePreview();

    // Build payload: keep your CSV roles model on backend
    const payload = {
      ...this.user,
      roles: this.parsedRoles
    };

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

  /** Fallback direct submit (not used; kept to avoid breaking callers) */
  onSubmit(): void {
    this.openPreview({ invalid: false, control: { markAllAsTouched() {} } } as any);
  }

  cancel(): void {
    this.router.navigate(['/wzlab/user/user-list']);
  }
}
