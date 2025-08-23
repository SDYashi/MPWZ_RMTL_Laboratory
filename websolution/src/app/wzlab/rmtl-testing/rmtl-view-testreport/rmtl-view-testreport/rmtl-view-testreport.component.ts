import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';

type DeviceType = 'METER' | 'CT';
type ReportType =
  | 'stopdefective'
  | 'contested'
  | 'P4_ONM'
  | 'P4_vig'
  | 'Solar netmeter'
  | 'Solar Generation Meter'
  | 'CT Testing';

interface TestReport {
  id: string;
  tested_date: string; // ISO date
  device_type: DeviceType;
  report_type: ReportType;
  serial_number: string;
  make: string;
  result: 'PASS' | 'FAIL' | 'PENDING';
  inward_no?: string;

  // Meter fields
  meter_category?: string;
  phase?: '1P' | '3P' | '';
  meter_type?: string;

  // CT fields
  ct_class?: string;
  ct_ratio?: string;
  burden_va?: number | null;

  // Report specifics
  observation?: string;
  cause?: string;
  site?: string;
  load_kw?: number | null;
  inspection_ref?: string;
  solar_kwp?: number | null;
  inverter_make?: string;
  grid_voltage?: number | null;
  magnetization_test?: string;
  ratio_error_pct?: number | null;
  phase_angle_min?: number | null;
  tested_by?: string;
  remarks?: string;
  terminal_block?: 'OK' | 'Loose' | 'Damaged';
  device_id?: string;
  meter_body?: 'OK' | 'Cracked' | 'Damaged';
  test_method?: 'MANUAL' | 'AUTOMATIC';
  test_status?: 'COMPLETED' | 'UNTESTABLE';
  seal_status?: 'Intact' | 'Broken';
  test_result?: 'PASS' | 'FAIL' | 'PENDING';
  lab_id?: string;
  lab_name?: string;
  tested_by_id?: string;
  tested_by_name?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  assignment_id?: string;
  assignment_name?: string;
  assignment_status?: 'ASSIGNED' | 'UNASSIGNED';
  assignment_date?: string;
  assignment_due_date?: string;
  meter_glass_cover ?: 'OK' | 'Cracked' | 'Damaged';
  meter_seal ?: 'Intact' | 'Broken';
  meter_seal_no ?: string;
  physical_condition_of_device ?: 'Good' | 'Damaged' | 'Unusable';
  is_burned ?: boolean;
  start_datetime ?: string; // ISO date
  end_datetime ?: string; // ISO date
  error_percentage ?: number | null;
  other: string; // any other field not covered above
  details ?: string
}

@Component({
  selector: 'app-rmtl-view-testreport',
  templateUrl: './rmtl-view-testreport.component.html',
  styleUrls: ['./rmtl-view-testreport.component.css']
})
export class RmtlViewTestreportComponent implements OnInit {
  Math = Math; // expose Math to the template

  constructor(private router: Router, private api: ApiServicesService) {}

  // Filters & data
  reportTypes: ReportType[] = [];

  filters = {
    from: '',
    to: '',
    device_type: '' as '' | DeviceType,
    report_type: '' as '' | ReportType,
    result: '' as '' | 'PASS' | 'FAIL' | 'PENDING',  // only PASS/FAIL will be sent to API
    inward: '',
    search: '' // sent to API as serial_number
  };

  getMin(a: number, b: number): number { return Math.min(a, b); }

  all: any[] = [];
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
      next: (data) => {
        this.reportTypes = data.test_report_types || [];
      },
      error: (err) => {
        console.error('Failed to load report types:', err);
      }
    });
  }

  /** Fetch from API using serial + result (PASS/FAIL only) and current page settings */
  private fetchFromServer(resetPage = false): void {
    if (resetPage) this.page = 1;

    this.loading = true;
    this.error = null;

    const serial = (this.filters.search || '').trim() || null;

    // API supports only PASS/FAIL; ignore PENDING for server filter
    const resultUpper = (this.filters.result || '').toString().toUpperCase();
    const resultParam = (resultUpper === 'PASS' || resultUpper === 'FAIL') ? resultUpper as 'PASS' | 'FAIL' : null;

    // NOTE: we’re not filtering by method/status/lab/user here; pass as needed
    this.api.getTestingRecords(
      serial,            // serial_number
      null,              // user_id
      resultParam,       // test_result
      null,              // test_method ('MANUAL' | 'AUTOMATIC')
      null,              // test_status ('COMPLETED' | 'UNTESTABLE')
      null,              // lab_id
      (this.page - 1) * this.pageSize, // offset
      this.pageSize                    // limit
    ).subscribe({
      next: (data) => {
        this.all = Array.isArray(data) ? data : [];
        this.applyFilters(); 
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

  /** Client-side filters */
  applyFilters(): void {
    const fromTS = this.filters.from ? new Date(this.filters.from).getTime() : null;
    const toTS   = this.filters.to   ? new Date(this.filters.to).getTime()   : null;
    const term   = (this.filters.search || '').toLowerCase().trim(); // optional local fuzzy on current page
    const inwardTerm = (this.filters.inward || '').toLowerCase().trim();

    this.filtered = this.all.filter(r => {
      const ts = new Date(r.tested_date).getTime();
      const dateOk = (!fromTS || ts >= fromTS) && (!toTS || ts <= toTS);
      const devOk  = this.filters.device_type ? r.device_type === this.filters.device_type : true;
      const typeOk = this.filters.report_type ? r.report_type === this.filters.report_type : true;

      // result local filter (can include PENDING)
      const resOk  = this.filters.result ? r.result === this.filters.result : true;

      const inwardOk = inwardTerm ? (r.inward_no || '').toLowerCase().includes(inwardTerm) : true;

      const hay = [
        r.id, r.serial_number, r.make, r.meter_type, r.meter_category, r.ct_class, r.ct_ratio, r.tested_by, r.remarks
      ].filter(Boolean).join(' ').toLowerCase();

      const searchOk = term ? hay.includes(term) : true;

      return dateOk && devOk && typeOk && resOk && inwardOk && searchOk;
    });

    // reset client pagination on any filter change
    this.page = 1;
    this.repaginate();
  }

  resetFilters(): void {
    this.filters = { from:'', to:'', device_type:'', report_type:'', result:'', inward:'', search:'' };
    // refresh from server too (clears server filters)
    this.fetchFromServer(true);
  }

  // Client Pagination over the current 'filtered' list
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

  // Actions
  openDetails(r: TestReport): void {
    this.selected = r;
  }

  edit(r: TestReport): void {
    this.router.navigate(['/rmtl/edit-testreport', r.id]);
  }

  print(r: TestReport): void {
    this.router.navigate(['/rmtl/testreport/print', r.id]);
  }

  // CSV export (no extra libs)
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
