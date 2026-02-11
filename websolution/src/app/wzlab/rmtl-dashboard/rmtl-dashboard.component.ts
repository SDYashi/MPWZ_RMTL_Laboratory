import { Component, OnDestroy, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { Subscription } from 'rxjs';

import {
  AssignmentPercentageItem,
  BarChartItem,
  LineChartItem,
  TestingBarChartItem,
} from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';

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

// ----------------- API RESPONSE TYPES -----------------
interface DashboardMainResponse {
  generated_at?: string;
  counts?: {
    inwards_device: number;
    dispatched_devices: number;
    assigned_for_testing: number;
    not_assigned_for_testing: number;
    testing_completed: number;
    testing_pending: number;
    pending_for_approval: number;
    approval_done: number;
  };
  userwise?: {
    testing_users: any[];
    oic_users: any[];
    store_users: any[];
  };
}

interface DashboardTestingUserResponse {
  generated_at?: string;
  counts?: {
    total_assigned: number;
    total_tested: number;
    pending_for_tested: number;
  };
  pending_devices?: any[];
}

interface DashboardStoreUserResponse {
  generated_at?: string;
  counts?: {
    total_inwards: number;
    total_dispatched: number;
    pending_for_assignment: number;
    pending_for_dispatch_after_testing_done: number;
  };
  pending_devices?: any[];
}

@Component({
  selector: 'app-rmtl-dashboard',
  templateUrl: './rmtl-dashboard.component.html',
  styleUrls: ['./rmtl-dashboard.component.css'],
})
export class RmtlDashboardComponent implements OnInit, OnDestroy {
  currentUser: any | null = null;

  // ✅ ALL DATA VISIBLE
  mainData: DashboardMainResponse | null = null;
  storeData: DashboardStoreUserResponse | null = null;
  testingData: DashboardTestingUserResponse | null = null;

  // loading/error
  isLoading = false;
  error: string | null = null;

  // filters (if you want later)
  currentFilters: any = {
    lab_id: 0,         // 0 = all labs for main api
    start_date: null,
    end_date: null,
    device_type: null,
  };

  // ---------------- CHARTS ----------------
  private devicesByTypeChart?: Chart;
  private testingProgressChart?: Chart;
  private assignmentPctChart?: Chart;
  private inwardPerDayChart?: Chart;

  private devicesByTypeConfig?: ChartConfiguration<'bar'>;
  private testingProgressConfig?: ChartConfiguration<'bar'>;
  private assignmentPctConfig?: ChartConfiguration<'bar'>;
  private inwardPerDayConfig?: ChartConfiguration<'line'>;

  private chartSourcesLoaded = {
    barDevices: false,
    barTesting: false,
    barAssignPct: false,
    lineInward: false,
  };
  private chartDataReady = false;

  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private api: ApiServicesService,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    const raw = localStorage.getItem('current_user');
    if (raw) {
      try {
        this.currentUser = JSON.parse(raw);
      } catch {
        this.currentUser = null;
      }
    }
    this.reloadAll();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    this.subs.forEach((s) => s.unsubscribe());
  }

  // ---------------- ACTIONS ----------------

  reloadAll(): void {
    this.error = null;
    this.isLoading = true;

    this.mainData = null;
    this.storeData = null;
    this.testingData = null;

    // reset charts
    this.destroyCharts();
    this.chartDataReady = false;
    this.chartSourcesLoaded = {
      barDevices: false,
      barTesting: false,
      barAssignPct: false,
      lineInward: false,
    };
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const from_date = this.currentFilters?.start_date || first.toISOString().split('T')[0];
      const to_date = this.currentFilters?.end_date || last.toISOString().split('T')[0]; 

    const sub1 = this.api.getDashboardMain({
      from_date,
      to_date,
      lab_id: this.currentFilters?.lab_id ?? '',
    }).subscribe({
      next: (res: DashboardMainResponse) => (this.mainData = res),
      error: (err) => this.setError(err),
    });

    const sub2 = this.api.getDashboardStoreUser({
      from_date,
      to_date,
    }).subscribe({
      next: (res: DashboardStoreUserResponse) => (this.storeData = res),
      error: (err) => this.setError(err),
    });

    const sub3 = this.api.getDashboardTestingUser({
      from_date,
      to_date,
    }).subscribe({
      next: (res: DashboardTestingUserResponse) => (this.testingData = res),
      error: (err) => this.setError(err),
    });

    this.subs.push(sub1, sub2, sub3);

    // ✅ charts (optional) — if your chart APIs are public for all, keep them
    this.reloadChartsData();

    // stop loader once all 3 arrived (simple timer based check)
    const watcher = setInterval(() => {
      const done = !!this.mainData && !!this.storeData && !!this.testingData;
      if (done || this.error) {
        clearInterval(watcher);
        this.isLoading = false;
        this.renderChartsIfReady();
      }
    }, 100);
  }

  private setError(err: any) {
    this.error = err?.error?.detail || err?.message || 'Something went wrong';
    this.isLoading = false;
  }

  onLogout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    this.router.navigate(['/wzlogin']);
  }

  // ---------------- UI HELPERS ----------------

  number(n?: number | null): string {
    return (n ?? 0).toLocaleString();
  }

  // ---------------- CHARTS ----------------

  private buildParamsForApi() {
    return {
      lab_id: this.currentFilters.lab_id,
      start_date: this.currentFilters.start_date,
      end_date: this.currentFilters.end_date,
      device_type: this.currentFilters.device_type,
    };
  }

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
            plugins: { legend: { display: false } },
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
      this.api.getTestingBarChart(p).subscribe((data: TestingBarChartItem[]) => {
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
            plugins: { legend: { position: 'bottom' } },
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
      this.api.getAssignmentPercentage(p).subscribe((data: AssignmentPercentageItem[]) => {
        const labels = data.map((x) => x.device_type);
        const pctValues = data.map((x) => parseFloat(String(x.percentage).replace('%', '')));

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
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false } },
              y: {
                beginAtZero: true,
                max: 100,
                ticks: { callback: (val) => val + '%' },
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
      this.api.getCompletedActivitiesLine(p).subscribe((data: LineChartItem[]) => {
        const sorted = [...data].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const labels = sorted.map((x) => this.formatDateLabel(x.date));
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
            plugins: { legend: { position: 'bottom' } },
            scales: {
              x: { grid: { display: false } },
              y: { beginAtZero: true, ticks: { precision: 0 } },
            },
          },
        };
        this.chartSourcesLoaded.lineInward = true;
        this.renderChartsIfReady();
      })
    );
  }

  private renderChartsIfReady(): void {
    if (this.chartDataReady) return;
    if (this.isLoading || this.error) return;

    const allReady =
      this.chartSourcesLoaded.barDevices &&
      this.chartSourcesLoaded.barTesting &&
      this.chartSourcesLoaded.barAssignPct &&
      this.chartSourcesLoaded.lineInward;

    if (!allReady) return;

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

  private initOrUpdateChart(
    canvasId: string,
    chartInstance: Chart | undefined,
    config: ChartConfiguration
  ): Chart {
    if (chartInstance) chartInstance.destroy();
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return chartInstance as any;
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
    const month = d.toLocaleString('en-GB', { month: 'short' });
    return `${day} ${month}`;
  }
}
