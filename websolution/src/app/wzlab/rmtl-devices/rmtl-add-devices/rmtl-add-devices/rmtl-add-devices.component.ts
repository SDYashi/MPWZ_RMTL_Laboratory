import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

interface Source {
  id: number;
  name: string;
}
type SourceType = 'STORE' | 'VENDOR' | 'OFFICE';

@Component({
  selector: 'app-rmtl-add-devices',
  templateUrl: './rmtl-add-devices.component.html',
  styleUrls: ['./rmtl-add-devices.component.css']
})
export class RmtlAddDevicesComponent {
  
  sourceTypes: SourceType[] = ['STORE', 'VENDOR', 'OFFICE'];
  selectedSourceType: SourceType = 'STORE';
  selectedSourceId: any;
  payload: any;

  // Mock source list
  allSources: Record<SourceType, Source[]> = {
    STORE: [{ id: 1, name: 'Indore Store' }, { id: 2, name: 'Bhopal Store' }],
    VENDOR: [{ id: 3, name: 'Tata Vendor' }, { id: 4, name: 'ABB Vendor' }],
    OFFICE: [{ id: 5, name: 'Zone HQ' }, { id: 6, name: 'Regional Office' }]
  };
  filteredSources: Source[] = [];

  // Devices
  devices: any[] = [];


  // Dropdown options
makes = ['HPL', 'Secure', 'Genus'];
capacities = ['5-30 AMPERE', '10-60 AMPERE'];
phases = ['1P', '3P'];
categories = ['DLMS', 'NON-DLMS'];
meterTypes = ['NET METER', 'STATIC METER'];

// Range form model
serialRange = {
  start: null,
  end: null,
  make: 'HPL',
  capacity: '5-30 AMPERE',
  phase: '1P',
  connection_type: 'HT',
  meter_category: 'DLMS',
  meter_type: 'NET METER'
};


  constructor(private deviceService: ApiServicesService) {
    this.onSourceTypeChange(); // Initialize filtered list
  }
  OnInit(): void {
   this.deviceService.getDevices().subscribe({
     next: (data) => this.devices = data,
     error: (err) => {
       console.error('Failed to load devices', err);
       alert('Could not load devices'+err);
     }
   });

  }

  onSourceTypeChange(): void {
    this.filteredSources = this.allSources[this.selectedSourceType];
    this.selectedSourceId = this.filteredSources?.[0]?.id || '';
  }

  addDevice(): void {
    this.devices.push({
      serial_number: '',
      make: '',
      capacity: '',
      phase: '',
      connection_type: 'HT',
      meter_category: '',
      meter_type: ''
    });
  }

  removeDevice(index: number): void {
    this.devices.splice(index, 1);
  }

  handleCSVUpload(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const lines = e.target.result.split('\n');
      for (let line of lines.slice(1)) {
        const [serial_number, make, capacity, phase, connection_type, meter_category, meter_type] = line.split(',');
        if (serial_number) {
          this.devices.push({ serial_number, make, capacity, phase, connection_type, meter_category, meter_type });
        }
      }
    };
    reader.readAsText(file);
  }

addSerialRange(): void {
  const { start, end } = this.serialRange;
  if (!start || !end || start > end) {
    alert("Invalid serial number range.");
    return;
  }

  for (let i = start; i <= end; i++) {
    this.devices.push({
      serial_number: `SN${i}`,
      make: this.serialRange.make,
      capacity: this.serialRange.capacity,
      phase: this.serialRange.phase,
      connection_type: this.serialRange.connection_type,
      meter_category: this.serialRange.meter_category,
      meter_type: this.serialRange.meter_type
    });
  }

  this.serialRange.start = null;
  this.serialRange.end = null;
}

  submitDevices(): void {
     this.payload = this.devices.map(device => ({
      serial_number: device.serial_number,
      make: device.make,
      capacity: device.capacity,
      phase: device.phase,
      connection_type: device.connection_type,
      meter_category: device.meter_category,
      meter_type: device.meter_type,
      source_type: this.selectedSourceType,
      source_id: this.selectedSourceId,
      created_at: new Date().toISOString()
    }));

    this.deviceService.createDevice(this.payload).subscribe({
      next: () => {
        alert('Devices added!');
        this.devices = [];
      },
      error: (err) => {
        console.error(err);
        alert('Error while submitting devices');
      }
    });
  }
}

