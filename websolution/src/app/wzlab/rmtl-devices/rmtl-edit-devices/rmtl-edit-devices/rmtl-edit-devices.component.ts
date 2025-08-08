import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Device } from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-edit-devices',
  templateUrl: './rmtl-edit-devices.component.html',
  styleUrls: ['./rmtl-edit-devices.component.css']
})
export class RmtlEditDevicesComponent  implements OnInit {

  inwardList: string[] = ['IN001', 'IN002', 'IN003', 'IN004'];
  selectedInwardNo: string = '';
fromDate: string = '';
  toDate: string = '';
  
  selectedSourceType: string = '';
  selectedSourceName: string = '';
  devices: any[] = [
    {
      "id": 1,
      "inward_number": "IN001",
      "serial_number": "SN001",
      "make": "Schneider",
      "capacity": "5A",
      "phase": "1P",
      "meter_category": "Single Phase",
      "meter_type": "Smart",
      "connection_type": "HT",
      "location_name": "Bangalore",
      "date_of_entry": "2023-01-01"
    },
    {
      "id": 2,
      "inward_number": "IN002",
      "serial_number": "SN002",
      "make": "Siemens",
      "capacity": "10A",
      "phase": "3P",
      "meter_category": "Three Phase",
      "meter_type": "Analog",
      "connection_type": "LT",
      "location_name": "Chennai",
      "date_of_entry": "2023-01-02"
    },
    {
      "id": 3,
      "inward_number": "IN003",
      "serial_number": "SN003",
      "make": "ABB",
      "capacity": "20A",
      "phase": "3P",
      "meter_category": "Three Phase",
      "meter_type": "Smart",
      "connection_type": "HT",
      "location_name": "Delhi",
      "date_of_entry": "2023-01-03"
    }];

  office_types: string[] = [];
  makes: string[] = [];
  capacities: string[] = [];
  phases: string[] = [];
  meter_categories: string[] = [];
  meterTypes: string[] = [];

  constructor(
    private apiService: ApiServicesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Load dropdown enums
    this.apiService.getEnums().subscribe({
      next: (data) => {
        this.makes = data.makes;
        this.capacities = data.capacities;
        this.phases = data.phases;
        this.meter_categories = data.meter_categories;
        this.meterTypes = data.meter_types;
        this.office_types = data.office_types;
      }
    });

    // Load all inward numbers
    this.loadInwardList();
  }

  loadInwardList(): void {
    this.apiService.getAllInwardNumbers().subscribe({
      next: (data: any) => {
        this.inwardList = data.inward_numbers || [];
      },
      error: (err) => {
        console.error('Failed to fetch inward numbers', err);
      }
    });
  }

  onInwardChange(): void {
    if (!this.selectedInwardNo) return;

    this.apiService.getDevicesByInwardNo(this.selectedInwardNo).subscribe({
      next: (data: any) => {
        this.devices = data.devices || [];
        this.selectedSourceType = data.source_type;
        this.selectedSourceName = data.source_name;
      },
      error: (err) => {
        console.error('Error fetching devices', err);
        this.devices = [];
      }
    });
  }

  addDevice(): void {
    this.devices.push({
      serial_number: '',
      make: '',
      capacity: '',
      phase: '',
      connection_type: '',
      meter_category: '',
      meter_type: ''
    });
  }

  removeDevice(index: number): void {
    this.devices.splice(index, 1);
  }

  updateDevices(): void {
    const payload = {
      inward_no: this.selectedInwardNo,
      source_type: this.selectedSourceType,
      source_id: this.selectedSourceName,
      devices: this.devices.map(d => ({
        ...d,
        serial_number: d.serial_number?.trim(),
        created_at: new Date().toISOString()
      }))
    };

    this.apiService.updateDeviceList(payload).subscribe({
      next: () => {
        alert('Devices updated successfully!');
        this.router.navigate(['/wzlab/devices']);
      },
      error: (err) => {
        console.error(err);
        alert('Update failed.');
      }
    });
  }
}
