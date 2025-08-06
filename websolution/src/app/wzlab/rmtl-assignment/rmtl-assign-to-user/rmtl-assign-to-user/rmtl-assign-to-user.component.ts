import { Component } from '@angular/core';
import * as bootstrap from 'bootstrap';
import { Assignment } from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';
@Component({
  selector: 'app-rmtl-assign-to-user',
  templateUrl: './rmtl-assign-to-user.component.html',
  styleUrls: ['./rmtl-assign-to-user.component.css']
})
export class RmtlAssignToUserComponent {
inward_nos = ['INW-1001', 'INW-1002', 'INW-1003'];
  device_statuses = ['ASSIGNED', 'UNASSIGNED', 'PENDING', 'COMPLETED', 'NON_FUNCTIONAL'];
  devices = [
    { id: 1, name: 'Meter A', status: 'UNASSIGNED', selected: false },
    { id: 2, name: 'Meter B', status: 'PENDING', selected: false },
    { id: 3, name: 'Meter C', status: 'UNASSIGNED', selected: false }
  ];
  payload :any;
  users = ['user1', 'user2', 'user3'];

  selectedInward: string = '';
  selectedStatus: string = 'UNASSIGNED';
  assignedUser: string = '';

  filteredDevices: any[] = [];

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    this.filterDevices();
  }

  filterDevices(): void {
    this.filteredDevices = this.devices.filter(d => d.status === this.selectedStatus);
  }

  toggleAllDevices(event: any): void {
    const checked = event.target.checked;
    this.filteredDevices.forEach(d => d.selected = checked);
  }

  hasSelectedDevices(): boolean {
    return this.filteredDevices.some(d => d.selected);
  }

  openAssignModal(): void {
    const modal = new bootstrap.Modal(document.getElementById('assignModal')!);
    modal.show();
  }

  submitAssignment(): void {
    const selectedDeviceIds = this.filteredDevices
      .filter(d => d.selected)
      .map(d => d.id);

     this.payload= {
      inward_no: this.selectedInward,
      assigned_to: this.assignedUser,
      device_id: selectedDeviceIds[0],
      user_id: 1,
      assigned_by: 1
    };

    this.api.createAssignment(this.payload).subscribe({
      next: () => {
        alert('Assignment successful!');
        this.filteredDevices.forEach(d => d.selected = false);
      },
      error: (err) => {
        console.error('Assignment failed:', err);
      }
    });

    bootstrap.Modal.getInstance(document.getElementById('assignModal')!)?.hide();
  }
}
