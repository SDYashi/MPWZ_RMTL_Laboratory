import { Component } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-add-devices',
  templateUrl: './rmtl-add-devices.component.html',
  styleUrls: ['./rmtl-add-devices.component.css']
})
export class RmtlAddDevicesComponent {

 // Common fields shared across all devices
  commonFields = {
    lab_id: 0,
    office_type: 'STORE',
    device_status: 'INWARDED'
  };
  payload: any[] = [];

  // Devices array
  devices: any[] = [
    { serial_number: '', make: 'HPL', capacity: '5-30 AMPERE', phase: '1P', connection_type: 'HT', meter_category: 'DLMS', meter_type: 'NET METER' }
  ];

  constructor(private deviceService: ApiServicesService) {}

  addDevice(): void {
    this.devices.push({ serial_number: '', make: '', capacity: '', phase: '', connection_type: 'HT', meter_category: '', meter_type: '' });
  }

  removeDevice(index: number): void {
    this.devices.splice(index, 1);
  }

  submitDevices(): void {
    this.payload = this.devices.map(device => ({
      user: null, // Assign appropriate user value
      assigned_to: 0, // Assign appropriate assigned_to value
      status: this.commonFields.device_status,
      inward_no: '', // Assign appropriate inward_no value
      id: undefined,
      inward_number: '', // Assign appropriate inward_number value
      device_type: 'meter', // Assign appropriate device_type value
      serial_number: device.serial_number,
      make: device.make,
      capacity: device.capacity,
      date_of_entry: new Date().toISOString().split('T')[0],
      phase: device.phase,
      // Add other fields as necessary
      lab_id: this.commonFields.lab_id,
      connection_type: device.connection_type,
      meter_category: device.meter_category,
      meter_type: device.meter_type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 0,
      updated_by: 0,
      transaction_amount: 0,
      transaction_datetime: new Date().toISOString(),
    }));

    // Send to backend
    this.deviceService.createDevice(this.payload[0]).subscribe({
      next: (response) => {
        alert('Devices added successfully!');
        this.devices = [{ serial_number: '', make: 'HPL', capacity: '5-30 AMPERE', phase: '1P', connection_type: 'HT', meter_category: 'DLMS', meter_type: 'NET METER' }];
      },
      error: (err) => {
        console.error('Error adding devices', err);
        alert('Failed to add devices.');
      }
    });
  }
}
