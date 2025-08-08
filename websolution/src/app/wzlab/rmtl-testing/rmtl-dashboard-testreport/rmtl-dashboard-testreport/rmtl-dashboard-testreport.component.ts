import { Component, OnInit } from '@angular/core';

type ResultType = 'PASS' | 'FAIL' | 'PENDING';

interface RecentTestRow {
  date: string;               // ISO date
  device_type: 'METER' | 'CT';
  serial_number: string;
  make: string;
  meter_category?: string;
  phase?: '1P' | '3P';
  meter_type?: string;
  ct_class?: string;
  ct_ratio?: string;
  result: ResultType;
  inward_no: string;
}

@Component({
  selector: 'app-rmtl-dashboard-testreport',
  templateUrl: './rmtl-dashboard-testreport.component.html',
  styleUrls: ['./rmtl-dashboard-testreport.component.css']
})
export class RmtlDashboardTestreportComponent implements OnInit {

  // Filters
  filters = {
    from: '',
    to: '',
    device_type: '' as '' | 'METER' | 'CT',
    search: ''
  };

  // Sample data (replace with API later)
  recentAll: RecentTestRow[] = [
    { date: '2025-08-05', device_type: 'METER', serial_number: 'SN10011', make: 'Genus',  meter_category: 'Cat A', phase: '1P', meter_type: 'DLMS',    result: 'PASS', inward_no: 'INW001' },
    { date: '2025-08-05', device_type: 'CT',    serial_number: 'CT20021', make: 'ABB',    ct_class: '0.5',       ct_ratio: '200/5',                result: 'FAIL', inward_no: 'INW003' },
    { date: '2025-08-06', device_type: 'METER', serial_number: 'SN10012', make: 'Secure', meter_category: 'Cat B', phase: '3P', meter_type: 'Modbus', result: 'PASS', inward_no: 'INW002' },
    { date: '2025-08-06', device_type: 'METER', serial_number: 'SN10013', make: 'HPL',    meter_category: 'Cat A', phase: '1P', meter_type: 'DLMS',   result: 'PENDING', inward_no: 'INW004' },
    { date: '2025-08-07', device_type: 'CT',    serial_number: 'CT20022', make: 'Siemens', ct_class: '1.0',       ct_ratio: '400/5',               result: 'PASS', inward_no: 'INW005' },
    { date: '2025-08-07', device_type: 'METER', serial_number: 'SN10014', make: 'Genus',  meter_category: 'Cat A', phase: '1P', meter_type: 'DLMS',  result: 'PASS', inward_no: 'INW001' }
  ];

  recentFiltered: RecentTestRow[] = [];

  // KPI / Totals
  totals = { tested: 0, passed: 0, failed: 0, pending: 0, dispatched: 0 };
  metrics = { passRate: 0, failRate: 0, pendingRate: 0 };

  kpis: { label: string; value: number | string; delta: number; progress: number }[] = [];

  // Sample Bench Utilization
  benchUtilization = [
    { bench: 'Bench A (NABL)', utilization: 78 },
    { bench: 'Bench B (NABL)', utilization: 63 },
    { bench: 'Bench C (NON-NABL)', utilization: 41 },
    { bench: 'Bench D (NON-NABL)', utilization: 55 }
  ];

  ngOnInit(): void {
    // Optionally set default to last 7 days
    this.applyFilters();
  }

  applyFilters(): void {
    const fromTS = this.filters.from ? new Date(this.filters.from).getTime() : null;
    const toTS = this.filters.to ? new Date(this.filters.to).getTime() : null;
    const term = (this.filters.search || '').trim().toLowerCase();

    this.recentFiltered = this.recentAll.filter(r => {
      const ts = new Date(r.date).getTime();
      const typeOk = this.filters.device_type ? r.device_type === this.filters.device_type : true;
      const dateOk = (!fromTS || ts >= fromTS) && (!toTS || ts <= toTS);
      const searchOk = term
        ? [
            r.serial_number,
            r.make,
            r.meter_category,
            r.meter_type,
            r.ct_class,
            r.ct_ratio,
            r.inward_no
          ].filter(Boolean).join(' ').toLowerCase().includes(term)
        : true;
      return typeOk && dateOk && searchOk;
    });

    this.computeTotals();
    this.buildKPIs();
  }

  resetFilters(): void {
    this.filters = { from: '', to: '', device_type: '', search: '' };
    this.applyFilters();
  }

  private computeTotals(): void {
    const tested = this.recentFiltered.length;
    const passed = this.recentFiltered.filter(r => r.result === 'PASS').length;
    const failed = this.recentFiltered.filter(r => r.result === 'FAIL').length;
    const pending = this.recentFiltered.filter(r => r.result === 'PENDING').length;

    // You can wire 'dispatched' from your backend; using derived sample for demo.
    const dispatched = Math.floor(passed * 0.75);

    this.totals = { tested, passed, failed, pending, dispatched };

    const passRate = tested ? Math.round((passed / tested) * 100) : 0;
    const failRate = tested ? Math.round((failed / tested) * 100) : 0;
    const pendingRate = tested ? Math.round((pending / tested) * 100) : 0;

    this.metrics = { passRate, failRate, pendingRate };
  }

  private buildKPIs(): void {
    // Fake deltas/progress for demo; replace with real trend data later.
    this.kpis = [
      { label: 'Total Tested', value: this.totals.tested, delta: 5, progress: Math.min(100, this.totals.tested * 8) },
      { label: 'Passed', value: this.totals.passed, delta: 3, progress: this.metrics.passRate },
      { label: 'Failed', value: this.totals.failed, delta: -2, progress: this.metrics.failRate },
      { label: 'Pending', value: this.totals.pending, delta: -1, progress: this.metrics.pendingRate },
      { label: 'Dispatched (est.)', value: this.totals.dispatched, delta: 4, progress: Math.min(100, (this.totals.dispatched / (this.totals.passed || 1)) * 100) }
    ];
  }

  exportRecentCSV(): void {
    const headers = ['date','device_type','serial_number','make','category_or_class','phase_or_ratio','meter_type','result','inward_no'];
    const rows = this.recentFiltered.map(r => [
      r.date,
      r.device_type,
      r.serial_number,
      r.make,
      r.meter_category || r.ct_class || '',
      r.phase || r.ct_ratio || '',
      r.meter_type || '',
      r.result,
      r.inward_no
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(val => `"${String(val ?? '').replace(/"/g,'""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recent_tests_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  print(): void {
    window.print();
  }
}
