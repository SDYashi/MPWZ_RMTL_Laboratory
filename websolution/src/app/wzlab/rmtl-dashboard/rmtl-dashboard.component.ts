import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  NgZone,
} from '@angular/core';
import { Router } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { Subscription } from 'rxjs';
import {
  AssignmentDashboardData,
  AssignmentPercentageItem,
  BarChartItem,
  LineChartItem,
  TestingBarChartItem,
  TestingDashboardData,
} from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';

type TestingStatusName = 'COMPLETED' | 'UNTESTABLE' | string;

import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

interface DashboardCounts {
  labs: number;
  users: number;
  benches: number;
  stores: number;
  vendors: number;
  offices: number;
  gatepasses: number;
  assignments: number;
  testings: number;
  inwards: number;
  dispatcheds: number;
  approved_statuses: number;
  pending_approvals: number;
}

interface DeviceLite {
  id: number;
  device_type: string | null;
  serial_number: string | null;
  make: string | null;
  location_name: string | null;
  inward_date: string | null;
  dispatch_date: string | null;
  meter_type: string | null;
  meter_category?: string | null;
  meter_class?: string | null;
  capacity?: string | null;
  phase?: string | null;
  voltage_rating?: string | null;
  ct_ratio?: string | null;
  ct_class?: string | null;
  inward_number?: string | null;
  dispatch_number?: string | null;
  device_status?: string | null;
  connection_type?: string | null;
  office_type?: string | null;
  device_testing_purpose?: string | null;
}

interface StockStatus {
  inward: number;
  dispatched: number;
  recent_inwards: DeviceLite[];
  recent_dispatcheds: DeviceLite[];
}

interface TestingAggRow {
  total: number;
  test_status: TestingStatusName;
}

interface StatusRow {
  group: 'DEVICE' | 'ASSIGN' | string;
  status: string;
  count: number;
}
interface RecentItem {
  text: string;
}
interface RecentHistoryResponse {
  statuses: StatusRow[];
  recent_devices: RecentItem[];
  recent_users: RecentItem[];
  recent_benches: RecentItem[];
  recent_stores: RecentItem[];
  recent_vendors: RecentItem[];
  recent_offices: RecentItem[];
  recent_stocks: RecentItem[];
  recent_gatepasses: RecentItem[];
  recent_inwards: RecentItem[];
  recent_dispatcheds: RecentItem[];
  recent_assignments: RecentItem[];
  recent_testings: RecentItem[];
  recent_approvals: RecentItem[];
  recent_tested: RecentItem[];
}

@Component({
  selector: 'app-rmtl-dashboard',
  templateUrl: './rmtl-dashboard.component.html',
  styleUrls: ['./rmtl-dashboard.component.css'],
})
export class RmtlDashboardComponent implements OnInit, OnDestroy {
  currentUser: any | null = null;

  // API data
  counts: DashboardCounts | null = null;
  testingAgg: TestingAggRow[] = [];
  stock: StockStatus | null = null;
  recent: RecentHistoryResponse | null = null;

  // derived map: group -> normalizedStatus -> count
  private statusCountsByGroup: Record<string, Record<string, number>> = {};

  // UX state
  loading = { counts: true, testing: true, stock: true, recent: true };
  error: string | null = null;

  // To know when chart data has landed
  private chartSourcesLoaded = {
    barDevices: false,
    barTesting: false,
    barAssignPct: false,
    lineInward: false,
  };
  private chartDataReady = false;

  /** Small cards config */
  secondaryCards: { key: keyof DashboardCounts; label: string; icon: string }[] =
    [
      { key: 'labs', label: 'Labs', icon: 'fa-flask' },
      { key: 'users', label: 'Users', icon: 'fa-users' },
      { key: 'benches', label: 'Benches', icon: 'fa-microscope' },
      { key: 'stores', label: 'Stores', icon: 'fa-warehouse' },
      { key: 'vendors', label: 'Vendors', icon: 'fa-handshake' },
      { key: 'offices', label: 'Offices', icon: 'fa-building' },
    ];

  /** Recent tables config */
  tablesConfig: Array<{
    key: keyof RecentHistoryResponse;
    title: string;
    icon: string;
  }> = [
    {
      key: 'recent_devices',
      title: 'Recent Devices',
      icon: 'fa-microchip text-primary',
    },
    {
      key: 'recent_users',
      title: 'Recent Users',
      icon: 'fa-user text-secondary',
    },
    {
      key: 'recent_benches',
      title: 'Recent Benches',
      icon: 'fa-vials text-info',
    },
    {
      key: 'recent_stores',
      title: 'Recent Stores',
      icon: 'fa-store text-success',
    },
    {
      key: 'recent_vendors',
      title: 'Recent Vendors',
      icon: 'fa-handshake text-warning',
    },
    {
      key: 'recent_offices',
      title: 'Recent Offices',
      icon: 'fa-building text-danger',
    },
    {
      key: 'recent_inwards',
      title: 'Recent Inwards',
      icon: 'fa-arrow-down text-success',
    },
    {
      key: 'recent_dispatcheds',
      title: 'Recent Dispatched',
      icon: 'fa-arrow-up text-primary',
    },
    {
      key: 'recent_assignments',
      title: 'Recent Assignments',
      icon: 'fa-tasks text-secondary',
    },
    {
      key: 'recent_testings',
      title: 'Recent Testings',
      icon: 'fa-vial text-info',
    },
    {
      key: 'recent_approvals',
      title: 'Recent Approvals',
      icon: 'fa-thumbs-up text-success',
    },
    {
      key: 'recent_tested',
      title: 'Recently Marked Tested',
      icon: 'fa-check text-dark',
    },
  ];

  constructor(
    private router: Router,
    private api: ApiServicesService,
    private zone: NgZone // to safely run after change detection
  ) {}

  // ---------------- LIFECYCLE ----------------

  ngOnInit(): void {
    const raw = localStorage.getItem('current_user');
    if (raw) {
      try {
        this.currentUser = JSON.parse(raw);
      } catch {
        this.currentUser = null;
      }
    }
    this.fetchAll();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    this.subs.forEach((s) => s.unsubscribe());
  }

  // ---------------- LOADING + STATE ----------------

  private fetchAll(): void {
    // counts
    this.api.getCountsDashboard().subscribe({
      next: (res) => {
        this.counts = res as DashboardCounts;
      },
      error: (err) => this.fail(err),
      complete: () => {
        this.loading.counts = false;
        this.maybeFinishLoading();
      },
    });

    // testing status
    this.api.getTestingStatusDashboard().subscribe({
      next: (res) => {
        const maybeBlock = Array.isArray(res) ? res[0] ?? null : (res as any);

        if (maybeBlock && Array.isArray(maybeBlock.recent_testing_data)) {
          // new format
          const recent = maybeBlock.recent_testing_data as Array<{
            test_status?: string;
          }>;
          const map: Record<string, number> = {};
          for (const r of recent) {
            const k = this.normalizeStatus(r?.test_status || 'UNKNOWN');
            map[k] = (map[k] || 0) + 1;
          }
          this.testingAgg = Object.entries(map).map(([k, v]) => ({
            test_status: k,
            total: v,
          }));
        } else {
          // legacy [{ total, test_status }]
          const arr = Array.isArray(res) ? res : res ? [res] : [];
          this.testingAgg = arr
            .filter((r: any) => r?.test_status || r?.status)
            .map(
              (r: any): TestingAggRow => ({
                total: Number(r?.total ?? 0),
                test_status: this.normalizeStatus(
                  String(r?.test_status ?? r?.status ?? '')
                ),
              })
            );
        }
      },
      error: () => {
        this.testingAgg = [];
      },
      complete: () => {
        this.loading.testing = false;
        this.maybeFinishLoading();
      },
    });

    // stock
    this.api.getStockStatusDashboard().subscribe({
      next: (res) => {
        this.stock = res as StockStatus;
      },
      error: () => {
        this.stock = {
          inward: 0,
          dispatched: 0,
          recent_inwards: [],
          recent_dispatcheds: [],
        };
      },
      complete: () => {
        this.loading.stock = false;
        this.maybeFinishLoading();
      },
    });

    // recent
    this.api.getRecentHistoryDashboard().subscribe({
      next: (res) => {
        this.recent = res as RecentHistoryResponse;
        this.statusCountsByGroup = this.buildStatusMap(
          this.recent?.statuses || []
        );
      },
      error: () => {
        this.recent = {
          statuses: [],
          recent_devices: [],
          recent_users: [],
          recent_benches: [],
          recent_stores: [],
          recent_vendors: [],
          recent_offices: [],
          recent_stocks: [],
          recent_gatepasses: [],
          recent_inwards: [],
          recent_dispatcheds: [],
          recent_assignments: [],
          recent_testings: [],
          recent_approvals: [],
          recent_tested: [],
        };
        this.statusCountsByGroup = {};
      },
      complete: () => {
        this.loading.recent = false;
        this.maybeFinishLoading();
      },
    });

    // charts data calls
    this.reloadChartsData();
  }

  /** called after each block finishes */
  private maybeFinishLoading(): void {
    // once ALL main dashboard data is done, change detection will allow *ngIf to render canvases
    // then we try rendering charts
    if (!this.isLoading && !this.chartDataReady) {
        // chart data also must be ready to actually draw
        this.renderChartsIfReady();
    }
  }

  get isLoading(): boolean {
    const s = this.loading;
    return s.counts || s.testing || s.stock || s.recent;
  }

  private fail(err: any) {
    this.error = err?.error?.detail || err?.message || 'Something went wrong';
  }

  onLogout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    this.router.navigate(['/wzlogin']);
  }

  // ----------------- KPI HELPERS -----------------

  number(n?: number | null): string {
    return (n ?? 0).toLocaleString();
  }
  getCount(key: keyof DashboardCounts): number {
    return this.counts ? this.counts[key] ?? 0 : 0;
  }

  normalizeStatus(s?: string | null): string {
    if (!s) return '';
    const last = String(s).split('.').pop() || s;
    return last.replace(/[^A-Za-z0-9_ ]/g, '').toUpperCase();
  }

  private buildStatusMap(
    rows: StatusRow[]
  ): Record<string, Record<string, number>> {
    const map: Record<string, Record<string, number>> = {};
    for (const r of rows || []) {
      const g = (r.group || '').toUpperCase();
      const k = this.normalizeStatus(r.status);
      if (!g || !k) continue;
      if (!map[g]) map[g] = {};
      map[g][k] = (map[g][k] || 0) + (r.count || 0);
    }
    return map;
  }

  countStatus(group: 'DEVICE' | 'ASSIGN', status: string): number {
    const g = this.statusCountsByGroup[group] || {};
    const k = this.normalizeStatus(status);
    return g[k] || 0;
  }

  get testingTotal(): number {
    return this.testingAgg.reduce((a, b) => a + (b?.total ?? 0), 0);
  }

  get testingCompleted(): number {
    const fromAgg = this.testingAgg
      .filter(
        (r) => this.normalizeStatus(r.test_status) === 'COMPLETED'
      )
      .reduce((a, b) => a + (b?.total ?? 0), 0);
    if (fromAgg) return fromAgg;
    return this.countStatus('ASSIGN', 'TESTED');
  }

  get testingUntestable(): number {
    const fromAgg = this.testingAgg
      .filter(
        (r) => this.normalizeStatus(r.test_status) === 'UNTESTABLE'
      )
      .reduce((a, b) => a + (b?.total ?? 0), 0);
    if (fromAgg) return fromAgg;
    return 0;
  }

  get testingPercentComplete(): number {
    const denom = this.counts?.testings ?? this.testingTotal;
    if (!denom) return 0;
    return Math.round((this.testingCompleted / denom) * 100);
  }

  // ----------------- TABLE HELPERS -----------------

  private preferredOrder = [
    'id',
    'device_id',
    'user_id',
    'serial',
    'serial_number',
    'status',
    'assignment_status',
    'test_status',
    'device_status',
    'make',
    'type',
    'device_type',
    'phase',
    'category',
    'meter_category',
    'updated',
    'updated_at',
    'inward_date',
    'dispatch_date',
    'dispatch_number',
  ];

  trackByIdx = (i: number) => i;

  getList<K extends keyof RecentHistoryResponse>(key: K): any[] {
    return (this.recent?.[key] as any[]) ?? [];
  }

  get statusTable(): Array<{
    group: string;
    status: string;
    count: number;
  }> {
    const rows = this.recent?.statuses ?? [];
    return rows
      .map((r) => ({
        group: (r.group || '').toUpperCase(),
        status: this.normalizeStatus(r.status),
        count: r.count ?? 0,
      }))
      .sort((a, b) =>
        (a.group + a.status).localeCompare(b.group + b.status)
      );
  }

  deriveCols(data: any[] | null | undefined): string[] {
    const colsSet = new Set<string>();
    const rows = Array.isArray(data) ? data : [];
    const sample = rows.slice(0, 50);

    for (const r of sample) {
      const obj = this.asRow(r);
      Object.keys(obj).forEach((k) => colsSet.add(k));
    }

    const all = Array.from(colsSet);
    const preferred = this.preferredOrder.filter((k) =>
      all.includes(k)
    );
    const rest = all
      .filter((k) => !this.preferredOrder.includes(k))
      .sort((a, b) => a.localeCompare(b));
    return [...preferred, ...rest];
  }

  prettify(key: string): string {
    const k = (key || '')
      .replace(/\./g, ' ')
      .replace(/_/g, ' ')
      .trim();
    return k.charAt(0).toUpperCase() + k.slice(1);
  }

  cell(row: any, col: string): any {
    const obj = this.asRow(row);
    const val = obj[col];
    if (val === null || val === undefined || val === '') return '—';

    if (typeof val === 'string') {
      // ISO-like datetime formatting
      if (
        /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(val)
      ) {
        return val.replace('T', ' ');
      }
    }
    return val;
  }

  private asRow(row: any): Record<string, any> {
    if (!row) return {};
    if (this.isKVTextRow(row)) return this.parseKVText(row.text);

    if (typeof row === 'object' && !Array.isArray(row)) {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(row)) {
        if (typeof v === 'string' && v.includes('.')) {
          out[k] = this.normalizeStatus(v);
        } else {
          out[k] = v;
        }
      }
      return out;
    }
    return { value: String(row) };
  }

  private isKVTextRow(row: any): boolean {
    return (
      row &&
      typeof row === 'object' &&
      typeof row.text === 'string' &&
      row.text.includes('=')
    );
  }

  private standardizeKey(k: string): string {
    const key = k.trim().toLowerCase();
    switch (key) {
      case 'serialno':
      case 'serial_number':
      case 'serialno.':
      case 'srno':
      case 'sr':
        return 'serial';
      case 'device_id':
        return 'device_id';
      case 'user_id':
        return 'user_id';
      case 'assignment_status':
        return 'assignment_status';
      case 'test_status':
        return 'test_status';
      case 'device_status':
        return 'device_status';
      case 'meter_category':
        return 'meter_category';
      case 'meter_class':
        return 'meter_class';
      case 'updated_at':
        return 'updated_at';
      default:
        return key;
    }
  }

  private parseKVText(s: string): Record<string, string> {
    const out: Record<string, string> = {};
    if (!s) return out;

    const parts = s
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    for (const part of parts) {
      const eq = part.indexOf('=');
      if (eq === -1) {
        out['other'] =
          (out['other'] ? out['other'] + ' ' : '') + part;
        continue;
      }
      const rawKey = part.slice(0, eq).trim();
      let rawVal = part.slice(eq + 1).trim();

      if (rawVal.includes('.')) {
        rawVal = this.normalizeStatus(rawVal);
      }

      const key = this.standardizeKey(rawKey);
      out[key] = rawVal;
    }
    return out;
  }

  // ----------------- FILTERS / REFRESH -----------------

  currentFilters: any = {
    lab_id: null,
    start_date: null,
    end_date: null,
    device_type: null,
  };

  reloadAll(): void {
    // refresh charts + KPI without full page reload
    this.reloadChartsData();
  }

  private buildParamsForApi() {
    return {
      lab_id: this.currentFilters.lab_id,
      start_date: this.currentFilters.start_date,
      end_date: this.currentFilters.end_date,
      device_type: this.currentFilters.device_type,
    };
  }

  // ----------------- CHART MANAGEMENT -----------------

  // Chart instances
  private devicesByTypeChart?: Chart;
  private testingProgressChart?: Chart;
  private assignmentPctChart?: Chart;
  private inwardPerDayChart?: Chart;

  private subs: Subscription[] = [];

  /** Fetch all chart data endpoints */
  private reloadChartsData(): void {
    const p = this.buildParamsForApi();

    // Devices by Type
    this.subs.push(
      this.api.getBarChart(p).subscribe((data: BarChartItem[]) => {
        const labels = data.map((x) => x.device_type);
        const counts = data.map((x) => x.count);

        this.devicesByTypeConfig = {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Total Devices',
                data: counts,
                backgroundColor: 'rgba(13,110,253,0.2)',
                borderColor: 'rgba(13,110,253,1)',
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
            },
            scales: {
              x: { ticks: { autoSkip: false } },
              y: { beginAtZero: true, ticks: { precision: 0 } },
            },
          },
        };
        this.chartSourcesLoaded.barDevices = true;
        this.renderChartsIfReady();
      })
    );

    // Testing Progress
    this.subs.push(
      this.api
        .getTestingBarChart(p)
        .subscribe((data: TestingBarChartItem[]) => {
          const labels = data.map((x) => x.device_type);
          const totals = data.map((x) => x.total);
          const completed = data.map((x) => x.completed);

          this.testingProgressConfig = {
            type: 'bar',
            data: {
              labels,
              datasets: [
                {
                  label: 'Completed',
                  data: completed,
                  backgroundColor: 'rgba(25,135,84,0.2)',
                  borderColor: 'rgba(25,135,84,1)',
                  borderWidth: 1,
                },
                {
                  label: 'Total',
                  data: totals,
                  backgroundColor: 'rgba(108,117,125,0.2)',
                  borderColor: 'rgba(108,117,125,1)',
                  borderWidth: 1,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: { usePointStyle: true, pointStyle: 'rectRounded' },
                },
              },
              scales: {
                x: { stacked: false },
                y: { beginAtZero: true, ticks: { precision: 0 } },
              },
            },
          };
          this.chartSourcesLoaded.barTesting = true;
          this.renderChartsIfReady();
        })
    );

    // Assignment %
    this.subs.push(
      this.api
        .getAssignmentPercentage(p)
        .subscribe((data: AssignmentPercentageItem[]) => {
          const labels = data.map((x) => x.device_type);
          const pctValues = data.map((x) =>
            parseFloat(x.percentage.replace('%', ''))
          );

          this.assignmentPctConfig = {
            type: 'bar',
            data: {
              labels,
              datasets: [
                {
                  label: 'Assigned %',
                  data: pctValues,
                  backgroundColor: 'rgba(255,193,7,0.2)',
                  borderColor: 'rgba(255,193,7,1)',
                  borderWidth: 1,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx: any) => ctx.parsed.y + '%',
                  },
                },
              },
              scales: {
                x: {
                  grid: { display: false },
                },
                y: {
                  beginAtZero: true,
                  max: 100,
                  ticks: {
                    callback: (val) => val + '%',
                  },
                },
              },
            },
          };
          this.chartSourcesLoaded.barAssignPct = true;
          this.renderChartsIfReady();
        })
    );

    // Inward per Day
    this.subs.push(
      this.api
        .getCompletedActivitiesLine(p)
        .subscribe((data: LineChartItem[]) => {
          // sort by date asc
          const sorted = [...data].sort(
            (a, b) =>
              new Date(a.date).getTime() -
              new Date(b.date).getTime()
          );

          const labels = sorted.map((x) =>
            this.formatDateLabel(x.date)
          );
          const counts = sorted.map((x) => x.count);

          this.inwardPerDayConfig = {
            type: 'line',
            data: {
              labels,
              datasets: [
                {
                  label: 'Inwarded Devices',
                  data: counts,
                  borderColor: 'rgba(13,110,253,1)',
                  backgroundColor: 'rgba(13,110,253,0.15)',
                  borderWidth: 2,
                  pointRadius: 3,
                  pointHoverRadius: 5,
                  tension: 0.3,
                  fill: true,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom' },
              },
              scales: {
                x: {
                  grid: { display: false },
                },
                y: {
                  beginAtZero: true,
                  ticks: { precision: 0 },
                },
              },
            },
          };
          this.chartSourcesLoaded.lineInward = true;
          this.renderChartsIfReady();
        })
    );
  }

  // configs get filled by reloadChartsData()
  private devicesByTypeConfig?: ChartConfiguration<'bar'>;
  private testingProgressConfig?: ChartConfiguration<'bar'>;
  private assignmentPctConfig?: ChartConfiguration<'bar'>;
  private inwardPerDayConfig?: ChartConfiguration<'line'>;

  /**
   * Render charts ONLY when:
   * - main section is not loading (so the canvases are actually in DOM due to *ngIf)
   * - all chart datasets are fetched at least once
   */
  private renderChartsIfReady(): void {
    if (this.chartDataReady) return; // already rendered once
    if (this.isLoading || this.error) return;

    const allReady =
      this.chartSourcesLoaded.barDevices &&
      this.chartSourcesLoaded.barTesting &&
      this.chartSourcesLoaded.barAssignPct &&
      this.chartSourcesLoaded.lineInward;

    if (!allReady) return;

    // now canvases definitely exist in DOM.
    this.zone.runOutsideAngular(() => {
      this.devicesByTypeChart = this.initOrUpdateChart(
        'devicesByTypeChart',
        this.devicesByTypeChart,
        this.devicesByTypeConfig!
      );
      this.testingProgressChart = this.initOrUpdateChart(
        'testingProgressChart',
        this.testingProgressChart,
        this.testingProgressConfig!
      );
      this.assignmentPctChart = this.initOrUpdateChart(
        'assignmentPctChart',
        this.assignmentPctChart,
        this.assignmentPctConfig!
      );
      this.inwardPerDayChart = this.initOrUpdateChart(
        'inwardPerDayChart',
        this.inwardPerDayChart,
        this.inwardPerDayConfig!
      );
    });

    this.chartDataReady = true;
  }

  /** helper to init or update chart */
  private initOrUpdateChart(
    canvasId: string,
    chartInstance: Chart | undefined,
    config: ChartConfiguration
  ): Chart {
    if (chartInstance) {
      chartInstance.destroy();
    }
    const canvas = document.getElementById(
      canvasId
    ) as HTMLCanvasElement | null;
    if (!canvas) {
      console.warn('Canvas not found:', canvasId);
      return chartInstance as any;
    }
    return new Chart(canvas, config);
  }

  private destroyCharts(): void {
    this.devicesByTypeChart?.destroy();
    this.testingProgressChart?.destroy();
    this.assignmentPctChart?.destroy();
    this.inwardPerDayChart?.destroy();
  }

  private formatDateLabel(iso: string): string {
    const d = new Date(iso);
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('en-GB', { month: 'short' }); // "Oct"
    return `${day} ${month}`;
  }
}
