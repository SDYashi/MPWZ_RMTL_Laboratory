import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

type DeviceType = 'METER' | 'CT';

interface DeviceSummaryRow {
  device_type: DeviceType;
  make: string;
  meter_category?: string;
  phase?: string;
  meter_type?: string;
  ct_class?: string;
  ct_ratio?: string;
  total_received: number;  // map from total_inwarded
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
    search: '',
    lab_id: ''
  };

  labs: any[] = [];

  reportAll: DeviceSummaryRow[] = [];
  reportFiltered: DeviceSummaryRow[] = [];

  // footer totals (for the *visible* rows)
  totals = { total_received: 0, tested: 0, passed: 0, failed: 0, dispatched: 0, available_stock: 0 };

  // headline cards from API totals (overall, not filtered)
  summaryCards: { label: string; value: number }[] = [];

  loading = false;

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    this.loadLabs();
    this.loadReport();
  }

  loadLabs(): void {
    this.api.getLabs().subscribe({
      next: (res) => this.labs = res || [],
      error: (e) => console.error(e)
    });
  }

  loadReport(): void {
    this.loading = true;

    this.api.getDevicesSummaryGrid({
      lab_id: this.filters.lab_id || undefined,
      from_date: this.filters.from || undefined,
      to_date: this.filters.to || undefined,
    }).subscribe({
      next: (res) => {
        // Map API rows -> table rows
        this.reportAll = (res.rows || []).map(r => ({
          device_type: r.device_type,
          make: r.make,
          meter_category: r.meter_category ?? undefined,
          phase: r.phase ?? undefined,
          meter_type: r.meter_type ?? undefined,
          ct_class: r.ct_class ?? undefined,
          ct_ratio: r.ct_ratio ?? undefined,
          total_received: r.total_inwarded,
          tested: r.tested,
          passed: r.passed,
          failed: r.failed,
          dispatched: r.dispatched,
          available_stock: r.available_stock
        }));

        // Build headline cards from API totals (unfiltered)
        const t = res.totals || { total_inwarded: 0, tested: 0, passed: 0, failed: 0, dispatched: 0, available_stock: 0 };
        this.summaryCards = [
          { label: 'Inwarded',   value: t.total_inwarded },
          { label: 'Tested',     value: t.tested },
          { label: 'Passed',     value: t.passed },
          { label: 'Failed',     value: t.failed },
          { label: 'Dispatched', value: t.dispatched },
          { label: 'Available',  value: t.available_stock },
        ];

        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading summary grid', err);
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const term = (this.filters.search || '').trim().toLowerCase();

    this.reportFiltered = this.reportAll.filter(r => {
      const typeOk = this.filters.device_type ? r.device_type === this.filters.device_type : true;
      const hay = [
        r.make,
        r.meter_category,
        r.meter_type,
        r.ct_class,
        r.ct_ratio,
        r.phase
      ].filter(Boolean).join(' ').toLowerCase();
      const searchOk = term ? hay.includes(term) : true;
      return typeOk && searchOk;
    });

    this.computeTotals();
  }

  resetFilters(): void {
    this.filters = { from: '', to: '', device_type: '', search: '', lab_id: '' };
    this.loadReport();
  }

  computeTotals(): void {
    const sum = (fn: (r: DeviceSummaryRow) => number) =>
      this.reportFiltered.reduce((s, r) => s + fn(r), 0);

    this.totals = {
      total_received: sum(r => r.total_received),
      tested:         sum(r => r.tested),
      passed:         sum(r => r.passed),
      failed:         sum(r => r.failed),
      dispatched:     sum(r => r.dispatched),
      available_stock:sum(r => r.available_stock),
    };
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
      .map(row => row.map(val => `"${String(val ?? '').replace(/"/g,'""')}"`).join(','))
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
