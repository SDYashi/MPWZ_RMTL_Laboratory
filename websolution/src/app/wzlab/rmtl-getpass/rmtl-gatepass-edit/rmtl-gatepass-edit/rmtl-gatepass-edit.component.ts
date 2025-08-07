import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-gatepass-edit',
  templateUrl: './rmtl-gatepass-edit.component.html',
  styleUrls: ['./rmtl-gatepass-edit.component.css']
})
export class RmtlGatepassEditComponent  implements OnInit {

  gatepassList: string[] = [];
  selectedGatepassId: string = '';

  gatepassData: any = null;
  devices: any[] = [];
  selectAll: boolean = false;

  constructor(private apiService: ApiServicesService) {}

  ngOnInit(): void {
    this.loadGatepassList();
  }

  loadGatepassList(): void {
    this.apiService.getAllGatepassIds().subscribe({
      next: (res: any) => this.gatepassList = res.gatepass_ids || [],
      error: (err) => console.error('Error loading gatepass list', err)
    });
  }

  loadGatepass(): void {
    if (!this.selectedGatepassId) return;

    this.apiService.getGatepassById(this.selectedGatepassId).subscribe({
      next: (res: any) => {
        this.gatepassData = res.gatepass;
        this.devices = res.devices.map((d: any) => ({ ...d, selected: true }));
        this.selectAll = true;
      },
      error: (err) => {
        console.error('Error loading gatepass details', err);
        this.gatepassData = null;
        this.devices = [];
      }
    });
  }

  toggleAll(): void {
    this.devices.forEach(d => d.selected = this.selectAll);
  }

  updateGatepass(): void {
    const selectedDevices = this.devices.filter(d => d.selected);
    if (!selectedDevices.length) return;

    const payload = {
      gatepass_id: this.selectedGatepassId,
      updated_devices: selectedDevices
    };

    this.apiService.updateGatepass(payload).subscribe({
      next: () => {
        alert('Gatepass updated successfully!');
      },
      error: (err) => {
        console.error('Failed to update gatepass', err);
        alert('Update failed');
      }
    });
  }

  printGatepass(): void {
    window.print();
  }
}
