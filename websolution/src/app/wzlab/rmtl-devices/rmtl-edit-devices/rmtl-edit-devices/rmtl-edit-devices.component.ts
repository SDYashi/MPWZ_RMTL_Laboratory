import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Device } from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-edit-devices',
  templateUrl: './rmtl-edit-devices.component.html',
  styleUrls: ['./rmtl-edit-devices.component.css']
})
export class RmtlEditDevicesComponent {

  devices: any[] = [];
  updatedPayload: Device = {} as Device;
  constructor(private deviceService: ApiServicesService) {}

  ngOnInit(): void {
    // this.loadDevices();
  }

  loadDevices(): void {
    this.deviceService.getDevices().subscribe({
      next: (data) => this.devices = data,
      error: (err) => {
        console.error('Failed to load devices', err);
        alert('Could not load devices');
      }
    });
  }

  submitBulkUpdate(): void {
     this.updatedPayload = this.devices.reduce((acc, device) => ({
      ...acc,
      ...device,
      updated_at: new Date().toISOString(),
      updated_by: 0
    }), {} as Device);

    this.deviceService.updateDevice( this.devices[0].id, this.updatedPayload).subscribe({
      next: () => {
        alert('Devices updated successfully!');
        this.loadDevices();
      },
      error: (err) => {
        console.error('Bulk update failed', err);
        alert('Bulk update failed!');
      }
    });
  }
}
