import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Lab } from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';

declare var bootstrap: any; // ensure Bootstrap bundle JS in index.html

type LabChip = { id: number; lab_name: string };

@Component({
  selector: 'app-rmtl-create-user',
  templateUrl: './rmtl-create-user.component.html',
  styleUrls: ['./rmtl-create-user.component.css']
})
export class RmtlCreateUserComponent implements OnInit, AfterViewInit {
  user: any = this.userDefault();
  labs: Lab[] = [];
  roles: string[] = [];
  statuses: string[] = [];

  // Multi-select state
  selectedRoles: string[] = [];
  selectedLabs: LabChip[] = [];

  showPassword = false;
  loading = false;
  response_msg: string | null = null;
  response_success = false;

  // For custom validation messages on multi-selects
  showValidation = false;

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

    // Load roles/statuses
    this.apiservice.getEnums().subscribe({
      next: (response) => {
        if (response?.roles?.length) {
          this.roles = response.roles;
          this.statuses = response.user_statuses || [];
        }
      },
      error: (error) => console.error('Error fetching enums:', error)
    });
  }

  ngAfterViewInit(): void {
    this.previewModal = new bootstrap.Modal(this.previewModalEl?.nativeElement, { backdrop: 'static' });
    this.alertModal = new bootstrap.Modal(this.alertModalEl?.nativeElement, { backdrop: 'static' });
  }

  // ----- Labels / display -----
  get selectedLabsLabel(): string {
    return this.selectedLabs.length
      ? this.selectedLabs.map(l => l.lab_name).join(', ')
      : 'Select Labs';
  }

  // ----- Validation -----
  get labsValid(): boolean {
    return this.selectedLabs.length > 0;
  }

  get rolesValid(): boolean {
    return this.selectedRoles.length > 0;
  }

  // ----- Labs multi-select -----
  isLabSelected(id?: number): boolean {
    if (id == null) return false;
    return this.selectedLabs.some(l => Number(l.id) === Number(id));
  }

  onLabToggle(ev: Event, lab: Lab): void {
    const input = ev.target as HTMLInputElement | null;
    const checked = !!input?.checked;

    const id = lab?.id;
    const lab_name = (lab as any)?.lab_name ?? '';
    if (id == null) return; // ignore labs without id

    if (checked) {
      if (!this.isLabSelected(id)) {
        this.selectedLabs = [...this.selectedLabs, { id: Number(id), lab_name }];
      }
    } else {
      this.selectedLabs = this.selectedLabs.filter(l => Number(l.id) !== Number(id));
    }
    // keep user.labs synced
    this.user.labs = this.selectedLabs.map(l => l.id);
  }

  selectAllLabs(): void {
    this.selectedLabs = this.labs
      .filter(l => l?.id != null)
      .map(l => ({ id: Number(l.id), lab_name: (l as any).lab_name ?? '' }));
    this.user.labs = this.selectedLabs.map(l => l.id);
  }

  clearLabs(): void {
    this.selectedLabs = [];
    this.user.labs = [];
  }

  // ----- Roles multi-select -----
  onRoleToggle(ev: Event, role: string): void {
    const input = ev.target as HTMLInputElement | null;
    const checked = !!input?.checked;

    if (checked) {
      if (!this.selectedRoles.includes(role)) {
        this.selectedRoles = [...this.selectedRoles, role];
      }
    } else {
      this.selectedRoles = this.selectedRoles.filter(r => r !== role);
    }
  }

  selectAllRoles(): void {
    this.selectedRoles = [...this.roles];
  }

  clearRoles(): void {
    this.selectedRoles = [];
  }

  // ----- Defaults & helpers -----
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
      rolesStr: '',
      labs: [] as number[]
    };
  }

  labName(id: any): string | null {
    const lab = this.labs?.find(l => String(l.id) === String(id));
    return lab ? (lab as any).lab_name : null;
    // adjust key if your interface uses a different property name
  }

  get maskedPassword(): string {
    const len = (this.user?.password || '').length;
    return len ? '•'.repeat(len) : '—';
  }

  // ----- Preview flow -----
  openPreview(form: any): void {
    this.showValidation = true;

    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    if (!this.labsValid || !this.rolesValid) {
      return;
    }
    this.previewModal.show();
  }

  closePreview(): void {
    this.previewModal?.hide();
  }

  closeAlert(): void {
    this.alertModal?.hide();
    this.response_msg = null;
  }

  // ----- Submit after confirm -----
  onConfirmSubmit(): void {
    this.loading = true;
    this.closePreview();

    const roles =
      this.selectedRoles?.length
        ? this.selectedRoles
        : (this.user.rolesStr
            ? this.user.rolesStr.split(',').map((r: string) => r.trim()).filter(Boolean)
            : []);

    
    const labs =
      this.selectedLabs?.length
        ? this.selectedLabs
        : (this.user.labs
            ? this.user.labs.map((l: number) => l)
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
      roles,
      labs 
    };

    this.apiservice.createUser(payload).subscribe({
      next: () => {
        this.response_msg = 'User created successfully!';
        this.response_success = true;
        this.loading = false;

        // reset
        this.user = this.userDefault();
        this.selectedRoles = [];
        this.clearLabs();
        this.showValidation = false;

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

  // Optional: legacy submit
  onSubmit(): void {
    this.openPreview({ invalid: false, control: { markAllAsTouched() {} } });
  }
}
