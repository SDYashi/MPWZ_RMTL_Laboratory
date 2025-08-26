import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-view-devices',
  templateUrl: './rmtl-view-devices.component.html',
  styleUrls: ['./rmtl-view-devices.component.css']
})
export class RmtlViewDevicesComponent implements OnInit {
  devices: any[] = [];
  fromDate = '';
  toDate = '';
  loading = false;

  // Pagination state
  page = 1;
  pageSize = 25;
  pageSizeOptions = [10, 25, 50, 100];
  total = 0;

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
    const dt = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return dt.toISOString().slice(0, 10);
  }

  fetchDevices(): void {
    this.loading = true;

    // If your API already supports server-side pagination, prefer this:
    // this.api.getDevices({ fromDate: this.fromDate, toDate: this.toDate, page: this.page, pageSize: this.pageSize })
    //   .subscribe({
    //     next: (res) => {
    //       this.devices = res.items || [];
    //       this.total = res.total || this.devices.length;
    //       this.loading = false;
    //     },
    //     error: () => { this.devices = []; this.total = 0; this.loading = false; }
    //   });

    // Client-side pagination (fetch all, paginate in UI)
    this.api.getDevices().subscribe({
      next: (response) => {
        this.devices = response || [];
        this.total = this.devices.length;
        this.page = 1; // reset to first page on new fetch
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching devices:', error);
        this.devices = [];
        this.total = 0;
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    if (!this.fromDate || !this.toDate) return;
    this.page = 1; // reset to first page
    this.fetchDevices();
  }

  resetToThisMonth(): void {
    this.setThisMonthRange();
    this.page = 1;
    this.fetchDevices();
  }

  // ------- Pagination helpers (client-side) -------
  get indexOfFirst(): number {
    return (this.page - 1) * this.pageSize;
  }

  get indexOfLast(): number {
    return Math.min(this.indexOfFirst + this.pageSize, this.total);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  pagedDevices(): any[] {
    if (!this.devices || this.devices.length === 0) return [];
    return this.devices.slice(this.indexOfFirst, this.indexOfLast);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
  }

  next(): void {
    if (this.page < this.totalPages) this.page++;
  }

  prev(): void {
    if (this.page > 1) this.page--;
  }

  /** Generates a small window of page numbers around the current page */
  pageWindow(radius: number = 2): number[] {
    const start = Math.max(1, this.page - radius);
    const end = Math.min(this.totalPages, this.page + radius);
    const arr: number[] = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  }
}
