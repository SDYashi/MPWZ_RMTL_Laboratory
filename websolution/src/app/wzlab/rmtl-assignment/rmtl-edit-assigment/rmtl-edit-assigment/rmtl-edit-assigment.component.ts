import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as bootstrap from 'bootstrap';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-edit-assigment',
  templateUrl: './rmtl-edit-assigment.component.html',
  styleUrls: ['./rmtl-edit-assigment.component.css']
})
export class RmtlEditAssigmentComponent {

  inward_nos:any = [];
  device_statuses = [];
  users: any[] = [];
benches : any[] = [];
selectedUser: string = '';
selectedBench: string = '';
  devices: any[] = [];
  filteredDevices: any[] = [];

  assignment = {
    id: '',
    inward_no: '',
    device_status: '',
    assigned_to: '',
    device_ids: [] as number[],
    assignment_id: '', 

  };
  responseSuccess: boolean = false;
  responseMessage: string = '';

  constructor(
    private api: ApiServicesService
  ) {}

  ngOnInit(): void { 

        this.api.getEnums().subscribe({
      next: (res) => {
        this.device_statuses = res.assignment_statuses;
        this.responseSuccess = true;
      },
      error: (err) => {
        console.error('Failed to fetch labs', err);
        this.responseSuccess = false;
      }
    });
       this.api.getdistinctinwordno().subscribe({
    next: (res) => {
      this.inward_nos = res;
      this.responseMessage= 'Data fetched successfully!';
       this.responseSuccess = true;
    },
    error: (err) => {
       this.responseMessage= err?.error?.details || 'Failed to fetch data.';
        this.responseSuccess = false;
    }
   })
  }  


  filterDevices(): void {
    // this.filteredDevices = this.devices.filter(d => d.status === this.assignment.device_status);
    this.api.getDevicesByInwardAndAssignmentStatus(this.assignment.inward_no, this.assignment.device_status).subscribe({
      next: (res) => {
        this.filteredDevices = res;
        this.responseMessage= 'Data fetched successfully!';
        this.responseSuccess = true;
      },
      error: (err) => {
        this.responseMessage= err?.error?.details || 'Failed to fetch data.';
        this.responseSuccess = false;
      }
    })
  }

  toggleAllDevices(event: any): void {
    const checked = event.target.checked;
    this.filteredDevices.forEach(d => d.selected = checked);
  }

  hasSelectedDevices(): boolean {
    return this.filteredDevices.some(d => d.selected);
  }

  payload :any;
  onUpdate(): void {
    const selectedDeviceIds = this.filteredDevices.filter(d => d.selected).map(d => d.id);

     this.payload = {
      inward_no: this.assignment.inward_no,
      assigned_to: this.selectedUser,
      device_status: this.assignment.device_status,
      device_ids: selectedDeviceIds,
      user_id: this.selectedUser,
      assigned_by: 1,
      bench_id: parseInt(this.selectedBench, 10),
      assignment_id: parseInt(this.assignment.id, 10)

    };

    this.api.updateAssignment(parseInt(this.assignment.id, 10), this.payload).subscribe({
      next: () => {
        alert('Assignment updated successfully!');
      },
      error: (err) => {
        console.error('Update failed:', err);
      }
    });
  }

  cancel(): void {
  }

  openAssignModal(): void {
        this.api.getUsers().subscribe({
      next: (res) => {
        this.users = res;
      },
      error: (err) => {
        console.error('Failed to fetch users', err);
      }
    })
    this.api.getTestingBenches().subscribe({
      next: (res) => {
        this.benches = res;
      },
      error: (err) => {
        console.error('Failed to fetch devices', err);
      }
    })
    const modal = new bootstrap.Modal(document.getElementById('assignModal')!);
    modal.show();
  }
  assign(): void {
    const modal = new bootstrap.Modal(document.getElementById('assignModal')!);
    modal.hide();
  }
}

