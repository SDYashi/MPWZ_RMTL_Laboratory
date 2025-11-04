import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import {
  InwardReceiptPdfService,
  InwardReceiptData,
  InwardReceiptItem
} from 'src/app/shared/inward-receipt-pdf.service';

type DeviceStatus = 'INWARDED' | 'DISPATCHED' | 'PENDING' | string;

@Component({
  selector: 'app-rmtl-view-devices',
  templateUrl: './rmtl-view-devices.component.html',
  styleUrls: ['./rmtl-view-devices.component.css']
})
export class RmtlViewDevicesComponent implements OnInit {
  // Raw list (all rows fetched)
  private allDevices: any[] = [];
  searchText: any;

  // Visible (after filtering)
  devices: any[] = [];

  fromDate = '';
  toDate = '';
  loading = false;

  // Pagination
  page = 1;
  pageSize = 25;
  pageSizeOptions = [100, 500, 1000, 10000];
  total = 0;
  

  constructor(
    private api: ApiServicesService,
    private inwardPdf: InwardReceiptPdfService
  ) {}

  // Reusable PDF header (matches your branding/screenshot)
  private pdfHeader = {
    orgLine: 'MADHYA PRADESH PASCHIM KHETRA VIDYUT VITARAN COMPANY LIMITED',
    labLine: 'REGINAL METERING TESTING LABORATORY INDORE',
    addressLine: 'MPPKVVCL Near Conference Hall, Polo Ground, Indore (MP) 452003',
    email: 'testinglabwzind@gmail.com',
    phone: '0731-2997802',
    leftLogoUrl: '/assets/icons/wzlogo.png',
    rightLogoUrl: '/assets/icons/wzlogo.png',
    logoWidth: 36,
    logoHeight: 36
  };

  ngOnInit(): void {
    this.setThisMonthRange();
    this.fetchDevices();
  }

  // -------- Date helpers --------
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

  // -------- Load + Filter --------
  fetchDevicesOrBySerial(): void {
    if (!this.searchText) {
      this.fetchDevices();
    } else {
      this.fetchDevicesbySerailno();
    }
  }

  fetchDevicesbySerailno(): void {
    this.loading = true;
    this.api.getDevicesbySerailno(this.searchText).subscribe({
      next: (response: any) => {
        const rows = Array.isArray(response?.device)
          ? response.device
          : Array.isArray(response)
          ? response
          : [];

        this.total = Number(response?.totalrecord ?? rows.length) || rows.length;
        if (response?.pagesize) this.pageSize = Number(response.pagesize) || this.pageSize;

        this.allDevices = rows.map((r: any) => ({
          ...r,
          inward_date: r?.inward_date || (r?.created_at ? String(r.created_at).slice(0, 10) : null),
          device_status: (r?.device_status || '').toUpperCase() as DeviceStatus
        }));
        this.applyFilter(false);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching devices:', error);
        this.loading = false;
      }
    });
  }

  fetchDevices(): void {
    this.loading = true;
    this.api.getDevices(this.fromDate, this.toDate).subscribe({
      next: (response: any) => {
        const rows = Array.isArray(response?.device)
          ? response.device
          : Array.isArray(response)
          ? response
          : [];

        this.total = Number(response?.totalrecord ?? rows.length) || rows.length;
        if (response?.pagesize) this.pageSize = Number(response.pagesize) || this.pageSize;

        this.allDevices = rows.map((r: any) => ({
          ...r,
          inward_date: r?.inward_date || (r?.created_at ? String(r.created_at).slice(0, 10) : null),
          device_status: (r?.device_status || '').toUpperCase() as DeviceStatus
        }));

        this.applyFilter(false);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching devices:', error);
        this.allDevices = [];
        this.devices = [];
        this.total = 0;
        this.page = 1;
        this.loading = false;
      }
    });
  }

  /** Apply date filter (inclusive) */
  applyFilter(refetch: boolean = false): void {
    if (refetch) {
      this.fetchDevices();
      return;
    }
    const from = this.fromDate ? new Date(this.fromDate + 'T00:00:00') : null;
    const to   = this.toDate   ? new Date(this.toDate   + 'T23:59:59') : null;

    const inRange = (d: any) => {
      const str = d?.inward_date || null;
      if (!str) return false;
      const dt = new Date(str + 'T00:00:00');
      if (from && dt < from) return false;
      if (to && dt > to) return false;
      return true;
    };

    this.devices = this.allDevices.filter(inRange);
    this.total = this.devices.length;
    this.page = 1;
  }

  resetToThisMonth(): void {
    this.setThisMonthRange();
    this.applyFilter();
  }

  // ------- Pagination helpers -------
  get indexOfFirst(): number { return (this.page - 1) * this.pageSize; }
  get indexOfLast(): number { return Math.min(this.indexOfFirst + this.pageSize, this.total); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }

  pagedDevices(): any[] {
    if (!this.devices || this.devices.length === 0) return [];
    return this.devices.slice(this.indexOfFirst, this.indexOfLast);
  }

  goToPage(p: number): void { if (p >= 1 && p <= this.totalPages) this.page = p; }
  next(): void { if (this.page < this.totalPages) this.page++; }
  prev(): void { if (this.page > 1) this.page--; }

  pageWindow(radius: number = 2): number[] {
    const start = Math.max(1, this.page - radius);
    const end = Math.min(this.totalPages, this.page + radius);
    const arr: number[] = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  }

  // ------- UI helpers -------
  statusBadgeClass(status?: string): string {
    switch ((status || '').toUpperCase()) {
      case 'INWARDED': return 'bg-info text-dark';
      case 'DISPATCHED': return 'bg-success';
      case 'PENDING': return 'bg-warning text-dark';
      default: return 'bg-secondary';
    }
  }

  deviceTypeIcon(type?: string): string {
    const t = (type || '').toUpperCase();
    if (t === 'METER') return 'bi-cpu';
    if (t === 'CT' || t === 'PT') return 'bi-lightning';
    return 'bi-box';
  }

  // -------- PDF Receipt --------
  downloadInwardReceipt(inwardNo: string): void {
    if (!inwardNo) return;

    // Group by inward number
    const group = this.allDevices.filter(d => d.inward_number === inwardNo);
    if (!group.length) return;

    const first = group[0];
    const deviceType: 'METER' | 'CT' =
      (String(first?.device_type || '').toUpperCase() as 'METER' | 'CT') || 'METER';

    // Map items based on device type
    const items: InwardReceiptItem[] = group.map((d: any, i: number) => {
      if (deviceType === 'CT') {
        return {
          sl: i + 1,
          serial_number: d.serial_number,
          make: d.make,
          connection_type: d.connection_type ?? '',
          ct_class: d.ct_class ?? '',
          ct_ratio: d.ct_ratio ?? '',
          purpose: d.device_testing_purpose ?? '',
          remark: d.remark ?? ''
        };
      }
      // METER
      return {
        sl: i + 1,
        serial_number: d.serial_number,
        make: d.make,
        capacity: d.capacity ?? '',
        phase: d.phase ?? '',
        connection_type: d.connection_type ?? '',
        meter_category: d.meter_category ?? '',
        meter_type: d.meter_type ?? '',
        voltage_rating: d.voltage_rating ?? '',
        current_rating: d.current_rating ?? '',
        purpose: d.device_testing_purpose ?? '',
        remark: d.remark ?? ''
      };
    });

    const receipt: InwardReceiptData = {
      inward_no: inwardNo,
      lab_id: first?.lab_id ?? undefined,
      office_type: first?.office_type ?? undefined,
      location_code: first?.location_code ?? null,
      location_name: first?.location_name ?? null,
      date_of_entry: first?.inward_date || this.toYMD(new Date()),
      device_type: deviceType,
      total: items.length,
      items,
      serials_csv: items.map(i => i.serial_number).join(', ')
    };

    const fileName =
      `Inward_Receipt_${receipt.device_type || 'DEVICE'}_${receipt.date_of_entry || ''}.pdf`;

    // Call the new service with header + table
    this.inwardPdf.download(receipt, {
      fileName,
      header: this.pdfHeader,
      showItemsTable: true
      // columns: 3,        // optional: force serial columns (auto if omitted)
      // includeNotes: true // optional: show notes (default true)
    });
  }
}
