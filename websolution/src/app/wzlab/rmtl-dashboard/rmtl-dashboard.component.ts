import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';

type TestingStatusName = 'COMPLETED' | 'UNTESTABLE' | string;

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
  serial_number: string | null;
  make: string | null;
  meter_type: string | null;
  device_type: string | null;
  inward_date: string | null;
  dispatch_date: string | null;
  device_status: string;
  location_name?: string | null;
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

/** Recent history API types */
interface StatusRow {
  group: 'DEVICE' | 'ASSIGN' | string;
  status: string;
  count: number;
}
interface RecentItem { text: string; }
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
  styleUrls: ['./rmtl-dashboard.component.css']
})
export class RmtlDashboardComponent implements OnInit {
  currentUser: any | null = null;

  // API data
  counts: DashboardCounts | null = null;
  testingAgg: TestingAggRow[] = [];

  stock: StockStatus | null = null;
  recent: RecentHistoryResponse | null = null;

  // UX state
  loading = { counts: true, testing: true, assignments: true, stock: true, recent: true };
  error: string | null = null;

  /** Secondary tiles (simple counts) */
  secondaryCards: { key: keyof DashboardCounts; label: string; icon: string }[] = [
    { key: 'labs',     label: 'Labs',     icon: 'fa-flask' },
    { key: 'users',    label: 'Users',    icon: 'fa-users' },
    { key: 'benches',  label: 'Benches',  icon: 'fa-microscope' },
    { key: 'stores',   label: 'Stores',   icon: 'fa-warehouse' },
    { key: 'vendors',  label: 'Vendors',  icon: 'fa-handshake' },
    { key: 'offices',  label: 'Offices',  icon: 'fa-building' },
  ];

  constructor(private router: Router, private api: ApiServicesService) {}

  ngOnInit(): void {
    const raw = localStorage.getItem('current_user');
    if (raw) { try { this.currentUser = JSON.parse(raw); } catch { this.currentUser = null; } }
    this.fetchAll();
  }

  private fetchAll(): void {
    // counts
    this.api.getCountsDashboard().subscribe({
      next: (res) => { this.counts = res as DashboardCounts; },
      error: (err) => this.fail(err),
      complete: () => this.loading.counts = false
    });

    // testing status (array of { total, test_status })
    this.api.getTestingStatusDashboard().subscribe({
      next: (res) => {
        const arr = Array.isArray(res) ? res : (res ? [res] : []);
        this.testingAgg = arr.map((r: any): TestingAggRow => ({
          total: Number(r?.total ?? 0),
          test_status: String(r?.test_status ?? r?.status ?? '')
        }));
      },
      error: () => { this.testingAgg = []; },
      complete: () => this.loading.testing = false
    });



    // stock status
    this.api.getStockStatusDashboard().subscribe({
      next: (res) => { this.stock = res as StockStatus; },
      error: () => { this.stock = { inward: 0, dispatched: 0, recent_inwards: [], recent_dispatcheds: [] }; },
      complete: () => this.loading.stock = false
    });

    // recent history
    this.api.getRecentHistoryDashboard().subscribe({
      next: (res) => { this.recent = res as RecentHistoryResponse; },
      error: () => {
        this.recent = {
          statuses: [],
          recent_devices: [], recent_users: [], recent_benches: [], recent_stores: [],
          recent_vendors: [], recent_offices: [], recent_stocks: [], recent_gatepasses: [],
          recent_inwards: [], recent_dispatcheds: [], recent_assignments: [], recent_testings: [],
          recent_approvals: [], recent_tested: []
        };
      },
      complete: () => this.loading.recent = false
    });
  }

  private fail(err: any) {
    this.error = err?.error?.detail || err?.message || 'Something went wrong';
  }

  get isLoading(): boolean {
    const s = this.loading;
    return s.counts || s.testing || s.assignments || s.stock || s.recent;
  }

  // helpers (safe for template)
  number(n?: number | null): string { return (n ?? 0).toLocaleString(); }
  getCount(key: keyof DashboardCounts): number { return this.counts ? (this.counts[key] ?? 0) : 0; }

  statusBadgeClass(s: TestingStatusName): string {
    switch (s) {
      case 'COMPLETED': return 'bg-success';
      case 'UNTESTABLE': return 'bg-secondary';
      default: return 'bg-info';
    }
  }
  statusLabel(s: TestingStatusName): string { return (s || '').replace(/_/g, ' ').toUpperCase(); }

  /** Testing metrics */
  get testingTotal(): number {
    return this.testingAgg.reduce((a, b) => a + (b?.total ?? 0), 0);
  }
  get testingCompleted(): number {
    return this.testingAgg
      .filter(r => r.test_status === 'COMPLETED')
      .reduce((a, b) => a + (b?.total ?? 0), 0);
  }
  get testingUntestable(): number {
    return this.testingAgg
      .filter(r => r.test_status === 'UNTESTABLE')
      .reduce((a, b) => a + (b?.total ?? 0), 0);
  }
  get testingPercentComplete(): number {
    const denom = this.counts?.testings ?? this.testingTotal;
    if (!denom) return 0;
    return Math.round((this.testingCompleted / denom) * 100);
  }



  /** Recent history helpers */
  get deviceStatuses(): StatusRow[] {
    return (this.recent?.statuses || []).filter(s => s.group === 'DEVICE');
  }
  get assignStatuses(): StatusRow[] {
    return (this.recent?.statuses || []).filter(s => s.group === 'ASSIGN');
  }
  statusPillClass(status: string): string {
    switch (status) {
      case 'INWARDED': return 'bg-primary';
      case 'DISPATCHED': return 'bg-info';
      case 'APPROVED': return 'bg-success';
      case 'TESTED': return 'bg-warning text-dark';
      default: return 'bg-secondary';
    }
  }
  firstN<T>(arr?: T[] | null, n: number = 10): T[] {
    if (!arr || !Array.isArray(arr)) return [];
    return arr.slice(0, n);
  }

  onLogout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    this.router.navigate(['/wzlogin']);
  }
}
