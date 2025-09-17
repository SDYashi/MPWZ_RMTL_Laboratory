import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiServicesService } from 'src/app/services/api-services.service';

type DeviceType = 'METER' | 'CT';

interface ApiDevice {
  id: number;
  inward_number: string;
  inward_date: string;   // "YYYY-MM-DD"
  dispatch_number: string | null;
  dispatch_date: string | null;
  device_type: DeviceType | string;
  make: string;
  serial_number: string;
  meter_category?: string | null;
  meter_type?: string | null;
  phase?: string | null;
  ct_class?: string | null;
  ct_ratio?: string | null;
  lab_id?: number | null;
}

interface ApiResponse {
  counts: {
    total: number;
    inwarded: number;
    dispatched: number;
    pending: number;
    tested: number;
    passed: number;
    failed: number;
  };
  inwarded_devices: ApiDevice[];
  dispatched_devices: ApiDevice[];
  tested_devices: ApiDevice[];
  passed_devices: ApiDevice[];
  failed_devices: ApiDevice[];
}

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
    search: '',
    lab_id: ''   // string for select; will convert to number if present
  };

  labs: any[] = [];

  // Raw & derived
  apiCounts: ApiResponse['counts'] | null = null;
  reportAll: DeviceSummaryRow[] = [];
  reportFiltered: DeviceSummaryRow[] = [];

  totals = { total_received: 0, tested: 0, passed: 0, failed: 0, dispatched: 0, available_stock: 0 };
  summaryCards: { label: string; value: number }[] = [];

  loading = false;

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

  /** Fetch, group, and compute metrics from your API shape */
  loadReport(): void {
    this.loading = true;

    let params = new HttpParams();
    if (this.filters.lab_id) params = params.set('lab_id', this.filters.lab_id);
    if (this.filters.from)   params = params.set('from_date', this.filters.from);
    if (this.filters.to)     params = params.set('to_date', this.filters.to);

    // Use your existing endpoint path
    this.http.get<ApiResponse>('/api/reports/all/device-summary-report/', { params }).subscribe({
      next: (res) => {
        this.apiCounts = res.counts;

        // Build quick lookup sets for statuses
        const testedIds     = new Set(res.tested_devices.map(d => d.id));
        const passedIds     = new Set(res.passed_devices.map(d => d.id));
        const failedIds     = new Set(res.failed_devices.map(d => d.id));
        const dispatchedIds = new Set(res.dispatched_devices.map(d => d.id));

        // Optional: local date & lab filtering (in case backend didn’t apply)
        const withinDateLab = (d: ApiDevice) => {
          // lab
          const labOk = this.filters.lab_id ? (String(d.lab_id ?? '') === this.filters.lab_id) : true;
          // date
          const fromOk = this.filters.from ? (d.inward_date >= this.filters.from) : true;
          const toOk   = this.filters.to   ? (d.inward_date <= this.filters.to)   : true;
          return labOk && fromOk && toOk;
        };

        const inwarded = res.inwarded_devices.filter(withinDateLab);
        const dispatched = res.dispatched_devices.filter(withinDateLab); // for completeness

        // Group by tuple key
        type KeyParts = {
          device_type: 'METER' | 'CT';
          make: string;
          meter_category?: string;
          phase?: string;
          meter_type?: string;
          ct_class?: string;
          ct_ratio?: string;
        };

        const keyOf = (d: ApiDevice): KeyParts => ({
          device_type: (d.device_type === 'CT' ? 'CT' : 'METER'),
          make: d.make || '',
          meter_category: d.meter_category || undefined,
          phase: d.phase || undefined,
          meter_type: d.meter_type || undefined,
          ct_class: d.ct_class || undefined,
          ct_ratio: d.ct_ratio || undefined
        });

        const serialize = (k: KeyParts) =>
          JSON.stringify([k.device_type, k.make, k.meter_category || '', k.phase || '', k.meter_type || '', k.ct_class || '', k.ct_ratio || '']);

        const groups = new Map<string, DeviceSummaryRow>();

        const ensure = (k: KeyParts) => {
          const s = serialize(k);
          if (!groups.has(s)) {
            groups.set(s, {
              device_type: k.device_type,
              make: k.make,
              meter_category: k.meter_category,
              phase: k.phase,
              meter_type: k.meter_type,
              ct_class: k.ct_class,
              ct_ratio: k.ct_ratio,
              total_received: 0,
              tested: 0,
              passed: 0,
              failed: 0,
              dispatched: 0,
              available_stock: 0
            });
          }
          return groups.get(s)!;
        };

        // Count inwarded
        inwarded.forEach(d => {
          const row = ensure(keyOf(d));
          row.total_received += 1;
          if (testedIds.has(d.id))  row.tested += 1;
          if (passedIds.has(d.id))  row.passed += 1;
          if (failedIds.has(d.id))  row.failed += 1;
          if (dispatchedIds.has(d.id)) row.dispatched += 1;
        });

        // Some dispatched may not be in inwarded (edge cases) → still reflect dispatched
        dispatched.forEach(d => {
          const row = ensure(keyOf(d));
          row.dispatched += 1;
        });

        // Compute stock
        for (const row of groups.values()) {
          row.available_stock = Math.max(0, row.total_received - row.dispatched);
        }

        this.reportAll = Array.from(groups.values());
        this.applyFilters();

        // Summary cards from API counts (topline)
        this.buildSummaryCardsFromApi();

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading report', err);
        this.loading = false;
      }
    });
  }

  /** Local UI filtering for device type + search */
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
      available_stock:sum(r => r.available_stock)
    };
  }

  /** Topline cards bound to API counts (with a couple derived) */
  buildSummaryCardsFromApi(): void {
    if (!this.apiCounts) {
      this.summaryCards = [];
      return;
    }
    const availableStock = this.apiCounts.inwarded - this.apiCounts.dispatched;
    this.summaryCards = [
      { label: 'Total',        value: this.apiCounts.total },
      { label: 'Inwarded',     value: this.apiCounts.inwarded },
      { label: 'Tested',       value: this.apiCounts.tested },
      { label: 'Passed',       value: this.apiCounts.passed },
      { label: 'Failed',       value: this.apiCounts.failed },
      { label: 'Dispatched',   value: this.apiCounts.dispatched },
      { label: 'Available',    value: availableStock < 0 ? 0 : availableStock },
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
