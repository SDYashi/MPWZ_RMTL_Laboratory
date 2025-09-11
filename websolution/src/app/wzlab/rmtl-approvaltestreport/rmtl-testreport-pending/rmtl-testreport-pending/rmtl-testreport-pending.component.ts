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
  canApprove?: boolean;
  selected?: boolean;
  testing_id?: number;
}

@Component({
  selector: 'app-rmtl-testreport-pending',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rmtl-testreport-pending.component.html',
  styleUrls: ['./rmtl-testreport-pending.component.css'],
})
export class RmtlTestreportPendingComponent implements OnInit {
  Math = Math;

  // user / lab
  labId: any = null;
  user_id :any= null;

  // Date filters only
  fromDate = '';
  toDate = '';
  device_status = 'TESTED';

  // Data & UI
  loading = false;
  errorMsg = '';
  rows: TestedDeviceRow[] = [];
  selectAll = false;

  // client pagination
  page = 1;
  pageSize = 1000;
  pages: number[] = [];
  pageRows: TestedDeviceRow[] = [];
  filtered: TestedDeviceRow[] = [];

  // details/offcanvas
  selectedRow: TestedDeviceRow | null = null;

  // approve modals
  confirmApproveNote = '';
  approving = false;
  approveResult: { ok: number; failed: number; details?: any } | null = null;
  approvePerformedAt: Date | null = null;

  // result modal data
  approvedIds: Array<number | string> = [];
  failedList: Array<{ id: any; reason?: string }> = [];
  rejecting: any;

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
    this.toDate = this.fmt(now);
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

  /** Normalize API → TestedDeviceRow */
/** Normalize API → TestedDeviceRow (supports nested assignment/device/testing) */
private normalizeApiList(list: any[]): TestedDeviceRow[] {
  return (list || []).map((d: any) => {
    const a = d?.assignment ?? {};
    const dev = a?.device ?? d?.device ?? {};
    const tst = a?.testing ?? d?.testing ?? {};

    const test_status = tst?.test_status ?? d?.test_status ?? null;
    const device_status = dev?.device_status ?? d?.device_status ?? null;

    const statusUpper = String(test_status || device_status || '').toUpperCase();
    const canApprove =
      statusUpper === 'TESTED' ||
      statusUpper === 'COMPLETED' ||
      statusUpper === 'APPROVED' ||
      statusUpper === 'INWARDED';

    return {
      // IDs
      id: d?.id ?? dev?.id,
      device_id: d?.device_id ?? dev?.id ?? d?.id,

      // Identifiers
      report_id: tst?.report_id ?? d?.report_id,
      serial_number: d?.serial_number ?? dev?.serial_number,
      make: d?.make ?? dev?.make,

      // Meter descriptors
      meter_category: dev?.meter_category,
      meter_type: dev?.meter_type,
      phase: dev?.phase,
      capacity: dev?.capacity,
      meter_class: dev?.meter_class,
      voltage_rating: dev?.voltage_rating,

      // Dates
      tested_date: tst?.created_at ?? d?.tested_date ?? dev?.inward_date ?? d?.created_at,
      inward_date: dev?.inward_date,

      // Status/result
      test_result: tst?.test_result ?? d?.test_result,
      test_status: test_status ?? undefined,
      device_status: device_status ?? undefined,
      test_method: tst?.test_method ?? d?.test_method,

      // Test details
      start_datetime: tst?.start_datetime,
      end_datetime: tst?.end_datetime,
      physical_condition_of_device: tst?.physical_condition_of_device,
      seal_status: tst?.seal_status,
      meter_body: tst?.meter_body,
      meter_glass_cover: tst?.meter_glass_cover,
      terminal_block: tst?.terminal_block,
      other: tst?.other,
      details: tst?.details,
      ref_start_reading: tst?.ref_start_reading,
      ref_end_reading: tst?.ref_end_reading,
      reading_before_test: tst?.reading_before_test,
      reading_after_test: tst?.reading_after_test,
      error_percentage: tst?.error_percentage,
      approver_id: tst?.approver_id ?? null,
      approver_remark: tst?.approver_remark ?? null,

      // Location / misc
      office_type: dev?.office_type,
      location_code: dev?.location_code,
      location_name: dev?.location_name,
      device_type: dev?.device_type ?? d?.device_type,
      device_testing_purpose: dev?.device_testing_purpose ?? d?.device_testing_purpose,
      initiator: dev?.initiator ?? d?.initiator,
      testing_id: tst?.id ?? tst?.testing_id ?? d?.testing_id ?? d?.id,

      // UI flags
      canApprove,
      selected: false,
    } as TestedDeviceRow;
  });
}


  // ---- Fetch
  onDatesChange(): void {
    this.page = 1;
    this.fetchTestedDevices(true);
  }

  fetchTestedDevices(reset = false): void {
    if (reset) {
      this.page = 1;
      this.selectAll = false;
    }
    this.loading = true;
    this.errorMsg = '';

    const { from, to } = this.resolveDateRange();

    // pass labId to the API (service signature updated accordingly)
    this.api.getTestedDevices(from, to, this.device_status, this.labId ?? undefined).subscribe({
      next: (list: any[]) => {
        this.rows = this.normalizeApiList(Array.isArray(list) ? list : []);
        this.filtered = this.rows.slice();
        this.repaginate();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = err?.error?.detail || err?.message || 'Failed to load tested devices.';
        this.rows = [];
        this.filtered = [];
        this.pageRows = [];
        this.pages = [];
        this.loading = false;
      },
    });
  }

  // ---- Pagination
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

  // ---- Selection
  get selectedCount(): number {
    return this.rows.filter((r) => r.selected && r.canApprove).length;
  }

  toggleAllOnPage(): void {
    this.pageRows.forEach((r) => (r.selected = !!r.canApprove && this.selectAll));
  }

  onRowCheckboxChange(): void {
    const approvables = this.pageRows.filter((r) => r.canApprove);
    this.selectAll = approvables.length > 0 && approvables.every((r) => !!r.selected);
  }

  clearSelection(): void {
    this.rows.forEach((r) => (r.selected = false));
    this.selectAll = false;
  }

  trackById = (_: number, r: TestedDeviceRow) => r.device_id ?? r.id ?? _;
  trackId = (_: number, v: number | string) => v;

  // ---- Details
  openDetails(r: TestedDeviceRow): void {
    this.selectedRow = r;
    const el = document.getElementById('detailsCanvas');
    if (el && (window as any)['bootstrap']?.Offcanvas) {
      const off = new (window as any)['bootstrap'].Offcanvas(el);
      off.show();
    }
  }

  // ---- Approve flow
  openApproveModal(single?: TestedDeviceRow | null): void {
    this.confirmApproveNote = '';
    if (single) {
      this.clearSelection();
      if (single.canApprove) single.selected = true;
    }
    if (this.selectedCount === 0) return;

    const el = document.getElementById('approveModal');
    if (el && (window as any)['bootstrap']?.Modal) {
      const m = new (window as any)['bootstrap'].Modal(el, { backdrop: 'static' });
      m.show();
    }
  }

  /** Type guard helpers for payload shapes */
  private isArrayPayload(x: any): x is any[] {
    return Array.isArray(x);
  }
  private isObjectPayload(x: any): x is { approved_ids?: any[]; failed?: Array<{ id: any; reason?: string }> } {
    return x && typeof x === 'object' && !Array.isArray(x);
  }
  submitRejection(): void {
    if (this.rejecting) return;
 const id = this.rows.find((r) => r.selected && r.canApprove)?.testing_id ?? null;

 if (!id) return;

 this.rejecting = true;
 this.api.rejectDevices(id).subscribe({
   next: () => {
     this.rejecting = false;
     this.fetchTestedDevices();
   },
   error: (err) => {
     console.error(err);
     this.rejecting = false;
   },
 });
  }

  submitApproval(): void {
    if (this.approving) return;

    const ids = this.rows
      .filter((r) => r.selected && r.canApprove)
      .map((r) => r.device_id ?? r.id)
      .filter((v): v is number | string => v !== null && v !== undefined);

    if (!ids.length) return;

    this.approving = true;
    this.approvedIds = [];
    this.failedList = [];
    const note = this.confirmApproveNote?.trim() || undefined;

    this.api.approveDevices(ids, note).subscribe({
      next: (res: any) => {
        if (this.isArrayPayload(res)) {
          this.approvedIds = res;
          this.failedList = [];
        } else if (this.isObjectPayload(res)) {
          this.approvedIds = Array.isArray(res?.approved_ids) ? res.approved_ids : [];
          this.failedList = Array.isArray(res?.failed) ? res.failed : [];
        } else {
          this.approvedIds = [];
          this.failedList = [];
        }

        const approved = this.approvedIds.length;
        const failed = this.failedList.length;
        this.approveResult = { ok: approved, failed };
        this.approvePerformedAt = new Date();
        this.approving = false;

        const confirmEl = document.getElementById('approveModal');
        (confirmEl && (window as any)['bootstrap']?.Modal.getInstance(confirmEl))?.hide();

        this.cdr.detectChanges();

        this.zone.run(() => {
          const resultEl = document.getElementById('resultModal');
          resultEl && new (window as any)['bootstrap'].Modal(resultEl).show();
        });

        this.clearSelection();
        this.fetchTestedDevices();
      },
      error: (err) => {
        console.error(err);
        const reason = err?.error?.detail || err?.message || 'Unknown error';
        this.approvedIds = [];
        this.failedList = ids.map((id) => ({ id, reason }));

        this.approveResult = { ok: 0, failed: this.failedList.length, details: err?.error || err };
        this.approvePerformedAt = new Date();
        this.approving = false;

        const confirmEl = document.getElementById('approveModal');
        (confirmEl && (window as any)['bootstrap']?.Modal.getInstance(confirmEl))?.hide();

        this.cdr.detectChanges();

        const resultEl = document.getElementById('resultModal');
        resultEl && new (window as any)['bootstrap'].Modal(resultEl).show();
      },
    });
  }

  resultClass(r?: string) {
    switch ((r || '').toUpperCase()) {
      case 'PASS':
        return 'bg-success';
      case 'FAIL':
        return 'bg-danger';
      case 'PENDING':
        return 'bg-warning text-dark';
      default:
        return 'bg-secondary';
    }
  }

  statusClass(s?: string) {
    const v = (s || '').toUpperCase();
    if (v === 'COMPLETED' || v === 'APPROVED') return 'bg-success';
    if (v === 'TESTED') return 'bg-primary';
    if (v === 'INWARDED') return 'bg-info';
    return 'bg-dark';
  }
}
