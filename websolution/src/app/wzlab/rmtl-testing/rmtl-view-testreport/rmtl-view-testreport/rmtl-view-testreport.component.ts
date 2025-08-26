import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';


type DeviceType = any;   // keep your real enums
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

  // client pagination
  page = 1;
  pageSize = 1000;
  pages: number[] = [];

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
    // If both dates empty → current month
    // If report_type selected and both dates empty → current month
    // If either/both provided → use provided; if only one side provided, fill the other sensibly
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

    // Decide the final range per the rules above
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
      this.filters.report_type, // report_type, // limit
      this.filters.from, // start_date
      to    // end_date
      // add other params if your API supports them
    ).subscribe({
      next: (data) => {
        this.all = Array.isArray(data) ? data : [];
        // We no longer do date filtering here; API has already done it.
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
        this.loading = false;
      }
    });
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

  // Client Pagination
  private repaginate(): void {
    const totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
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

  // Actions (unchanged)
  openDetails(r: TestReport): void { this.selected = r; }
  // edit(r: TestReport): void { this.router.navigate(['/rmtl/edit-testreport', r.id]); }
  // print(r: TestReport): void { this.router.navigate(['/rmtl/testreport/print', r.id]); }

  // CSV export (unchanged)
  exportCSV(): void {
    const headers = [
      'id','tested_date','device_type','report_type','serial_number','make','result','inward_no',
      'meter_category','phase','meter_type','ct_class','ct_ratio','burden_va',
      'observation','cause','site','load_kw','inspection_ref','solar_kwp','inverter_make','grid_voltage',
      'magnetization_test','ratio_error_pct','phase_angle_min','tested_by','remarks'
    ];
    const rows = this.filtered.map(r => headers.map(k => (r as any)[k] ?? ''));
    const csv = [headers, ...rows]
      .map(row => row.map(v => {
        const s = String(v);
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
