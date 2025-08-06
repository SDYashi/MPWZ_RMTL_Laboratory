import { Component } from '@angular/core';

@Component({
  selector: 'app-rmtl-dashboard-devices',
  templateUrl: './rmtl-dashboard-devices.component.html',
  styleUrls: ['./rmtl-dashboard-devices.component.css']
})
export class RmtlDashboardDevicesComponent {


  devices = [
    {
      inward_number: 'INW-1-2025-1',
      device_status: 'INWARDED',
      make: 'ELYMER',
      serial_number: 'SN123456789012',
      device_type: 'METER',
      meter_category: 'DLMS',
      location_name: 'Indore Division',
      connection_type: 'HT',
      date_of_entry: new Date('2025-08-04')
    },
    {
      inward_number: 'INW-1-2025-2',
      device_status: 'DISPATCHED',
      make: 'HPL',
      serial_number: 'SN987654321098',
      device_type: 'METER',
      meter_category: 'STATIC',
      location_name: 'Ujjain Division',
      connection_type: 'LT',
      date_of_entry: new Date('2025-08-02')
    },
    {
      inward_number: 'INW-1-2025-3',
      device_status: 'INWARDED',
      make: 'SECURE',
      serial_number: 'SN456789123456',
      device_type: 'CT',
      meter_category: 'DLMS',
      location_name: 'Dewas Division',
      connection_type: 'HT',
      date_of_entry: new Date('2025-08-06')
    }
  ];

  get inwardCount(): number {
    return this.devices.filter(d => d.device_status === 'INWARDED').length;
  }

  get dispatchedCount(): number {
    return this.devices.filter(d => d.device_status === 'DISPATCHED').length;
  }
}
