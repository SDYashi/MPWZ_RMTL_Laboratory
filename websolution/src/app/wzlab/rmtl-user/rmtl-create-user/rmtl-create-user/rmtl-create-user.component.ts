import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Lab } from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';

declare var bootstrap: any; // ensure Bootstrap bundle JS in index.html

@Component({
  selector: 'app-rmtl-create-user',
  templateUrl: './rmtl-create-user.component.html',
  styleUrls: ['./rmtl-create-user.component.css']
})
export class RmtlCreateUserComponent implements OnInit, AfterViewInit {
  user: any = this.userDefault();
  labs: Lab[] = [];
  roles: string[] = ['ADMIN', 'OFFICER_INCHARGE']; // will be replaced by API enums if available
  statuses: string[] = ['ACTIVE', 'INACTIVE', 'PENDING'];

  // multi-select roles binding
  selectedRoles: string[] = [];

  // UI/UX
  showPassword = false;
  loading = false;

  // server response
  response_msg: string | null = null;
  response_success: boolean = false;

  // Modals
  @ViewChild('previewModal') previewModalEl!: ElementRef;
  @ViewChild('alertModal') alertModalEl!: ElementRef;
  private previewModal!: any;
  private alertModal!: any;

  constructor(private apiservice: ApiServicesService) {}

  ngOnInit(): void {
    // Load labs
    this.apiservice.getLabs().subscribe({
      next: (response) => this.labs = response || [],
      error: (error) => console.error('Error fetching labs:', error)
    });

    // Load roles from enums if available
    this.apiservice.getEnums().subscribe({
      next: (response) => {
        if (response?.roles?.length) {
          this.roles = response.roles;
        }
      },
      error: (error) => console.error('Error fetching enums:', error)
    });
  }

  ngAfterViewInit(): void {
    this.previewModal = new bootstrap.Modal(this.previewModalEl?.nativeElement, { backdrop: 'static' });
    this.alertModal = new bootstrap.Modal(this.alertModalEl?.nativeElement, { backdrop: 'static' });
  }

  userDefault() {
    return {
      lab_id: '',
      username: '',
      password: '',
      name: '',
      email: '',
      designation: '',
      status: 'ACTIVE',
      mobile: '',
      rolesStr: '' // kept for compatibility if needed
    };
  }

  // Open Preview
  openPreview(form: any): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.previewModal.show();
  }

  closePreview(): void {
    this.previewModal?.hide();
  }

  closeAlert(): void {
    this.alertModal?.hide();
    // Optional: clear inline alert after closing modal
    this.response_msg = null;
  }

  // Submit after confirm
  onConfirmSubmit(): void {
    this.loading = true;
    this.closePreview();

    // Prefer multi-select roles; if none, fall back to CSV in rolesStr
    const roles =
      (this.selectedRoles && this.selectedRoles.length)
        ? this.selectedRoles
        : (this.user.rolesStr
            ? this.user.rolesStr.split(',').map((r: string) => r.trim()).filter((r: string) => r)
            : []);

    const payload = {
      lab_id: this.user.lab_id || null,
      username: this.user.username,
      password: this.user.password,
      name: this.user.name,
      email: this.user.email,
      designation: this.user.designation || null,
      status: this.user.status,
      mobile: this.user.mobile || null,
      roles
    };

    this.apiservice.createUser(payload).subscribe({
      next: () => {
        this.response_msg = 'User created successfully!';
        this.response_success = true;
        this.loading = false;
        // reset form state
        this.user = this.userDefault();
        this.selectedRoles = [];
        this.alertModal.show();
      },
      error: (error) => {
        console.error('User creation failed:', error);
        this.response_msg = 'Error: ' + (error?.error?.message || error.message || 'Failed to create user.');
        this.response_success = false;
        this.loading = false;
        this.alertModal.show();
      }
    });
  }

  // Inline submit kept for compatibility (not used now)
  onSubmit(): void {
    // Now we use preview -> confirm. Keeping this to not break existing (no-op).
    this.openPreview({ invalid: false, control: { markAllAsTouched() {} } });
  }

  // Helpers
  labName(id: any): string | null {
    const lab = this.labs?.find(l => String(l.id) === String(id));
    return lab ? lab.lab_name : null;
  }

  get maskedPassword(): string {
    const len = (this.user?.password || '').length;
    return len ? '•'.repeat(len) : '—';
  }
}
