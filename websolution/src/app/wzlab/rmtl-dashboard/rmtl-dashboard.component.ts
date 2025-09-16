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

  // base
  device_type: string | null;
  serial_number: string | null;
  make: string | null;
  location_name: string | null;

  // dates
  inward_date: string | null;
  dispatch_date: string | null;

  // meter-ish
  meter_type: string | null;
  meter_category?: string | null;
  meter_class?: string | null;
  capacity?: string | null;       // e.g., SINGLE_PHASE_5_30A
  phase?: string | null;          // e.g., SINGLE PHASE
  voltage_rating?: string | null; // e.g., 230V

  // ct-ish
  ct_ratio?: string | null;       // e.g., 100/5
  ct_class?: string | null;       // e.g., 0.2

  // misc
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

/** Recent history API types */
interface StatusRow {
  group: 'DEVICE' | 'ASSIGN' | string;
  status: string; // e.g., DeviceStatus.INWARDED, AssignmentStatus.TESTED
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
  testingAgg: TestingAggRow[] = []; // supports legacy + new shapes (we populate it ourselves if needed)
  stock: StockStatus | null = null;
  recent: RecentHistoryResponse | null = null;

  // derived map: group -> normalizedStatus -> count
  private statusCountsByGroup: Record<string, Record<string, number>> = {};

  // UX state
  loading = { counts: true, testing: true, stock: true, recent: true };
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

  /** Optional: config for rendering a card+table per recent_* array */
  tablesConfig: Array<{ key: keyof RecentHistoryResponse; title: string; icon: string }> = [
    { key: 'recent_devices',      title: 'Recent Devices',      icon: 'fa-microchip text-primary' },
    { key: 'recent_users',        title: 'Recent Users',        icon: 'fa-user text-secondary' },
    { key: 'recent_benches',      title: 'Recent Benches',      icon: 'fa-vials text-info' },
    { key: 'recent_stores',       title: 'Recent Stores',       icon: 'fa-store text-success' },
    { key: 'recent_vendors',      title: 'Recent Vendors',      icon: 'fa-handshake text-warning' },
    { key: 'recent_offices',      title: 'Recent Offices',      icon: 'fa-building text-danger' },
    { key: 'recent_inwards',      title: 'Recent Inwards',      icon: 'fa-arrow-down text-success' },
    { key: 'recent_dispatcheds',  title: 'Recent Dispatched',   icon: 'fa-arrow-up text-primary' },
    { key: 'recent_assignments',  title: 'Recent Assignments',  icon: 'fa-tasks text-secondary' },
    { key: 'recent_testings',     title: 'Recent Testings',     icon: 'fa-vial text-info' },
    { key: 'recent_approvals',    title: 'Recent Approvals',    icon: 'fa-thumbs-up text-success' },
    { key: 'recent_tested',       title: 'Recently Marked Tested', icon: 'fa-check text-dark' },
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

    // ---- Testing status (handles new response shape with legacy fallback) ----
    this.api.getTestingStatusDashboard().subscribe({
      next: (res) => {
        // NEW shape example (array with 1 block containing recent_testing_data)
        const maybeBlock = Array.isArray(res) ? (res[0] ?? null) : (res as any);

        if (maybeBlock && Array.isArray(maybeBlock.recent_testing_data)) {
          const recent = maybeBlock.recent_testing_data as Array<{ test_status?: string }>;
          const map: Record<string, number> = {};
          for (const r of recent) {
            const k = this.normalizeStatus(r?.test_status || 'UNKNOWN');
            map[k] = (map[k] || 0) + 1;
          }
          this.testingAgg = Object.entries(map).map(([k, v]) => ({ test_status: k, total: v }));
        } else {
          // LEGACY fallback: [{ total, test_status }] or single object
          const arr = Array.isArray(res) ? res : (res ? [res] : []);
          this.testingAgg = arr
            .filter((r: any) => r?.test_status || r?.status)
            .map((r: any): TestingAggRow => ({
              total: Number(r?.total ?? 0),
              test_status: this.normalizeStatus(String(r?.test_status ?? r?.status ?? ''))
            }));
        }
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
      next: (res) => {
        this.recent = res as RecentHistoryResponse;
        this.statusCountsByGroup = this.buildStatusMap(this.recent?.statuses || []);
      },
      error: () => {
        this.recent = {
          statuses: [],
          recent_devices: [], recent_users: [], recent_benches: [], recent_stores: [],
          recent_vendors: [], recent_offices: [], recent_stocks: [], recent_gatepasses: [],
          recent_inwards: [], recent_dispatcheds: [], recent_assignments: [], recent_testings: [],
          recent_approvals: [], recent_tested: []
        };
        this.statusCountsByGroup = {};
      },
      complete: () => this.loading.recent = false
    });
  }

  private fail(err: any) {
    this.error = err?.error?.detail || err?.message || 'Something went wrong';
  }

  get isLoading(): boolean {
    const s = this.loading;
    return s.counts || s.testing || s.stock || s.recent;
  }

  // ===== Tables-only helpers (parse "key=value" text rows to columns) =====

  /** Order to prefer when building columns */
  private preferredOrder = [
    'id','device_id','user_id',
    'serial','serial_number',
    'status','assignment_status','test_status','device_status',
    'make','type','device_type','phase','category','meter_category',
    'updated','updated_at','inward_date','dispatch_date','dispatch_number'
  ];

  /** Quick getter for any recent-* list */
  getList<K extends keyof RecentHistoryResponse>(key: K): any[] {
    return (this.recent?.[key] as any[]) ?? [];
  }

  /** Status summary table for the top card */
  get statusTable(): Array<{ group: string; status: string; count: number }> {
    const rows = this.recent?.statuses ?? [];
    return rows.map(r => ({
      group: (r.group || '').toUpperCase(),
      status: this.normalizeStatus(r.status),
      count: r.count ?? 0
    })).sort((a, b) => (a.group + a.status).localeCompare(b.group + b.status));
  }

  trackByIdx = (i: number) => i;

  /** Normalize enum-ish strings like 'DeviceStatus.INWARDED' -> 'INWARDED' */
  normalizeStatus(s?: string | null): string {
    if (!s) return '';
    const last = String(s).split('.').pop() || s;
    return last.replace(/[^A-Za-z0-9_ ]/g, '').toUpperCase();
  }

  /** Columns from parsed rows (union of keys, preferred order first) */
  deriveCols(data: any[] | null | undefined): string[] {
    const colsSet = new Set<string>();
    const rows = Array.isArray(data) ? data : [];
    const sample = rows.slice(0, 50);

    for (const r of sample) {
      const obj = this.asRow(r);
      Object.keys(obj).forEach(k => colsSet.add(k));
    }

    const all = Array.from(colsSet);
    const preferred = this.preferredOrder.filter(k => all.includes(k));
    const rest = all.filter(k => !this.preferredOrder.includes(k)).sort((a, b) => a.localeCompare(b));
    return [...preferred, ...rest];
  }

  /** Pretty column labels */
  prettify(key: string): string {
    const k = (key || '').replace(/\./g, ' ').replace(/_/g, ' ').trim();
    return k.charAt(0).toUpperCase() + k.slice(1);
  }

  /** Render a cell from a raw row + column */
  cell(row: any, col: string): any {
    const obj = this.asRow(row);
    const val = obj[col];
    if (val === null || val === undefined || val === '') return '—';

    if (typeof val === 'string') {
      // Pretty-print ISO/space datetime: "2025-09-13 23:07:10"
      if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(val)) return val.replace('T', ' ');
    }
    return val;
  }

  /** Convert any incoming row into a flat object  */
  private asRow(row: any): Record<string, any> {
    if (!row) return {};
    // Most of your recent_* arrays are { text: "k=v, ..." }
    if (this.isKVTextRow(row)) return this.parseKVText(row.text);

    // Fallback: already an object
    if (typeof row === 'object' && !Array.isArray(row)) {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(row)) {
        if (typeof v === 'string' && v.includes('.')) out[k] = this.normalizeStatus(v);
        else out[k] = v;
      }
      return out;
    }
    return { value: String(row) };
  }

  /** Detect "{text: 'id=..., ...'}" rows */
  private isKVTextRow(row: any): boolean {
    return row && typeof row === 'object' && typeof row.text === 'string' && row.text.includes('=');
  }

  /** Standardize keys so headers are consistent */
  private standardizeKey(k: string): string {
    const key = k.trim().toLowerCase();
    switch (key) {
      case 'serialno':
      case 'serial_number':
      case 'serialno.':
      case 'srno':
      case 'sr':              return 'serial';
      case 'device_id':       return 'device_id';
      case 'user_id':         return 'user_id';
      case 'assignment_status': return 'assignment_status';
      case 'test_status':     return 'test_status';
      case 'device_status':   return 'device_status';
      case 'meter_category':  return 'meter_category';
      case 'meter_class':     return 'meter_class';
      case 'updated_at':      return 'updated_at';
      default:                return key;
    }
  }

  /** Parse "k=v, k=v, ..." into an object, normalize enum values */
  private parseKVText(s: string): Record<string, string> {
    const out: Record<string, string> = {};
    if (!s) return out;

    const parts = s.split(',').map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      const eq = part.indexOf('=');
      if (eq === -1) {
        out['other'] = (out['other'] ? out['other'] + ' ' : '') + part;
        continue;
      }
      const rawKey = part.slice(0, eq).trim();
      let rawVal = part.slice(eq + 1).trim();

      // normalize enum-like values (Make.AEW -> AEW, DeviceStatus.INWARDED -> INWARDED)
      if (rawVal.includes('.')) rawVal = this.normalizeStatus(rawVal);

      const key = this.standardizeKey(rawKey);
      out[key] = rawVal;
    }
    return out;
  }

  // ===== Numbers & KPIs =====

  number(n?: number | null): string { return (n ?? 0).toLocaleString(); }
  getCount(key: keyof DashboardCounts): number { return this.counts ? (this.counts[key] ?? 0) : 0; }

  get testingTotal(): number {
    return this.testingAgg.reduce((a, b) => a + (b?.total ?? 0), 0);
    }
  get testingCompleted(): number {
    const fromAgg = this.testingAgg
      .filter(r => this.normalizeStatus(r.test_status) === 'COMPLETED')
      .reduce((a, b) => a + (b?.total ?? 0), 0);
    if (fromAgg) return fromAgg;
    return this.countStatus('ASSIGN', 'TESTED');
  }
  get testingUntestable(): number {
    const fromAgg = this.testingAgg
      .filter(r => this.normalizeStatus(r.test_status) === 'UNTESTABLE')
      .reduce((a, b) => a + (b?.total ?? 0), 0);
    if (fromAgg) return fromAgg;
    return 0;
  }
  get testingPercentComplete(): number {
    const denom = this.counts?.testings ?? this.testingTotal;
    if (!denom) return 0;
    return Math.round((this.testingCompleted / denom) * 100);
  }

  // ===== Recent status helpers =====

  firstN<T>(arr?: T[] | null, n: number = 10): T[] {
    if (!arr || !Array.isArray(arr)) return [];
    return arr.slice(0, n);
  }

  private buildStatusMap(rows: StatusRow[]): Record<string, Record<string, number>> {
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
    const g = (this.statusCountsByGroup[group] || {});
    const k = this.normalizeStatus(status);
    return g[k] || 0;
  }

  // ===== Stock helpers (kept in case you show stock tables elsewhere) =====

  deviceKind(d: DeviceLite | null | undefined): 'CT' | 'METER' | 'OTHER' {
    const k = (d?.device_type || '').toUpperCase();
    if (k.includes('CT')) return 'CT';
    if (k.includes('METER')) return 'METER';
    return 'OTHER';
  }
  kindColor(kind: 'CT'|'METER'|'OTHER'): 'info'|'primary'|'secondary' {
    if (kind === 'CT') return 'info';
    if (kind === 'METER') return 'primary';
    return 'secondary';
  }
  specString(d: DeviceLite | null | undefined): string {
    if (!d) return '';
    const kind = this.deviceKind(d);
    if (kind === 'CT') {
      const parts = [d.ct_ratio, d.ct_class].filter((p): p is string => !!p);
      return parts.join(' · ');
    }
    const parts = [
      d.capacity,
      d.phase,
      d.meter_category ?? null,
      d.meter_class ?? null,
      d.voltage_rating ?? null
    ].filter((p): p is string => !!p);
    return parts.join(' · ');
  }

  onLogout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    this.router.navigate(['/wzlogin']);
  }
}
