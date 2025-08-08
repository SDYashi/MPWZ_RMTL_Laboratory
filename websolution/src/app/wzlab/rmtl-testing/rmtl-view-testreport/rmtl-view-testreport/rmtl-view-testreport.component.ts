import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
// import { Math } from '../../math';

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
}

@Component({
  selector: 'app-rmtl-view-testreport',
  templateUrl: './rmtl-view-testreport.component.html',
  styleUrls: ['./rmtl-view-testreport.component.css']
})
export class RmtlViewTestreportComponent implements OnInit {
Math = Math; // expose Math to the template

  constructor(private router: Router) {}

  // Filters & data
  reportTypes: ReportType[] = [
    'stopdefective','contested','P4_ONM','P4_vig','Solar netmeter','Solar Generation Meter','CT Testing'
  ];

  filters = {
    from: '',
    to: '',
    device_type: '' as '' | DeviceType,
    report_type: '' as '' | ReportType,
    result: '' as '' | 'PASS' | 'FAIL' | 'PENDING',
    inward: '',
    search: ''
  };
  getMin(a: number, b: number): number {
  return Math.min(a, b);
}


  all: TestReport[] = [
    { id:'TRPT-1001', tested_date:'2025-08-06', device_type:'METER', report_type:'stopdefective', serial_number:'SN10014', make:'Genus',  result:'FAIL', inward_no:'INW001', meter_category:'Cat A', phase:'1P', meter_type:'DLMS', observation:'No display', cause:'LCD driver', tested_by:'Rakesh' },
    { id:'TRPT-1002', tested_date:'2025-08-02', device_type:'CT',    report_type:'CT Testing',     serial_number:'CT20022', make:'ELMEX', result:'PASS', inward_no:'INW005', ct_class:'0.5', ct_ratio:'300/5', burden_va:10, magnetization_test:'PASS', ratio_error_pct:0.12, phase_angle_min:0.02, tested_by:'AP' },
    { id:'TRPT-1003', tested_date:'2025-08-01', device_type:'METER', report_type:'contested',      serial_number:'SS22123888', make:'SECURE', result:'PASS', inward_no:'INW012', meter_category:'3x10-100A', phase:'3P', meter_type:'Modbus', observation:'OK', cause:'-', tested_by:'AE' },
    { id:'TRPT-1004', tested_date:'2025-08-05', device_type:'METER', report_type:'Solar netmeter', serial_number:'SN20001', make:'HPL', result:'PASS', inward_no:'INW009', meter_category:'Cat A', phase:'1P', meter_type:'DLMS', solar_kwp:5, inverter_make:'Sungrow', grid_voltage:235 },
    { id:'TRPT-1005', tested_date:'2025-08-07', device_type:'METER', report_type:'P4_ONM',        serial_number:'SN30011', make:'Secure', result:'PENDING', inward_no:'INW020', meter_category:'Cat B', phase:'3P', meter_type:'Modbus', site:'Feeder-12', load_kw:45, inspection_ref:'VIG/123' }
  ];

  filtered: TestReport[] = [];
  pageRows: TestReport[] = [];
  page = 1;
  pageSize = 10;
  pages: number[] = [];

  selected: TestReport | null = null;

  ngOnInit(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    const fromTS = this.filters.from ? new Date(this.filters.from).getTime() : null;
    const toTS = this.filters.to ? new Date(this.filters.to).getTime() : null;
    const term = (this.filters.search || '').toLowerCase().trim();
    const inwardTerm = (this.filters.inward || '').toLowerCase().trim();

    this.filtered = this.all.filter(r => {
      const ts = new Date(r.tested_date).getTime();
      const dateOk = (!fromTS || ts >= fromTS) && (!toTS || ts <= toTS);
      const devOk = this.filters.device_type ? r.device_type === this.filters.device_type : true;
      const typeOk = this.filters.report_type ? r.report_type === this.filters.report_type : true;
      const resOk = this.filters.result ? r.result === this.filters.result : true;
      const inwardOk = inwardTerm ? (r.inward_no || '').toLowerCase().includes(inwardTerm) : true;

      const hay = [
        r.id, r.serial_number, r.make, r.meter_type, r.meter_category, r.ct_class, r.ct_ratio, r.tested_by, r.remarks
      ].filter(Boolean).join(' ').toLowerCase();

      const searchOk = term ? hay.includes(term) : true;

      return dateOk && devOk && typeOk && resOk && inwardOk && searchOk;
    });

    this.page = 1;
    this.repaginate();
  }

  resetFilters(): void {
    this.filters = { from:'', to:'', device_type:'', report_type:'', result:'', inward:'', search:'' };
    this.applyFilters();
  }

  // Pagination
  private repaginate(): void {
    const totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    this.pages = Array.from({length: totalPages}, (_,i)=>i+1);
    const start = (this.page - 1) * this.pageSize;
    this.pageRows = this.filtered.slice(start, start + this.pageSize);
  }

  goto(p: number): void {
    if (p < 1) return;
    const max = this.pages[this.pages.length-1] || 1;
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
