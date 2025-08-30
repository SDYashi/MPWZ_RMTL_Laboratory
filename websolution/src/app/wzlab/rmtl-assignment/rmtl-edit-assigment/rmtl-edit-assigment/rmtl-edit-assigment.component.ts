import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as bootstrap from 'bootstrap';
// ❌ remove this line:
// import modal from 'bootstrap/js/dist/modal';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-edit-assigment',
  templateUrl: './rmtl-edit-assigment.component.html',
  styleUrls: ['./rmtl-edit-assigment.component.css']
})
export class RmtlEditAssigmentComponent implements OnInit {
  currentuser: string = 'SYSADMIN';
  inward_nos: any[] = [];
  device_statuses: any[] = [];
  users: any[] = [];
  benches: any[] = [];
  selectedUser: string = '';
  selectedBench: string = '';
  devices: any[] = [];
  filteredDevices: any[] = [];
  users_for_inward: any[] = [];

  assignment = {
    id: '',
    inward_no: '',
    device_status: 'ASSIGNED',
    assigned_to: '',
    device_ids: [] as number[],
    assignment_id: [] as number[],
    selected_user: '',
  };

  responseSuccess = false;
  responseMessage = '';
  payload: any;
  roles: string[] = ['TESTING_ASSISTANT'];

  // --- Alert Modal bindings ---
  @ViewChild('alertModal', { static: false }) alertModalEl!: ElementRef;
  private alertModalRef: bootstrap.Modal | null = null;
  modalTitle = '';
  modalMessage = '';
  modalVariant: 'success' | 'error' | 'info' = 'info';

  constructor(
    private api: ApiServicesService,
    private authapi: AuthService
  ) {}

  ngOnInit(): void {
    this.fetchEnums();
    this.fetchDistinctInwardNos();
  }

  // ---------- helpers for Alert Modal ----------
  private ensureAlertModal(): void {
    if (!this.alertModalRef && this.alertModalEl?.nativeElement) {
      this.alertModalRef = new bootstrap.Modal(this.alertModalEl.nativeElement, {
        backdrop: 'static',
        keyboard: false
      });
    }
  }

  private showAlert(title: string, message: string, variant: 'success' | 'error' | 'info' = 'info'): void {
    this.modalTitle = title;
    this.modalMessage = message;
    this.modalVariant = variant;
    this.ensureAlertModal();
    this.alertModalRef?.show();
  }

  // ---------- existing code (unchanged where not mentioned) ----------
  fetchEnums(): void {
    this.api.getEnums().subscribe({
      next: (res) => {
        // this.device_statuses = res.assignment_statuses;
        this.responseSuccess = true;
      },
      error: () => {
        this.responseSuccess = false;
      }
    });
  }

  fetchDistinctInwardNos(): void {
    this.api.getdistinctinwordno().subscribe({
      next: (res) => {
        this.inward_nos = res;
        this.responseMessage = 'Inward numbers fetched successfully';
        this.responseSuccess = true;
      },
      error: (err) => {
        this.responseMessage = err?.error?.details || 'Failed to fetch inward numbers';
        this.responseSuccess = false;
        this.showAlert('Error', this.responseMessage, 'error');
      }
    });
  }

  filterinword(): void {
    this.api.getDistinctinwordnobyAssignmentStatus(this.assignment.device_status).subscribe({
      next: (res) => {
        this.inward_nos = res;
        this.responseMessage = 'Filtered inward numbers';
        this.responseSuccess = true;
      },
      error: (err) => {
        const msg = err?.error?.details || 'Failed to filter inward numbers';
        this.responseMessage = msg;
        this.responseSuccess = false;
        this.showAlert('Error', msg, 'error');
      }
    });
  }

  filterUsers(): void {
    this.api.getUsers(this.roles).subscribe({
      next: (res) => {
        this.users_for_inward = res;
      },
      error: (err) => {
        this.showAlert('Error', err?.error?.details || 'Failed to fetch users.', 'error');
      }
    });
  }

  filterDevices(): void {
    this.api.getDevicesByInwardAndAssignmentStatus(this.assignment.inward_no, this.assignment.device_status).subscribe({
      next: (res) => {
        this.devices = (res || []).map((d: any) => ({ ...d, selected: false }));
        this.responseSuccess = true;
      },
      error: (err) => {
        this.responseSuccess = false;
        this.showAlert('Error', err?.error?.details || 'Failed to fetch devices.', 'error');
      }
    });
  }

  hasSelectedDevices(): boolean {
    return this.devices.some(d => d.selected);
  }

  openAssignModal(): void {
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

  onUpdate(): void {
    const selectedEntries = this.devices.filter(d => d.selected);

    if (!selectedEntries.length) {
      this.showAlert('No selection', 'Please select at least one device to update.', 'info');
      return;
    }
    if (!this.selectedUser || !this.selectedBench) {
      this.showAlert('Missing data', 'Please select both User and Bench.', 'info');
      return;
    }

    this.currentuser = this.authapi.getUserNameFromToken() ?? '';

    this.payload = {
      assignment_ids: selectedEntries.map(d => d.assignment.id),
      user_id: parseInt(this.selectedUser, 10),
      bench_id: parseInt(this.selectedBench, 10),
      assignment_type: this.assignment.device_status
    };

    // Close assign modal first (so the alert isn't hidden behind it)
    const assignEl = document.getElementById('assignModal');
    if (assignEl) bootstrap.Modal.getInstance(assignEl)?.hide();

    this.api.updateAssignment(this.payload).subscribe({
      next: (res) => {
        // Customize message as needed using backend response
        this.showAlert('Success', 'Assignment updated successfully!', 'success');

        // Clear table or refresh as per your flow
        this.devices = [];
        // Optionally refresh users/devices again
        // this.filterDevices();
      },
      error: (err) => {
        this.showAlert('Error', err?.error?.details || 'Assignment update failed!', 'error');
      }
    });
  }

  cancel(): void {
    // your cancel/reset logic if needed
  }

  toggleAllDevices(event: any): void {
    const checked = !!event.target?.checked;
    this.devices = this.devices.map(d => ({ ...d, selected: checked }));
  }

  assign(): void {
    const modal = bootstrap.Modal.getInstance(document.getElementById('assignModal')!);
    modal?.hide();
  }
}
