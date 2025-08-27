import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { Subject, takeUntil, debounceTime } from 'rxjs';

type UsageAction = 'TESTED' | 'RECEIVED' | 'ISSUED' | 'FAILED' | 'DISPATCHED';

interface UsageRow {
  date: string;          // ISO date string
  inward_no: string;
  device_type: 'METER' | 'CT';
  make: string;
  meter_category?: string;
  phase?: '1P' | '3P';
  meter_type?: string;
  ct_class?: string;
  ct_ratio?: string;
  action: UsageAction;
  count: number;
}

interface StockRow {
  device_type: 'METER' | 'CT';
  make: string;
  meter_category?: string;
  phase?: '1P' | '3P';
  meter_type?: string;
  ct_class?: string;
  ct_ratio?: string;
  available: number;
  reserved: number;
  faulty: number;
}

interface ApiUsageRow {
  date?: string | null;
  inward_no?: string | null;
  device_type?: string | null;
  make?: string | null;
  meter_category?: string | null;
  phase?: string | null;
  meter_type?: string | null;
  ct_class?: string | null;
  ct_ratio?: string | null;
  action?: string | null;
  count?: number | null;
}
interface ApiStockRow {
  device_type?: string | null;
  make?: string | null;
  meter_category?: string | null;
  phase?: string | null;
  meter_type?: string | null;
  ct_class?: string | null;
  ct_ratio?: string | null;
  available?: number | null;
  reserved?: number | null;
  faulty?: number | null;
}
interface LabReport {
  usageAll: ApiUsageRow[];
  stockAll: ApiStockRow[];
}

@Component({
  selector: 'app-rmtl-usage-stock-reports',
  templateUrl: './rmtl-usage-stock-reports.component.html',
  styleUrls: ['./rmtl-usage-stock-reports.component.css']
})
export class RmtlUsageStockReportsComponent implements OnInit, OnDestroy {

  // Filters
  filters = {
    from: '',
    to: '',
    device_type: '' as '' | 'METER' | 'CT',
    search: ''
  };

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Data
  usageAll: UsageRow[] = [];
  stockAll: StockRow[] = [];

  // View models (filtered)
  usageFiltered: UsageRow[] = [];
  stockFiltered: StockRow[] = [];

  totals = { usage: 0, available: 0, reserved: 0, faulty: 0, stock: 0 };
  summaryCards: { label: string; value: number }[] = [];

  // UX
  loading = false;
  error: string | null = null;

  // Pagination (independent for each tab)
  pageSizeOptions = [10, 25, 50, 100];

  // Usage pagination
  usagePage = 1;
  usagePageSize = 25;
  get usageTotal(): number { return this.usageFiltered.length; }
  get usageIndexOfFirst(): number { return (this.usagePage - 1) * this.usagePageSize; }
  get usageIndexOfLast(): number { return Math.min(this.usageIndexOfFirst + this.usagePageSize, this.usageTotal); }
  get usageTotalPages(): number { return Math.max(1, Math.ceil(this.usageTotal / this.usagePageSize)); }
  pagedUsage(): UsageRow[] {
    if (!this.usageFiltered.length) return [];
    return this.usageFiltered.slice(this.usageIndexOfFirst, this.usageIndexOfLast);
  }
  usageGoToPage(p: number): void { if (p >= 1 && p <= this.usageTotalPages) this.usagePage = p; }
  usageNext(): void { if (this.usagePage < this.usageTotalPages) this.usagePage++; }
  usagePrev(): void { if (this.usagePage > 1) this.usagePage--; }
  usagePageWindow(radius: number = 2): number[] {
    const start = Math.max(1, this.usagePage - radius);
    const end = Math.min(this.usageTotalPages, this.usagePage + radius);
    const arr: number[] = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  }

  // Stock pagination
  stockPage = 1;
  stockPageSize = 25;
  get stockTotal(): number { return this.stockFiltered.length; }
  get stockIndexOfFirst(): number { return (this.stockPage - 1) * this.stockPageSize; }
  get stockIndexOfLast(): number { return Math.min(this.stockIndexOfFirst + this.stockPageSize, this.stockTotal); }
  get stockTotalPages(): number { return Math.max(1, Math.ceil(this.stockTotal / this.stockPageSize)); }
  pagedStock(): StockRow[] {
    if (!this.stockFiltered.length) return [];
    return this.stockFiltered.slice(this.stockIndexOfFirst, this.stockIndexOfLast);
  }
  stockGoToPage(p: number): void { if (p >= 1 && p <= this.stockTotalPages) this.stockPage = p; }
  stockNext(): void { if (this.stockPage < this.stockTotalPages) this.stockPage++; }
  stockPrev(): void { if (this.stockPage > 1) this.stockPage--; }
  stockPageWindow(radius: number = 2): number[] {
    const start = Math.max(1, this.stockPage - radius);
    const end = Math.min(this.stockTotalPages, this.stockPage + radius);
    const arr: number[] = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  }

  constructor(private api: ApiServicesService, private auth: AuthService) { }

  lab_id: number = (() => {
    const user = this.auth.getuserfromtoken();
    return user && user.lab_id ? Number(user.lab_id) : 0;
  })();

  ngOnInit(): void {
    this.search$.pipe(debounceTime(250), takeUntil(this.destroy$)).subscribe(() => this.applyFilters());
    this.loadLabReport();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ---------- Normalization helpers ----------
  private asDeviceType(v?: string | null): 'METER' | 'CT' | null {
    if (!v) return null;
    const up = v.toUpperCase().trim();
    return (up === 'METER' || up === 'CT') ? up : null;
  }
  private asPhase(v?: string | null): '1P' | '3P' | undefined {
    if (!v) return undefined;
    const up = v.toUpperCase().trim();
    if (['1P','SINGLE','SINGLE_PHASE','SINGLE-PHASE','1-P'].includes(up)) return '1P';
    if (['3P','THREE','THREE_PHASE','THREE-PHASE','3-P'].includes(up)) return '3P';
    if (up === '1P' || up === '3P') return up as '1P'|'3P';
    return undefined;
  }
  private asAction(v?: string | null): UsageAction {
    const up = (v || '').toUpperCase().trim();
    const allowed: UsageAction[] = ['TESTED','RECEIVED','ISSUED','FAILED','DISPATCHED'];
    return (allowed as string[]).includes(up) ? (up as UsageAction) : 'TESTED';
  }
  private nonEmpty(s?: string | null): string | undefined {
    const v = (s || '').trim();
    return v || undefined;
  }

  // ---------- API loader ----------
  private loadLabReport(): void {
    if (!this.lab_id) { this.error = 'No lab selected.'; return; }
    this.loading = true; this.error = null;

    this.api.getLabReportUsageStock(this.lab_id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: LabReport) => {
          // Usage
          this.usageAll = (res?.usageAll ?? []).map((r: ApiUsageRow) => {
            const deviceType = this.asDeviceType(r.device_type) || 'METER';
            return {
              date: (r.date || '').slice(0,10),
              inward_no: r.inward_no || '',
              device_type: deviceType,
              make: r.make || '',
              meter_category: this.nonEmpty(r.meter_category),
              phase: deviceType === 'METER' ? this.asPhase(r.phase) : undefined,
              meter_type: deviceType === 'METER' ? this.nonEmpty(r.meter_type) : undefined,
              ct_class: deviceType === 'CT' ? this.nonEmpty(r.ct_class) : undefined,
              ct_ratio: deviceType === 'CT' ? this.nonEmpty(r.ct_ratio) : undefined,
              action: this.asAction(r.action),
              count: Number(r.count || 0)
            };
          });

          // Stock
          this.stockAll = (res?.stockAll ?? []).map((s: ApiStockRow) => {
            const deviceType = this.asDeviceType(s.device_type) || 'METER';
            return {
              device_type: deviceType,
              make: s.make || '',
              meter_category: this.nonEmpty(s.meter_category),
              phase: deviceType === 'METER' ? this.asPhase(s.phase) : undefined,
              meter_type: deviceType === 'METER' ? this.nonEmpty(s.meter_type) : undefined,
              ct_class: deviceType === 'CT' ? this.nonEmpty(s.ct_class) : undefined,
              ct_ratio: deviceType === 'CT' ? this.nonEmpty(s.ct_ratio) : undefined,
              available: Number(s.available || 0),
              reserved: Number(s.reserved || 0),
              faulty: Number(s.faulty || 0)
            };
          });

          this.applyFilters();
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.error = (err?.error?.detail || err?.message || 'Failed to load lab report.');
        }
      });
  }

  onSearchChange(val: string): void {
    this.filters.search = val;
    this.search$.next(val);
  }

  // ---------- Filtering ----------
  applyFilters(): void {
    const fromTS = this.filters.from ? new Date(this.filters.from + 'T00:00:00').getTime() : null;
    const toTS   = this.filters.to   ? new Date(this.filters.to   + 'T23:59:59').getTime() : null;

    if (fromTS && toTS && fromTS > toTS) {
      const tmp = this.filters.from; this.filters.from = this.filters.to; this.filters.to = tmp;
    }

    const term = (this.filters.search || '').trim().toLowerCase();

    // Usage
    this.usageFiltered = this.usageAll.filter(r => {
      const ts = new Date(r.date).getTime();
      const deviceTypeOk = this.filters.device_type ? r.device_type === this.filters.device_type : true;
      const dateOk = (!fromTS || ts >= fromTS) && (!toTS || ts <= toTS);
      const text = [r.inward_no, r.make, r.meter_category, r.meter_type, r.ct_class, r.ct_ratio, r.phase]
        .filter(Boolean).join(' ').toLowerCase();
      const searchOk = term ? text.includes(term) : true;
      return deviceTypeOk && dateOk && searchOk;
    });

    // Stock
    this.stockFiltered = this.stockAll.filter(s => {
      const deviceTypeOk = this.filters.device_type ? s.device_type === this.filters.device_type : true;
      const text = [s.make, s.meter_category, s.meter_type, s.ct_class, s.ct_ratio, s.phase]
        .filter(Boolean).join(' ').toLowerCase();
      const searchOk = term ? text.includes(term) : true;
      return deviceTypeOk && searchOk;
    });

    this.computeTotals();
    this.buildSummaryCards();

    // Reset both paginations after filter changes
    this.usagePage = 1;
    this.stockPage = 1;
  }

  resetFilters(): void {
    this.filters = { from: '', to: '', device_type: '', search: '' };
    this.applyFilters();
  }

  private computeTotals(): void {
    this.totals.usage = this.usageFiltered.reduce((a, b) => a + (b.count || 0), 0);
    this.totals.available = this.stockFiltered.reduce((a, b) => a + (b.available || 0), 0);
    this.totals.reserved  = this.stockFiltered.reduce((a, b) => a + (b.reserved  || 0), 0);
    this.totals.faulty    = this.stockFiltered.reduce((a, b) => a + (b.faulty    || 0), 0);
    this.totals.stock     = this.totals.available + this.totals.reserved + this.totals.faulty;
  }

  private buildSummaryCards(): void {
    this.summaryCards = [
      { label: 'Total Usage Count', value: this.totals.usage },
      { label: 'Stock Available',   value: this.totals.available },
      { label: 'Stock Reserved',    value: this.totals.reserved },
      { label: 'Stock Faulty',      value: this.totals.faulty },
      { label: 'Stock Total',       value: this.totals.stock },
    ];
  }

  // ---------- Exports ----------
  exportUsageCSV(): void {
    // Export ALL filtered rows. To export only current page, replace usageFiltered with pagedUsage()
    const headers = ['date','inward_no','device_type','make','category_or_class','phase_or_ratio','meter_type','action','count'];
    const rows: (string | number | undefined)[][] = this.usageFiltered.map(r => [
      r.date, r.inward_no, r.device_type, r.make,
      r.meter_category || r.ct_class,
      r.device_type === 'METER' ? r.phase : r.ct_ratio,
      r.device_type === 'METER' ? r.meter_type : '',
      r.action, r.count
    ]);
    this.downloadCSV('usage_report.csv', [headers, ...rows]);
  }

  exportStockCSV(): void {
    // Export ALL filtered rows. To export only current page, replace stockFiltered with pagedStock()
    const headers = ['device_type','make','category_or_class','phase_or_ratio','meter_type','available','reserved','faulty','total'];
    const rows = this.stockFiltered.map(s => [
      s.device_type, s.make,
      s.meter_category || s.ct_class || '',
      s.phase || s.ct_ratio || '',
      s.meter_type || '',
      s.available, s.reserved, s.faulty,
      (s.available + s.reserved + s.faulty)
    ]);
    this.downloadCSV('stock_report.csv', [headers, ...rows]);
  }

  private downloadCSV(filename: string, data: (string|number|undefined)[][]): void {
    const csv = data.map(row =>
      row.map(val => {
        const v = String(val ?? '');
        return /[",\n]/.test(v) ? `"${v.replace(/"/g,'""')}"` : v;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url; a.setAttribute('download', filename);
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  }

  print(): void { window.print(); }
}
