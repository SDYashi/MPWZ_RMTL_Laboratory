import { Component, OnInit } from '@angular/core';
type UsageAction = 'TESTED' | 'RECEIVED' | 'ISSUED' | 'FAILED' | 'DISPATCHED';

interface UsageRow {
  date: string;          // ISO date string
  inward_no: string;
  device_type: 'METER' | 'CT';
  make: string;

  // Meter fields
  meter_category?: string;
  phase?: '1P' | '3P';
  meter_type?: string;

  // CT fields
  ct_class?: string;
  ct_ratio?: string;

  action: UsageAction;
  count: number;
}

interface StockRow {
  device_type: 'METER' | 'CT';
  make: string;

  // Meter fields
  meter_category?: string;
  phase?: '1P' | '3P';
  meter_type?: string;

  // CT fields
  ct_class?: string;
  ct_ratio?: string;

  available: number;
  reserved: number;
  faulty: number;
}
@Component({
  selector: 'app-rmtl-usage-stock-reports',
  templateUrl: './rmtl-usage-stock-reports.component.html',
  styleUrls: ['./rmtl-usage-stock-reports.component.css']
})
export class RmtlUsageStockReportsComponent implements OnInit {


  // Filters
  filters = {
    from: '',
    to: '',
    device_type: '' as '' | 'METER' | 'CT',
    search: ''
  };

  // Sample Usage Data
  usageAll: UsageRow[] = [
    { date: '2025-08-01', inward_no: 'INW001', device_type: 'METER', make: 'Genus', meter_category: 'Cat A', phase: '1P', meter_type: 'DLMS', action: 'TESTED', count: 35 },
    { date: '2025-08-01', inward_no: 'INW001', device_type: 'METER', make: 'Genus', meter_category: 'Cat A', phase: '1P', meter_type: 'DLMS', action: 'DISPATCHED', count: 20 },
    { date: '2025-08-02', inward_no: 'INW002', device_type: 'METER', make: 'Secure', meter_category: 'Cat B', phase: '3P', meter_type: 'Modbus', action: 'RECEIVED', count: 15 },
    { date: '2025-08-03', inward_no: 'INW003', device_type: 'CT',    make: 'ABB',   ct_class: '0.5', ct_ratio: '200/5', action: 'TESTED', count: 18 },
    { date: '2025-08-03', inward_no: 'INW003', device_type: 'CT',    make: 'ABB',   ct_class: '0.5', ct_ratio: '200/5', action: 'FAILED', count: 2 },
    { date: '2025-08-04', inward_no: 'INW004', device_type: 'METER', make: 'HPL',   meter_category: 'Cat A', phase: '1P', meter_type: 'DLMS', action: 'ISSUED', count: 12 },
    { date: '2025-08-05', inward_no: 'INW005', device_type: 'CT',    make: 'Siemens', ct_class: '1.0', ct_ratio: '400/5', action: 'DISPATCHED', count: 10 },
  ];

  // Sample Stock Data
  stockAll: StockRow[] = [
    { device_type: 'METER', make: 'Genus', meter_category: 'Cat A', phase: '1P', meter_type: 'DLMS', available: 120, reserved: 15, faulty: 3 },
    { device_type: 'METER', make: 'Secure', meter_category: 'Cat B', phase: '3P', meter_type: 'Modbus', available: 40, reserved: 10, faulty: 1 },
    { device_type: 'METER', make: 'HPL', meter_category: 'Cat A', phase: '1P', meter_type: 'DLMS', available: 75, reserved: 8, faulty: 5 },
    { device_type: 'CT', make: 'ABB', ct_class: '0.5', ct_ratio: '200/5', available: 52, reserved: 4, faulty: 2 },
    { device_type: 'CT', make: 'Siemens', ct_class: '1.0', ct_ratio: '400/5', available: 31, reserved: 6, faulty: 1 },
  ];

  // View Models
  usageFiltered: UsageRow[] = [];
  stockFiltered: StockRow[] = [];

  totals = {
    usage: 0,
    available: 0,
    reserved: 0,
    faulty: 0,
    stock: 0
  };

  summaryCards: { label: string; value: number }[] = [];

  ngOnInit(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    const fromTS = this.filters.from ? new Date(this.filters.from).getTime() : null;
    const toTS = this.filters.to ? new Date(this.filters.to).getTime() : null;
    const term = (this.filters.search || '').trim().toLowerCase();

    // Usage filter
    this.usageFiltered = this.usageAll.filter(r => {
      const ts = new Date(r.date).getTime();
      const deviceTypeOk = this.filters.device_type ? r.device_type === this.filters.device_type : true;
      const dateOk = (!fromTS || ts >= fromTS) && (!toTS || ts <= toTS);
      const text = [
        r.make,
        r.meter_category,
        r.meter_type,
        r.ct_class,
        r.ct_ratio
      ].filter(Boolean).join(' ').toLowerCase();
      const searchOk = term ? text.includes(term) : true;
      return deviceTypeOk && dateOk && searchOk;
    });

    // Stock filter
    this.stockFiltered = this.stockAll.filter(s => {
      const deviceTypeOk = this.filters.device_type ? s.device_type === this.filters.device_type : true;
      const text = [
        s.make,
        s.meter_category,
        s.meter_type,
        s.ct_class,
        s.ct_ratio,
        s.phase
      ].filter(Boolean).join(' ').toLowerCase();
      const searchOk = term ? text.includes(term) : true;
      return deviceTypeOk && searchOk;
    });

    this.computeTotals();
    this.buildSummaryCards();
  }

  resetFilters(): void {
    this.filters = { from: '', to: '', device_type: '', search: '' };
    this.applyFilters();
  }

  private computeTotals(): void {
    this.totals.usage = this.usageFiltered.reduce((a, b) => a + (b.count || 0), 0);

    this.totals.available = this.stockFiltered.reduce((a, b) => a + (b.available || 0), 0);
    this.totals.reserved  = this.stockFiltered.reduce((a, b) => a + (b.reserved || 0), 0);
    this.totals.faulty    = this.stockFiltered.reduce((a, b) => a + (b.faulty || 0), 0);
    this.totals.stock     = this.totals.available + this.totals.reserved + this.totals.faulty;
  }

  private buildSummaryCards(): void {
    this.summaryCards = [
      { label: 'Total Usage Count', value: this.totals.usage },
      { label: 'Stock Available', value: this.totals.available },
      { label: 'Stock Reserved', value: this.totals.reserved },
      { label: 'Stock Faulty', value: this.totals.faulty },
      { label: 'Stock Total', value: this.totals.stock },
    ];
  }

  exportUsageCSV(): void {
    const headers = ['date','inward_no','device_type','make','category_or_class','phase_or_ratio','meter_type','action','count'];
    const rows: (string | number | undefined)[][] = this.usageFiltered.map(r => [
      r.date,
      r.inward_no,
      r.device_type,
      r.make,
      r.meter_category || r.ct_class,
      r.device_type === 'METER' ? r.phase : undefined,
      r.device_type === 'METER' ? r.meter_type : r.ct_ratio,
      r.action,
      r.count
    ]);
    // this.downloadCSV('usage_report.csv', [headers, ...rows]);
  }

  exportStockCSV(): void {
    const headers = ['device_type','make','category_or_class','phase_or_ratio','meter_type','available','reserved','faulty','total'];
    const rows = this.stockFiltered.map(s => [
      s.device_type,
      s.make,
      s.meter_category || s.ct_class || '',
      s.phase || s.ct_ratio || '',
      s.meter_type || '',
      s.available,
      s.reserved,
      s.faulty,
      (s.available + s.reserved + s.faulty)
    ]);
    this.downloadCSV('stock_report.csv', [headers, ...rows]);
  }

  private downloadCSV(filename: string, data: (string|number)[][]): void {
    const csv = data.map(row =>
      row.map(val => {
        const v = String(val ?? '');
        return /[",\n]/.test(v) ? `"${v.replace(/"/g,'""')}"` : v;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 0);
  }

  print(): void {
    window.print();
  }
}


