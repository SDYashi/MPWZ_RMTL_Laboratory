import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';

type DeviceType = any;   // replace with your enums/interfaces if available
type ReportType = any;
type TestReport = any;

@Component({
  selector: 'app-rmtl-view-testreport',
  templateUrl: './rmtl-view-testreport.component.html',
  styleUrls: ['./rmtl-view-testreport.component.css']
})
export class RmtlViewTestreportComponent implements OnInit {
  Math = Math;

  constructor(private router: Router, private api: ApiServicesService) {}

  // Filters & data
  reportTypes: ReportType[] = [];
  filters = {
    from: '',              // yyyy-MM-dd (optional)
    to: '',                // yyyy-MM-dd (optional)
    report_type: '' as '' | ReportType,
  };

  all: TestReport[] = [];
  filtered: TestReport[] = [];
  pageRows: TestReport[] = [];

  // pagination controls
  page = 1;
  pageSize = 50; // attractive default; adjust if needed
  pageSizeOptions = [10, 25, 50, 100, 250, 500, 1000];

  pages: number[] = [];      // legacy reference
  allPages: number[] = [];   // for mobile <select>
  pageWindow: Array<number | '…'> = []; // desktop ellipses window
  totalPages = 1;
  gotoInput: number | null = null;

  // ui state
  loading = false;
  error: string | null = null;

  selected: TestReport | null = null;

  ngOnInit(): void {
    this.fetchFromServer(true);
    this.api.getEnums().subscribe({
      next: (data) => this.reportTypes = data.test_report_types || [],
      error: (err) => console.error('Failed to load report types:', err)
    });
  }

  /** Format as yyyy-MM-dd in local time (no TZ shift) */
  private fmt(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** First and last day (today) for current month */
  private currentMonthRange(): { from: string; to: string } {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = now; // today
    return { from: this.fmt(from), to: this.fmt(to) };
  }

  /** Decide final date range to send to API based on filters */
  private resolveDateRange(): { from: string; to: string } {
    const hasFrom = !!this.filters.from;
    const hasTo = !!this.filters.to;

    if (!hasFrom && !hasTo) {
      return this.currentMonthRange();
    }

    let from = this.filters.from;
    let to = this.filters.to;

    if (hasFrom && !hasTo) {
      // from only → up to today
      to = this.fmt(new Date());
    } else if (!hasFrom && hasTo) {
      // to only → from first day of that month
      const t = new Date(this.filters.to);
      from = this.fmt(new Date(t.getFullYear(), t.getMonth(), 1));
    }

    // swap if reversed
    if (from && to && new Date(from) > new Date(to)) {
      [from, to] = [to, from];
    }
    return { from: from!, to: to! };
  }

  /** Fetch from API using server-side date range (no full dump) */
  private fetchFromServer(resetPage = false): void {
    if (resetPage) this.page = 1;

    this.loading = true;
    this.error = null;

    const { from, to } = this.resolveDateRange();

    this.api.getTestingRecords(
      null, // serial_number
      null, // user_id
      null, // test_result
      null, // test_method
      null, // test_status
      null, // lab_id
      null, // offset
      null, // limit
      this.filters.report_type, // report_type
      from, // start_date (FIX: use resolved 'from')
      to    // end_date
    ).subscribe({
      next: (data) => {
        this.all = Array.isArray(data) ? data : [];
        // Server already filtered by date; optionally filter further by report_type here if needed
        this.filtered = this.all.slice();
        this.repaginate();
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.detail || err?.message || 'Failed to load test reports.';
        this.all = [];
        this.filtered = [];
        this.pageRows = [];
        this.pages = [];
        this.totalPages = 1;
        this.allPages = [];
        this.pageWindow = [];
        this.loading = false;
      }
    });
  }

  downloadTestreports_byreportidwithReportTypes(report_type: string, dispatchNo: string){
  
    
  }

  /** When the user changes any date or report_type, re-query the API */
  onDateChanged(): void {
    this.fetchFromServer(true);
  }
  onReportTypeChanged(): void {
    this.fetchFromServer(true);
  }

  resetFilters(): void {
    this.filters = { from: '', to: '', report_type: '' };
    this.fetchFromServer(true); // loads current month by rule
  }

  // ===== Pagination helpers =====
  private buildPageWindow(current: number, total: number, radius = 1): Array<number|'…'> {
    // Always show 1, last, current±radius, and glue with ellipses where gaps exist
    const set = new Set<number>();
    const add = (n: number) => { if (n >= 1 && n <= total) set.add(n); };

    add(1); add(total);
    for (let d = -radius; d <= radius; d++) add(current + d);
    // Smoother edges
    add(2); add(3); add(total - 1); add(total - 2);

    const sorted = Array.from(set).sort((a, b) => a - b);
    const out: Array<number|'…'> = [];
    for (let i = 0; i < sorted.length; i++) {
      const n = sorted[i];
      if (i === 0) { out.push(n); continue; }
      const prev = sorted[i - 1];
      if (n === prev + 1) {
        out.push(n);
      } else {
        out.push('…', n);
      }
    }
    return out;
  }

  private repaginate(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    if (this.page > this.totalPages) this.page = this.totalPages;

    const start = (this.page - 1) * this.pageSize;
    this.pageRows = this.filtered.slice(start, start + this.pageSize);

    // build arrays
    this.allPages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.pageWindow = this.buildPageWindow(this.page, this.totalPages, 1);
    this.pages = this.allPages; // kept for any older references
  }

  goto(p: number): void {
    if (!p) return;
    const next = Math.max(1, Math.min(this.totalPages, Math.floor(p)));
    if (next === this.page) return;
    this.page = next;
    this.repaginate();
  }

  onPageSizeChange(): void {
    this.page = 1; // reset to first page for clarity
    this.repaginate();
  }

  // ===== Actions =====
  openDetails(r: TestReport): void {
    this.selected = r;
  }
  // edit(r: TestReport): void { this.router.navigate(['/rmtl/edit-testreport', r.id]); }
  // print(r: TestReport): void { this.router.navigate(['/rmtl/testreport/print', r.id]); }

  // ===== CSV export =====
  exportCSV(): void {
    const headers = [
      'id','tested_date','device_type','report_type','serial_number','make','result','inward_no',
      'meter_category','phase','meter_type','ct_class','ct_ratio','burden_va',
      'observation','cause','site','load_kw','inspection_ref','solar_kwp','inverter_make','grid_voltage',
      'magnetization_test','ratio_error_pct','phase_angle_min','tested_by','remarks'
    ];

    const val = (r: any, k: string) => (r?.[k] ?? r?.testing?.[k] ?? r?.device?.[k] ?? '');

    const rows = this.filtered.map(r => headers.map(k => val(r, k)));
    const csv = [headers, ...rows]
      .map(row => row.map(v => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
      }).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rmtl_test_reports_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
