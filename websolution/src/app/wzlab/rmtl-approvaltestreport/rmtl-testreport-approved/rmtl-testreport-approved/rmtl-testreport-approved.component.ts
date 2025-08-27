import { Component, OnInit, AfterViewInit, ChangeDetectorRef, NgZone } from '@angular/core';
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

  // Added for Approved UI
  approver_id?: number | string | null;
  approver_remark?: string | null;
  assignment_status?: string | null;
}

@Component({
  selector: 'app-rmtl-testreport-approved',
  templateUrl: './rmtl-testreport-approved.component.html',
  styleUrls: ['./rmtl-testreport-approved.component.css']
})
export class RmtlTestreportApprovedComponent implements OnInit, AfterViewInit {

  // Date filters
  fromDate = '';
  toDate   = '';
  device_status = 'APPROVED';

  // user / lab
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

  ngAfterViewInit(): void {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map((el: any) => {
      const Tooltip = (window as any)['bootstrap'] && (window as any)['bootstrap'].Tooltip;
      if (Tooltip) {
        new Tooltip(el);
      }
    });
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

  /** Normalize API → TestedDeviceRow (handles nested assignment.device/testing) */
  private normalizeApiList(list: any[]): TestedDeviceRow[] {
    return (list || []).map((d: any) => {
      const a   = d?.assignment ?? {};
      const dev = a?.device ?? d?.device ?? {};
      const tst = a?.testing ?? d?.testing ?? {};

      const assignment_status: string | null = a?.assignment_status ?? null;

      const test_status   = tst?.test_status ?? d?.test_status ?? dev?.test_status ?? null;
      const device_status = dev?.device_status ?? d?.device_status ?? null;

      const tested_date =
        tst?.updated_at ??
        tst?.created_at ??
        d?.tested_date ??
        d?.approved_date ??
        dev?.inward_date ??
        d?.created_at ??
        null;

      return {
        // IDs
        id: d?.id ?? dev?.id,
        device_id: d?.device_id ?? dev?.id ?? d?.id,

        // Report / approval
        report_id: tst?.report_id ?? d?.report_id ?? null,
        approver_id: tst?.approver_id ?? null,
        approver_remark: tst?.approver_remark ?? null,
        assignment_status,

        // Basic fields
        serial_number: d?.serial_number ?? dev?.serial_number ?? null,
        make: d?.make ?? dev?.make ?? null,
        meter_category: dev?.meter_category ?? null,
        meter_type: dev?.meter_type ?? null,
        phase: dev?.phase ?? null,
        capacity: dev?.capacity ?? null,
        meter_class: dev?.meter_class ?? null,
        voltage_rating: dev?.voltage_rating ?? null,

        // Dates
        tested_date: tested_date ?? undefined,
        inward_number: dev?.inward_number ?? undefined,
        inward_date: dev?.inward_date ?? undefined,

        // Status/result/method
        test_result: tst?.test_result ?? d?.test_result ?? null,
        test_status: test_status ?? undefined,
        device_status: device_status ?? undefined,
        test_method: tst?.test_method ?? d?.test_method ?? undefined,

        // Test detail (optional)
        start_datetime: tst?.start_datetime ?? undefined,
        end_datetime: tst?.end_datetime ?? undefined,
        physical_condition_of_device: tst?.physical_condition_of_device ?? undefined,
        seal_status: tst?.seal_status ?? undefined,
        meter_body: tst?.meter_body ?? undefined,
        meter_glass_cover: tst?.meter_glass_cover ?? undefined,
        terminal_block: tst?.terminal_block ?? undefined,
        other: tst?.other ?? undefined,
        details: tst?.details ?? undefined,
        // misc
        office_type: dev?.office_type ?? undefined,
        location_code: dev?.location_code ?? undefined,
        location_name: dev?.location_name ?? undefined,
        device_type: dev?.device_type ?? d?.device_type ?? undefined,
        device_testing_purpose: dev?.device_testing_purpose ?? d?.device_testing_purpose ?? undefined,
        initiator: dev?.initiator ?? d?.initiator ?? undefined
      } as TestedDeviceRow;
    });
  }

  /** What counts as APPROVED */
  private isApproved(row: TestedDeviceRow): boolean {
    const assn = (row.assignment_status || '').toString().trim().toUpperCase();
    if (assn === 'APPROVED') return true;
    // fallback: approver present is also considered approved
    if (row.approver_id !== null && row.approver_id !== undefined && row.approver_id !== '') return true;
    // last fallback: explicit statuses on row
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

  // --- Badge helpers used by HTML ---
  resultClass(r?: string) {
    switch ((r || '').toUpperCase()) {
      case 'PASS': return 'bg-success';
      case 'FAIL': return 'bg-danger';
      case 'PENDING': return 'bg-warning text-dark';
      default: return 'bg-secondary';
    }
  }

  statusClass(s?: string) {
    const v = (s || '').toUpperCase();
    if (v === 'APPROVED') return 'bg-success';
    if (v === 'COMPLETED') return 'bg-primary';
    if (v === 'TESTED') return 'bg-info';
    if (v === 'INWARDED') return 'bg-secondary';
    return 'bg-dark';
  }
}
