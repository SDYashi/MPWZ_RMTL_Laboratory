import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { AuthService } from 'src/app/core/auth.service';

export interface TestedDeviceRow {
  id?: number | string;
  device_id?: number | string;
  report_id?: string;
  serial_number?: string;
  make?: string;
  meter_category?: string;
  meter_type?: string;
  phase?: string;
  tested_date?: string;
  test_result?: string;
  test_status?: string;
  test_method?: string;
  start_datetime?: string;
  end_datetime?: string;
  physical_condition_of_device?: string;
  seal_status?: string;
  meter_body?: string;
  meter_glass_cover?: string;
  terminal_block?: string;
  other?: string;
  details?: string;
  inward_number?: string;
  inward_date?: string;
  device_status?: string;
  capacity?: string;
  meter_class?: string;
  voltage_rating?: string;
  office_type?: string;
  location_code?: string;
  location_name?: string;
  device_type?: string;
  device_testing_purpose?: string;
  initiator?: string;
}

@Component({
  selector: 'app-rmtl-testreport-approved',
  templateUrl: './rmtl-testreport-approved.component.html',
  styleUrls: ['./rmtl-testreport-approved.component.css']
})
export class RmtlTestreportApprovedComponent implements OnInit {

  // Date filters
  fromDate = '';
  toDate   = '';
  device_status = 'APPROVED';  
   labId?: any = null; 
   user_id?: any = null;
  // Data & UI
  loading = false;
  errorMsg = '';
  rows: TestedDeviceRow[] = [];

  // pagination
  page = 1;
  pageSize = 1000;
  pages: number[] = [];
  pageRows: TestedDeviceRow[] = [];
  filtered: TestedDeviceRow[] = [];

  // details/offcanvas
  selectedRow: TestedDeviceRow | null = null;

  constructor(
    private api: ApiServicesService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
   
     // pull user & lab from token (fallback to localStorage)
    try {
      const user: any = this.auth?.getuserfromtoken?.();
      this.user_id = user?.id ?? '';
      this.labId = user?.lab_id ?? user?.currentLabId ?? null;
      this.user_id = user?.id ?? '';
    } catch {
      /* ignore */
    }
    if (this.labId == null) {
      const ls = localStorage.getItem('currentLabId');
      this.labId = ls ? Number(ls) : null;
    }
    if (this.user_id == null) {
      const ls = localStorage.getItem('currentUserId');
      this.user_id = ls ? Number(ls) : null;  
    }


    const now = new Date();
    this.fromDate = this.fmt(new Date(now.getFullYear(), now.getMonth(), 1));
    this.toDate   = this.fmt(now);
    this.fetchTestedDevices(true);
  }

  // ---- Helpers
  private fmt(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private resolveDateRange(): { from: string; to: string } {
    let { fromDate, toDate } = this;
    if (!fromDate && !toDate) {
      const now = new Date();
      return { from: this.fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: this.fmt(now) };
    }
    if (fromDate && !toDate) toDate = this.fmt(new Date());
    if (!fromDate && toDate) {
      const t = new Date(toDate);
      fromDate = this.fmt(new Date(t.getFullYear(), t.getMonth(), 1));
    }
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      [fromDate, toDate] = [toDate, fromDate];
    }
    return { from: fromDate, to: toDate };
  }

  private normalizeApiList(list: any[]): TestedDeviceRow[] {
    return (list || []).map((d: any) => ({
      id: d?.id,
      device_id: d?.device_id ?? d?.id,
      report_id: d?.report_id ?? undefined,
      serial_number: d?.serial_number ?? undefined,
      make: d?.make ?? undefined,
      meter_category: d?.meter_category ?? undefined,
      meter_type: d?.meter_type ?? undefined,
      phase: d?.phase ?? undefined,
      tested_date: d?.tested_date ?? d?.approved_date ?? d?.inward_date ?? d?.created_at ?? undefined,
      test_result: d?.test_result ?? undefined,
      test_status: d?.test_status ?? d?.device_status ?? undefined,
      test_method: d?.test_method ?? undefined,
      start_datetime: d?.start_datetime ?? undefined,
      end_datetime: d?.end_datetime ?? undefined,
      physical_condition_of_device: d?.physical_condition_of_device ?? undefined,
      seal_status: d?.seal_status ?? undefined,
      meter_body: d?.meter_body ?? undefined,
      meter_glass_cover: d?.meter_glass_cover ?? undefined,
      terminal_block: d?.terminal_block ?? undefined,
      other: d?.other ?? undefined,
      details: d?.details ?? undefined,
      inward_number: d?.inward_number ?? undefined,
      inward_date: d?.inward_date ?? undefined,
      device_status: d?.device_status ?? undefined,
      capacity: d?.capacity ?? undefined,
      meter_class: d?.meter_class ?? undefined,
      voltage_rating: d?.voltage_rating ?? undefined,
      office_type: d?.office_type ?? undefined,
      location_code: d?.location_code ?? undefined,
      location_name: d?.location_name ?? undefined,
      device_type: d?.device_type ?? undefined,
      device_testing_purpose: d?.device_testing_purpose ?? undefined,
      initiator: d?.initiator ?? undefined,
    } as TestedDeviceRow));
  }

  private isApproved(row: TestedDeviceRow): boolean {
    const v = (row.test_status || row.device_status || '').toString().trim().toUpperCase();
    return v === 'APPROVED';
  }

  onDatesChange(): void {
    this.page = 1;
    this.fetchTestedDevices(true);
  }

  fetchTestedDevices(reset = false): void {
    if (reset) {
      this.page = 1;
    }
    this.loading = true;
    this.errorMsg = '';

    const { from, to } = this.resolveDateRange();

    this.api.getTestedDevices(from, to, this.device_status, this.labId).subscribe({
      next: (list: any[]) => {
        // normalize and keep only APPROVED
        const all = this.normalizeApiList(Array.isArray(list) ? list : []);
        this.rows = all.filter(r => this.isApproved(r));
        this.filtered = this.rows.slice();
        this.repaginate();
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.errorMsg = err?.error?.detail || err?.message || 'Failed to load approved devices.';
        this.rows = [];
        this.filtered = [];
        this.pageRows = [];
        this.pages = [];
        this.loading = false;
      }
    });
  }

  // Pagination
  private repaginate(): void {
    const totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    this.page = Math.min(this.page, totalPages);
    this.pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = (this.page - 1) * this.pageSize;
    this.pageRows = this.filtered.slice(start, start + this.pageSize);
  }
  goto(p: number): void {
    if (p < 1) return;
    const max = this.pages[this.pages.length - 1] || 1;
    if (p > max) return;
    this.page = p;
    this.repaginate();
  }

  // Off-canvas details
  // selectedRow: TestedDeviceRow | null = null;
  openDetails(r: TestedDeviceRow): void {
    this.selectedRow = r;
    const el = document.getElementById('detailsCanvas');
    if (el && (window as any)['bootstrap']?.Offcanvas) {
      const off = new (window as any)['bootstrap'].Offcanvas(el);
      off.show();
    }
  }

  // tracking
  trackById = (_: number, r: TestedDeviceRow) => r.device_id ?? r.id ?? _;
}
