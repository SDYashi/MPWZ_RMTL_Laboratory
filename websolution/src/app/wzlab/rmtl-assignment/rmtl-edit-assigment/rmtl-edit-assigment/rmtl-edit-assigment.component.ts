import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-edit-assigment',
  templateUrl: './rmtl-edit-assigment.component.html',
  styleUrls: ['./rmtl-edit-assigment.component.css']
})
export class RmtlEditAssigmentComponent {

  inward_nos = ['INW-1001', 'INW-1002', 'INW-1003'];
  device_statuses = ['ASSIGNED', 'UNASSIGNED', 'PENDING', 'COMPLETED', 'NON_FUNCTIONAL'];
  users = ['user1', 'user2', 'user3'];

  devices: any[] = [];
  filteredDevices: any[] = [];

  assignment = {
    inward_no: '',
    device_status: '',
    assigned_to: '',
    device_ids: [] as number[]
  };

  constructor(
    private api: ApiServicesService
  ) {}

  ngOnInit(): void { 
    const selectedInward = this.inward_nos[0];
    const selectedStatus = this.device_statuses[0];
    this.loadDevices(selectedInward, selectedStatus);
  }

  loadDevices(inward_no: string, device_status: string): void {
    this.api.getDevices().subscribe({
      next: (data) => {
        this.devices = data.filter(d => d.inward_no === inward_no && d.status === device_status);

        this.filterDevices();
      },
      error: (err) => console.error('Failed to load devices:', err)
    });
  }

  filterDevices(): void {
    this.filteredDevices = this.devices.filter(d => d.status === this.assignment.device_status);
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
      assigned_to: this.assignment.assigned_to,
      device_status: this.assignment.device_status,
      device_ids: selectedDeviceIds
    };

    this.api.updateAssignment(1, this.payload).subscribe({
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
}

