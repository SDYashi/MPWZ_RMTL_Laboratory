import { Component, OnInit } from '@angular/core';

interface DeviceSummaryRow {
  device_type: 'METER' | 'CT';
  make: string;
  meter_category?: string;
  phase?: string;
  meter_type?: string;
  ct_class?: string;
  ct_ratio?: string;
  total_received: number;
  tested: number;
  passed: number;
  failed: number;
  dispatched: number;
  available_stock: number;
}

@Component({
  selector: 'app-rmtl-devices-summary-reports',
  templateUrl: './rmtl-devices-summary-reports.component.html',
  styleUrls: ['./rmtl-devices-summary-reports.component.css']
})
export class RmtlDevicesSummaryReportsComponent implements OnInit {

  filters = {
    from: '',
    to: '',
    device_type: '',
    search: ''
  };

  reportAll: DeviceSummaryRow[] = [
    { device_type: 'METER', make: 'Genus', meter_category: 'Cat A', phase: '1P', meter_type: 'DLMS', total_received: 200, tested: 180, passed: 170, failed: 10, dispatched: 150, available_stock: 50 },
    { device_type: 'METER', make: 'Secure', meter_category: 'Cat B', phase: '3P', meter_type: 'Modbus', total_received: 100, tested: 95, passed: 92, failed: 3, dispatched: 80, available_stock: 20 },
    { device_type: 'CT', make: 'ABB', ct_class: '0.5', ct_ratio: '200/5', total_received: 60, tested: 55, passed: 54, failed: 1, dispatched: 50, available_stock: 10 },
    { device_type: 'CT', make: 'Siemens', ct_class: '1.0', ct_ratio: '400/5', total_received: 40, tested: 38, passed: 36, failed: 2, dispatched: 35, available_stock: 5 }
  ];

  reportFiltered: DeviceSummaryRow[] = [];
  totals = { total_received: 0, tested: 0, passed: 0, failed: 0, dispatched: 0, available_stock: 0 };

  summaryCards: { label: string; value: number }[] = [];

  ngOnInit(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    const term = (this.filters.search || '').trim().toLowerCase();
    this.reportFiltered = this.reportAll.filter(r => {
      const typeOk = this.filters.device_type ? r.device_type === this.filters.device_type : true;
      const searchOk = term ? [
        r.make,
        r.meter_category,
        r.meter_type,
        r.ct_class,
        r.ct_ratio
      ].filter(Boolean).join(' ').toLowerCase().includes(term) : true;
      return typeOk && searchOk;
    });

    this.computeTotals();
    this.buildSummaryCards();
  }

  resetFilters(): void {
    this.filters = { from: '', to: '', device_type: '', search: '' };
    this.applyFilters();
  }

  computeTotals(): void {
    this.totals.total_received = this.reportFiltered.reduce((sum, r) => sum + r.total_received, 0);
    this.totals.tested = this.reportFiltered.reduce((sum, r) => sum + r.tested, 0);
    this.totals.passed = this.reportFiltered.reduce((sum, r) => sum + r.passed, 0);
    this.totals.failed = this.reportFiltered.reduce((sum, r) => sum + r.failed, 0);
    this.totals.dispatched = this.reportFiltered.reduce((sum, r) => sum + r.dispatched, 0);
    this.totals.available_stock = this.reportFiltered.reduce((sum, r) => sum + r.available_stock, 0);
  }

  buildSummaryCards(): void {
    this.summaryCards = [
      { label: 'Total Received', value: this.totals.total_received },
      { label: 'Tested', value: this.totals.tested },
      { label: 'Passed', value: this.totals.passed },
      { label: 'Failed', value: this.totals.failed },
      { label: 'Dispatched', value: this.totals.dispatched },
      { label: 'Available Stock', value: this.totals.available_stock }
    ];
  }

  exportCSV(): void {
    const headers = ['device_type','make','category_or_class','phase_or_ratio','meter_type','total_received','tested','passed','failed','dispatched','available_stock'];
    const rows = this.reportFiltered.map(r => [
      r.device_type,
      r.make,
      r.meter_category || r.ct_class || '',
      r.phase || r.ct_ratio || '',
      r.meter_type || '',
      r.total_received,
      r.tested,
      r.passed,
      r.failed,
      r.dispatched,
      r.available_stock
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(val => `"${String(val).replace(/"/g,'""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `devices_summary_report_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  print(): void {
    window.print();
  }
}
