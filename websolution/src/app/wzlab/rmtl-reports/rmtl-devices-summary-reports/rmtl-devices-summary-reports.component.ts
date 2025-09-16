import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiServicesService } from 'src/app/services/api-services.service';

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

interface Lab {
  id: number;
  name: string;
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
    lab_id: ''   // new filter
  };

  labs: any; // lab dropdown options

  reportAll: DeviceSummaryRow[] = [];
  reportFiltered: DeviceSummaryRow[] = [];
  totals = { total_received: 0, tested: 0, passed: 0, failed: 0, dispatched: 0, available_stock: 0 };
  summaryCards: { label: string; value: number }[] = [];

  constructor(private api: ApiServicesService, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadLabs();
    this.loadReport();
  }

  loadLabs(): void {
    this.api.getLabs().subscribe({
      next: (response) => { this.labs = response || []; },
      error: (error)    => { console.error(error); }
    });
  }

  loadReport(): void {
    const params: any = {};
    if (this.filters.lab_id) params.lab_id = this.filters.lab_id;

    this.http.get<any[]>('/api/reports/all/device-summary-report/', { params }).subscribe({
      next: res => {
        this.reportAll = res.map(r => ({
          device_type: r.device_type,
          make: r.make,
          meter_category: r.meter_category,
          phase: r.phase,
          meter_type: r.meter_type,
          ct_class: r.ct_class,
          ct_ratio: r.ct_ratio,
          total_received: r.count,   // map count → total_received
          tested: 0,
          passed: 0,
          failed: 0,
          dispatched: 0,
          available_stock: r.count   // assume all in stock initially
        }));
        this.applyFilters();
      },
      error: err => console.error('Error loading report', err)
    });
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
    this.filters = { from: '', to: '', device_type: '', search: '', lab_id: '' };
    this.loadReport();
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
