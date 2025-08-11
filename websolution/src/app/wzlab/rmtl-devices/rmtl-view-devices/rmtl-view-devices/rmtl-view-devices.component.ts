import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-view-devices',
  templateUrl: './rmtl-view-devices.component.html',
  styleUrls: ['./rmtl-view-devices.component.css']
})
export class RmtlViewDevicesComponent implements OnInit {
  devices: any[] = [];
  fromDate: string = '';
  toDate: string = '';
  loading = false;

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    this.setThisMonthRange();
    this.fetchDevices();
  }

  setThisMonthRange(): void {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    this.fromDate = this.toYMD(first);
    this.toDate = this.toYMD(now);
  }

  toYMD(d: Date): string {
    // local yyyy-MM-dd
    const dt = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return dt.toISOString().slice(0, 10);
  }

  fetchDevices(): void {
    this.loading = true;
    // Assumes your service accepts optional from/to (yyyy-MM-dd).
    // Adjust signature if your method name/params differ.
    // this.api.getDevices(this.fromDate, this.toDate).subscribe({
    this.api.getDevices().subscribe({
      next: (response) => {
        this.devices = response || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching devices:', error);
        this.devices = [];
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    if (!this.fromDate || !this.toDate) return;
    this.fetchDevices();
  }

  resetToThisMonth(): void {
    this.setThisMonthRange();
    this.fetchDevices();
  }
}
