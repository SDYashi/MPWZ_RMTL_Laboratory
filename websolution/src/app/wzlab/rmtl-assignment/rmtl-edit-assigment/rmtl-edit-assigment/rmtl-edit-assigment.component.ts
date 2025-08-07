import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as bootstrap from 'bootstrap';
import modal from 'bootstrap/js/dist/modal';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-edit-assigment',
  templateUrl: './rmtl-edit-assigment.component.html',
  styleUrls: ['./rmtl-edit-assigment.component.css']
})
export class RmtlEditAssigmentComponent {
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
    device_status: '',
    assigned_to: '',
    device_ids: [] as number[],
    assignment_id: [] as number[],
    selected_user: '',
  };

  responseSuccess: boolean = false;
  responseMessage: string = '';
  payload: any;

  constructor(
    private api: ApiServicesService,
    private authapi: AuthService
  ) {}

  ngOnInit(): void {
    this.fetchEnums();
    this.fetchDistinctInwardNos();
  }

  fetchEnums(): void {
    this.api.getEnums().subscribe({
      next: (res) => {
        this.device_statuses = res.assignment_statuses;
        this.responseSuccess = true;
      },
      error: (err) => {
        console.error('Failed to fetch enums', err);
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
        this.responseMessage = err?.error?.details || 'Failed to filter inward numbers';
        this.responseSuccess = false;
      }
    });
  }

  filterUsers(): void {
    this.api.getUsers().subscribe({
      next: (res) => {
        this.users_for_inward = res;
      },
      error: (err) => {
        console.error('Failed to fetch users', err);
      }
    });
  }

  // filterDevices(): void {
  //   this.api.getDevicesByInwardAndAssignmentStatus(this.assignment.inward_no, this.assignment.device_status).subscribe({
  //     next: (res) => {
  //       this.filteredDevices = res.filter(d => d.user.username === this.assignment.selected_user);
  //       this.responseMessage = 'Devices filtered successfully';
  //       this.responseSuccess = true;
  //     },
  //     error: (err) => {
  //       this.responseMessage = err?.error?.details || 'Failed to fetch devices';
  //       this.responseSuccess = false;
  //     }
  //   });
  // }
filterDevices(): void {
  this.api.getDevicesByInwardAndAssignmentStatus(this.assignment.inward_no, this.assignment.device_status).subscribe({
    next: (res) => {
      this.devices = res.map((d: any) => ({ ...d, selected: false }));
      this.responseSuccess = true;
    },
    error: () => {
      this.responseSuccess = false;
    }
  });
}



hasSelectedDevices(): boolean {
  return this.devices.some(d => d.selected);
}


  openAssignModal(): void {
    this.api.getUsers().subscribe({
      next: (res) => {
        this.users = res;
      },
      error: (err) => {
        console.error('Failed to fetch users', err);
      }
    });

    this.api.getTestingBenches().subscribe({
      next: (res) => {
        this.benches = res;
      },
      error: (err) => {
        console.error('Failed to fetch benches', err);
      }
    });

    const modal = new bootstrap.Modal(document.getElementById('assignModal')!);
    modal.show();
  }

onUpdate(): void {
  const selectedEntries = this.devices.filter(d => d.selected);

  if (!selectedEntries.length) {
    alert('Please select at least one device to update.');
    return;
  }

  this.currentuser = this.authapi.getUserNameFromToken() ?? '';

  this.payload = {
    assignment_ids: selectedEntries.map(d => d.assignment.id),
    user_id: parseInt(this.selectedUser, 10),
    bench_id: parseInt(this.selectedBench, 10),
    assignment_type: this.assignment.device_status
  };

  this.api.updateAssignment(this.payload).subscribe({
    next: () => {
      alert('Assignment updated successfully!');
      const modal = bootstrap.Modal.getInstance(document.getElementById('assignModal')!);
      modal?.hide();
       this.devices=[];
      

    },
    error: (err) => {
      console.error('Update failed:', err);
      alert('Assignment update failed!');
    }
  });
}


  cancel(): void {
    // Resetting form or navigating away logic if needed
  }

toggleAllDevices(event: any): void {
  const checked = event.target.checked;
  this.devices.forEach(d => d.selected = checked);
}


  assign(): void {
    const modal = bootstrap.Modal.getInstance(document.getElementById('assignModal')!);
    modal?.hide();
  }
}
