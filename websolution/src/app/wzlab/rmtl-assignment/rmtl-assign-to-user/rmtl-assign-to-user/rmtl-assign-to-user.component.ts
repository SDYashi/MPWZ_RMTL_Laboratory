import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import * as bootstrap from 'bootstrap';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-assign-to-user',
  templateUrl: './rmtl-assign-to-user.component.html',
  styleUrls: ['./rmtl-assign-to-user.component.css']
})
export class RmtlAssignToUserComponent {
  inward_nos: any[] = [];
  device_statuses: any[] = [];
  benches: any[] = [];

  fromDate = '';
  toDate = '';

  payload: any;
  users: any[] = [];
  responseMessage = '';
  responseSuccess = false;

  selectedInward = '';
  selectedStatus = 'UNASSIGNED';
  assignedUser = '';
  assignedBench = '';
  currentuser = 'SYSADMIN';
  filteredDevices: any[] = [];
  roles: string[] = ['TESTING_ASSISTANT'];

  // Alert modal bindings
  @ViewChild('alertModal', { static: false }) alertModalEl!: ElementRef;
  private alertModalRef: bootstrap.Modal | null = null;
  modalTitle = '';
  modalMessage = '';
  modalVariant: 'success' | 'error' | 'info' = 'info';

  constructor(
    private api: ApiServicesService,
    private authapi: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.filterinwordno();
    this.api.getEnums().subscribe({
      next: (res) => {
        this.device_statuses = res.assignment_statuses || [];
        this.responseSuccess = true;
      },
      error: (err) => {
        this.responseSuccess = false;
        this.showAlert('Error', err?.error?.details || 'Failed to fetch enums.', 'error');
      }
    });
  }

  // ----------------- Data fetchers -----------------
  filterinwordno(): void {
    this.api.getdistinctinwordno().subscribe({
      next: (res) => {
        this.inward_nos = res || [];
        this.responseMessage = 'Data fetched successfully!';
        this.responseSuccess = true;
      },
      error: (err) => {
        this.responseMessage = err?.error?.details || 'Failed to fetch data.';
        this.responseSuccess = false;
        this.showAlert('Error', this.responseMessage, 'error');
      }
    });
  }

  fetchfilterinwordno(): void {
    this.fromDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    this.toDate = new Date().toISOString().slice(0, 10);

    this.api.getdistinctinwordno(this.fromDate, this.toDate).subscribe({
      next: (res) => {
        this.inward_nos = res || [];
        this.responseMessage = `Data fetched successfully from ${this.fromDate} to ${this.toDate}!`;
        this.responseSuccess = true;
      },
      error: (err) => {
        const msg = err?.error?.details || `Failed to fetch data from ${this.fromDate} to ${this.toDate}.`;
        this.responseMessage = msg;
        this.responseSuccess = false;
        this.showAlert('Error', msg, 'error');
      }
    });
  }

  filterDevices(): void {
    if (!this.selectedInward) {
      this.filteredDevices = [];
      return;
    }
    this.api.getDevicelistbyinwordno(this.selectedInward).subscribe({
      next: (res) => {
        this.filteredDevices = (res || []).map((d: any) => ({ ...d, selected: false }));
        this.responseMessage = 'Data fetched successfully!';
        this.responseSuccess = true;
      },
      error: (err) => {
        const msg = err?.error?.details || 'Failed to fetch data.';
        this.responseMessage = msg;
        this.responseSuccess = false;
        this.showAlert('Error', msg, 'error');
      }
    });
  }

  // ----------------- Selection helpers -----------------
  toggleAllDevices(event: any): void {
    const checked = !!event.target?.checked;
    this.filteredDevices = this.filteredDevices.map(d => ({ ...d, selected: checked }));
  }

  hasSelectedDevices(): boolean {
    return this.filteredDevices.some(d => d.selected);
  }

  // ----------------- Modal helpers -----------------
  private ensureAlertModal(): void {
    if (!this.alertModalRef && this.alertModalEl?.nativeElement) {
      this.alertModalRef = new bootstrap.Modal(this.alertModalEl.nativeElement, {
        backdrop: 'static',
        keyboard: false
      });
    }
  }

  showAlert(title: string, message: string, variant: 'success' | 'error' | 'info' = 'info'): void {
    this.modalTitle = title;
    this.modalMessage = message;
    this.modalVariant = variant;
    this.ensureAlertModal();
    this.alertModalRef?.show();
  }

  // ----------------- Assign flow -----------------
  openAssignModal(): void {
    // Load users & benches before opening
    this.api.getUsers(this.roles).subscribe({
      next: (res) => (this.users = res || []),
      error: (err) => this.showAlert('Error', err?.error?.details || 'Failed to fetch users.', 'error')
    });

    this.api.getTestingBenches().subscribe({
      next: (res) => (this.benches = res || []),
      error: (err) => this.showAlert('Error', err?.error?.details || 'Failed to fetch benches.', 'error')
    });

    const el = document.getElementById('assignModal');
    if (el) {
      const modal = bootstrap.Modal.getOrCreateInstance(el);
      modal.show();
    }
  }

  submitAssignment(): void {
    this.currentuser = this.authapi.getUserNameFromToken() ?? '';

    const selectedDeviceIds = this.filteredDevices.filter(d => d.selected).map(d => d.id);

    if (!selectedDeviceIds.length) {
      this.showAlert('No selection', 'Please select at least one device.', 'info');
      return;
    }
    if (!this.assignedUser || !this.assignedBench) {
      this.showAlert('Missing data', 'Please select both Bench and User.', 'info');
      return;
    }

    this.payload = {
      inward_no: this.selectedInward,
      device_ids: selectedDeviceIds,
      user_id: this.assignedUser,
      assigned_to: this.assignedUser,      // keep if backend expects it
      assigned_by: 1,                      // consider using current user id
      bench_id: parseInt(this.assignedBench, 10)
    };

    // Close the assign modal immediately
    const assignEl = document.getElementById('assignModal');
    if (assignEl) bootstrap.Modal.getInstance(assignEl)?.hide();

    this.api.createAssignmentbulk(this.payload).subscribe({
      next: (res) => {
        // Expecting {"status":"success","assigned_devices":[1305]}
        const msg = res?.status === 'success'
          ? `Assignment successful! Device IDs: ${(res?.assigned_devices || []).join(', ')}`
          : 'Assignment completed.';
        this.showAlert('Success', msg, 'success');

        // Clear selections & refresh table
        this.filteredDevices = [];
        this.selectedInward = '';
        // (Optional) re-fetch inwards
        this.filterinwordno();

        // If you still want to navigate, do it after user closes the alert:
        // setTimeout(() => this.router.navigate(['/wzlab/assignement/assign-to-user']), 600);
      },
      error: (err) => {
        const msg = err?.error?.details || 'Assignment failed.';
        this.showAlert('Error', msg, 'error');
      }
    });
  }
}
