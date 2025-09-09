import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';

declare var bootstrap: any;

type LabChip = { id: number; lab_name: string };

@Component({
  selector: 'app-rmtl-edit-user',
  templateUrl: './rmtl-edit-user.component.html',
  styleUrls: ['./rmtl-edit-user.component.css']
})
export class RmtlEditUserComponent implements OnInit, AfterViewInit {
  userId!: any;
  user: any = {};

  statuses: string[] = [];
  allRoles: string[] = [];
  labs: LabChip[] = [];

  selectedRoles: string[] = [];
  selectedLabs: LabChip[] = [];

  // UI state
  loading = false;
  responseMsg = '';
  responseSuccess = false;

  // Validation helpers
  showValidation = false;
  get rolesValid(): boolean { return this.selectedRoles.length > 0; }
  get labsValid(): boolean { return this.selectedLabs.length > 0; }
  get formFieldsValid(): boolean {
    return !!(this.user?.name && this.user?.email && this.user?.status);
  }
  get canSave(): boolean {
    return this.formFieldsValid && this.rolesValid && this.labsValid;
  }

  // Computed labels for dropdown buttons / preview lines
  get labsLabel(): string {
    return (this.selectedLabs && this.selectedLabs.length)
      ? this.selectedLabs.map(l => l.lab_name).join(', ')
      : 'Select Labs';
  }

  get rolesLabel(): string {
    return (this.selectedRoles && this.selectedRoles.length)
      ? this.selectedRoles.join(', ')
      : 'Select Roles';
  }

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
    this.userId = String(this.route.snapshot.paramMap.get('id') || '');

    // enums (status & roles)
    this.api.getEnums().subscribe({
      next: (res) => {
        this.statuses = res?.user_statuses || [];
        this.allRoles = res?.roles || [];
      },
      error: (err) => {
        console.error('Failed to fetch enums', err);
        this.statuses = [];
        this.allRoles = [];
      }
    });

    // labs
    this.api.getLabs().subscribe({
      next: (response) => {
        this.labs = (response || []) as LabChip[];
        this.hydrateSelectedLabsFromUser(); // map if user already fetched
      },
      error: (error) => console.error('Error fetching labs:', error)
    });

    // user
    this.getUserById(this.userId);
  }

  ngAfterViewInit(): void {
    if (typeof bootstrap !== 'undefined') {
      this.previewModal = new bootstrap.Modal(this.previewModalEl?.nativeElement, { backdrop: 'static' });
      this.alertModal = new bootstrap.Modal(this.alertModalEl?.nativeElement, { backdrop: 'static' });
    }
  }

  getUserById(id: any): void {
    this.api.getUser(id).subscribe({
      next: (res) => {
        this.user = res || {};

        // Roles (array or csv fallback)
        if (Array.isArray(this.user.roles) && this.user.roles.length) {
          this.selectedRoles = [...this.user.roles];
        } else if (typeof this.user.rolesStr === 'string') {
          this.selectedRoles = this.user.rolesStr.split(',').map((r: string) => r.trim()).filter(Boolean);
        } else {
          this.selectedRoles = [];
        }

        // Labs mapping
        this.hydrateSelectedLabsFromUser();
      },
      error: (err) => {
        console.error('Failed to fetch user', err);
        alert('User not found!');
        this.router.navigate(['/wzlab/user/user-list']);
      }
    });
  }

  /** Map selectedLabs using user.labs (objects) or user.lab_ids (ids/comma string) after labs list is available */
  private hydrateSelectedLabsFromUser(): void {
    if (!this.labs?.length || !this.user) return;

    // Case 1: user.labs is an array of objects
    if (Array.isArray(this.user.labs) && this.user.labs.length && typeof this.user.labs[0] === 'object') {
      const ids = new Set<number>(this.user.labs.map((x: any) => Number(x.id)));
      this.selectedLabs = this.labs.filter(l => ids.has(Number(l.id)));
      return;
    }

    // Case 2: user.lab_ids is array of ids or comma-separated string
    let labIds: number[] = [];
    if (Array.isArray(this.user.lab_ids)) {
      labIds = this.user.lab_ids.map((x: any) => Number(x));
    } else if (typeof this.user.lab_ids === 'string') {
      labIds = this.user.lab_ids
        .split(',')
        .map((x: string) => Number(x.trim()))
        .filter((n: number) => !Number.isNaN(n));
    }

    if (labIds.length) {
      const idset = new Set<number>(labIds);
      this.selectedLabs = this.labs.filter(l => idset.has(Number(l.id)));
    }
  }

  openPreview(form: NgForm): void {
    this.showValidation = true;
    if (form.invalid || !this.rolesValid || !this.labsValid) {
      form.control?.markAllAsTouched();
      return;
    }
    this.previewModal?.show();
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
    if (!this.canSave) return;

    this.loading = true;
    this.closePreview();

    const payload = {
      ...this.user,
      roles: [...this.selectedRoles],
      labs: this.selectedLabs.map(l => ({ id: l.id, lab_name: l.lab_name })), // if backend needs objects
      lab_ids: this.selectedLabs.map(l => l.id) // if backend prefers ids
    };

    this.api.updateUser(this.userId, payload).subscribe({
      next: () => {
        this.responseSuccess = true;
        this.responseMsg = 'User updated successfully!';
        this.loading = false;
        this.alertModal?.show();
      },
      error: (err) => {
        console.error('Update failed', err);
        this.responseSuccess = false;
        this.responseMsg = err?.error?.message || 'Failed to update user.';
        this.loading = false;
        this.alertModal?.show();
      }
    });
  }

  // Legacy hook if someone still calls onSubmit()
  onSubmit(): void {
    this.openPreview({ invalid: false, control: { markAllAsTouched() {} } } as any);
  }

  cancel(): void {
    this.router.navigate(['/wzlab/user/user-list']);
  }

  /* ---------- Labs helpers ---------- */
  selectAllLabs(): void {
    this.selectedLabs = [...this.labs];
  }

  clearLabs(): void {
    this.selectedLabs = [];
  }

  isLabSelected(labId?: number): boolean {
    if (labId === undefined || labId === null) return false;
    return this.selectedLabs.some((l) => Number(l.id) === Number(labId));
  }

  onLabToggle(event: Event, lab: LabChip | any): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (!lab || lab.id === undefined || lab.id === null) return;

    if (checked) {
      if (!this.isLabSelected(lab.id)) {
        this.selectedLabs = [...this.selectedLabs, { id: Number(lab.id), lab_name: String(lab.lab_name) }];
      }
    } else {
      this.selectedLabs = this.selectedLabs.filter((l) => Number(l.id) !== Number(lab.id));
    }
  }

  /* ---------- Roles helpers ---------- */
  selectAllRoles(): void {
    this.selectedRoles = [...this.allRoles];
  }

  clearRoles(): void {
    this.selectedRoles = [];
  }

  isRoleSelected(role: string): boolean {
    return this.selectedRoles.includes(role);
  }

  onRoleToggle(event: Event, role: string): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedRoles.includes(role)) {
        this.selectedRoles = [...this.selectedRoles, role];
      }
    } else {
      this.selectedRoles = this.selectedRoles.filter((r) => r !== role);
    }
  }
}
