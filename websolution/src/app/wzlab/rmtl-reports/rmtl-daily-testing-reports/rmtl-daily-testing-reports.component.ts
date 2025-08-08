import { Component, OnInit } from '@angular/core';

interface DailyTestRow {
  date: string;
  device_type: 'METER' | 'CT';
  make: string;
  meter_category?: string;
  phase?: string;
  meter_type?: string;
  ct_class?: string;
  ct_ratio?: string;
  result: 'PASS' | 'FAIL' | 'PENDING';
  remarks?: string;
}

@Component({
  selector: 'app-rmtl-daily-testing-reports',
  templateUrl: './rmtl-daily-testing-reports.component.html',
  styleUrls: ['./rmtl-daily-testing-reports.component.css']
})
export class RmtlDailyTestingReportsComponent implements OnInit {

  filters = {
    from: '',
    to: '',
    device_type: '',
    search: ''
  };

  reportAll: DailyTestRow[] = [
    { date: '2025-08-01', device_type: 'METER', make: 'Genus', meter_category: 'Cat A', phase: '1P', meter_type: 'DLMS', result: 'PASS', remarks: 'OK' },
    { date: '2025-08-01', device_type: 'METER', make: 'Secure', meter_category: 'Cat B', phase: '3P', meter_type: 'Modbus', result: 'FAIL', remarks: 'Phase issue' },
    { date: '2025-08-02', device_type: 'CT', make: 'ABB', ct_class: '0.5', ct_ratio: '200/5', result: 'PASS' },
    { date: '2025-08-02', device_type: 'CT', make: 'Siemens', ct_class: '1.0', ct_ratio: '400/5', result: 'PENDING' },
    { date: '2025-08-03', device_type: 'METER', make: 'HPL', meter_category: 'Cat A', phase: '1P', meter_type: 'DLMS', result: 'PASS' }
  ];

  reportFiltered: DailyTestRow[] = [];

  summaryCards: { label: string; value: number }[] = [];

  ngOnInit(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    const fromTS = this.filters.from ? new Date(this.filters.from).getTime() : null;
    const toTS = this.filters.to ? new Date(this.filters.to).getTime() : null;
    const term = (this.filters.search || '').trim().toLowerCase();

    this.reportFiltered = this.reportAll.filter(r => {
      const ts = new Date(r.date).getTime();
      const typeOk = this.filters.device_type ? r.device_type === this.filters.device_type : true;
      const dateOk = (!fromTS || ts >= fromTS) && (!toTS || ts <= toTS);
      const searchOk = term ? [
        r.make,
        r.meter_category,
        r.meter_type,
        r.ct_class,
        r.ct_ratio
      ].filter(Boolean).join(' ').toLowerCase().includes(term) : true;
      return typeOk && dateOk && searchOk;
    });

    this.buildSummary();
  }

  resetFilters(): void {
    this.filters = { from: '', to: '', device_type: '', search: '' };
    this.applyFilters();
  }

  buildSummary(): void {
    const total = this.reportFiltered.length;
    const passCount = this.reportFiltered.filter(r => r.result === 'PASS').length;
    const failCount = this.reportFiltered.filter(r => r.result === 'FAIL').length;
    const pendingCount = this.reportFiltered.filter(r => r.result === 'PENDING').length;

    this.summaryCards = [
      { label: 'Total Tested', value: total },
      { label: 'Passed', value: passCount },
      { label: 'Failed', value: failCount },
      { label: 'Pending', value: pendingCount }
    ];
  }

  exportCSV(): void {
    const headers = ['date','device_type','make','category_or_class','phase_or_ratio','meter_type','result','remarks'];
    const rows = this.reportFiltered.map(r => [
      r.date,
      r.device_type,
      r.make,
      r.meter_category || r.ct_class || '',
      r.phase || r.ct_ratio || '',
      r.meter_type || '',
      r.result,
      r.remarks || ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(val => `"${String(val).replace(/"/g,'""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daily_testing_report_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  print(): void {
    window.print();
  }
}
