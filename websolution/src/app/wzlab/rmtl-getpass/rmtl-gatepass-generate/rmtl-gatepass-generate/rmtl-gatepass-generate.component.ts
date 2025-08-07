import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-gatepass-generate',
  templateUrl: './rmtl-gatepass-generate.component.html',
  styleUrls: ['./rmtl-gatepass-generate.component.css']
})
export class RmtlGatepassGenerateComponent  implements OnInit {

  inwardList: string[] = ['INW-1001', 'INW-1002', 'INW-1003'];
  selectedInwardNo: string = 'INW-1001';
  selectedDevices: any[] = [];

  devices: any[] = [
    {
      id: 1,
      serial_number: '001',
      make: 'HPL',
      meter_category: 'Single Phase',
      meter_type: 'Digital',
      phase: 'Single Phase'
    },
    {
      id: 2,
      serial_number: '002',
      make: 'L&T',
      meter_category: 'Three Phase',
      meter_type: 'Analog',
      phase: 'Three Phase'
    },
    {
      id: 3,
      serial_number: '003',
      make: 'Siemens',
      meter_category: 'Single Phase',
      meter_type: 'Digital',
      phase: 'Single Phase'
    }
  ];

  selectAll: boolean = false;

  gatepassInfo: any = null;

  constructor(private apiService: ApiServicesService) {}

  ngOnInit(): void {
    this.loadInwardList();
  }

  loadInwardList(): void {
    this.apiService.getAllInwardNumbers().subscribe({
      next: (res: any) => this.inwardList = res.inward_numbers || [],
      error: (err) => console.error('Error loading inward numbers', err)
    });
  }

  fetchDevices(): void {
    if (!this.selectedInwardNo) return;

    this.apiService.getTestedDevicesByInward(this.selectedInwardNo).subscribe({
      next: (res: any) => {
        this.devices = res.devices.map((d: any) => ({ ...d, selected: false }));
        this.selectAll = false;
      },
      error: (err) => {
        console.error('Error fetching tested devices', err);
        this.devices = [];
      }
    });
  }

  toggleAllDevices(): void {
    this.devices.forEach(device => device.selected = this.selectAll);
  }

  generateGatepass(): void {
    const selectedDevices = this.devices.filter(d => d.selected);
    if (!selectedDevices.length) return;

    const payload = {
      inward_no: this.selectedInwardNo,
      devices: selectedDevices.map(d => ({
        serial_number: d.serial_number,
        make: d.make,
        meter_category: d.meter_category,
        meter_type: d.meter_type,
        phase: d.phase
      }))
    };

    this.apiService.postGatepass(payload).subscribe({
      next: (res: any) => {
        this.gatepassInfo = res.gatepass;
        alert('Gatepass Generated!');
      },
      error: (err) => {
        console.error('Error generating gatepass', err);
        alert('Failed to generate gatepass');
      }
    });
  }

  printGatepass(): void {
    window.print();
  }
}

