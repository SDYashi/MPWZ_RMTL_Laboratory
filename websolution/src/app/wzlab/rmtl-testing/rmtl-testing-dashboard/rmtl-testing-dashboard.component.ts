import { Component, OnInit, ChangeDetectionStrategy, TrackByFunction } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

type TokenColor = 'primary'|'success'|'info'|'warning'|'danger'|'secondary';

interface TestingRecord {
  id: number;
  assignment_id: number;
  device_id: number;
  test_status: string | null;
  report_type: string | null;
  test_method: string | null;
  test_result: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  approver_id: number | null;
}

interface ReportTypeCount { report_type: string | null; total: number; }
interface MethodCount     { test_method: string | null; total: number; }

interface TestingDashboardBlock {
  total: number;
  report_type: ReportTypeCount[];
  test_method: MethodCount[];
  recent_testing_data: TestingRecord[];
}

@Component({
  selector: 'app-rmtl-testing-dashboard',
  templateUrl: './rmtl-testing-dashboard.component.html',
  styleUrls: ['./rmtl-testing-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class RmtlTestingDashboardComponent implements OnInit {
  loading = true;
  dash: TestingDashboardBlock | null = null;

  palette: TokenColor[] = ['primary','success','info','warning','danger','secondary'];

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void { this.fetch(); }

  private fetch(): void {
    this.loading = true;
    this.api.gettestingstatusdashboard().subscribe({
      next: (res) => {
        const first = (Array.isArray(res) ? res[0] : res) as TestingDashboardBlock | null;
        this.dash = first ? this.normalize(first) : null;
      },
      error: () => { this.dash = null; },
      complete: () => { this.loading = false; },
    });
  }

  private normalize(b: TestingDashboardBlock): TestingDashboardBlock {
    const fix = (x: string | null | undefined) => {
      const s = (x ?? '').trim();
      return s === '' || s === '-' ? '—' : s;
    };

    return {
      total: b.total ?? 0,
      report_type: (b.report_type ?? [])
        .map(r => ({ total: r.total ?? 0, report_type: fix(r.report_type) }))
        .sort((a, c) => c.total - a.total),
      test_method: (b.test_method ?? [])
        .map(m => ({ total: m.total ?? 0, test_method: fix(m.test_method) }))
        .sort((a, c) => c.total - a.total),
      recent_testing_data: (b.recent_testing_data ?? []),
    };
  }

  // ---------- View helpers ----------
  get recent12(): TestingRecord[] {
    return (this.dash?.recent_testing_data ?? []).slice(0, 12);
  }

  number(n?: number | null): string { return (n ?? 0).toLocaleString(); }

  gradClass(token: TokenColor): string { return `bg-grad-${token}`; }

  methodColor(method: string | null): TokenColor {
    const s = (method || '').toUpperCase();
    if (s === 'AUTOMATIC') return 'info';
    if (s === 'MANUAL')    return 'primary';
    return 'secondary';
  }

  statusBadgeClass(s: string | null): string {
    switch ((s || '').toUpperCase()) {
      case 'COMPLETED':   return 'bg-success';
      case 'IN PROGRESS':
      case 'RUNNING':
      case 'STARTED':     return 'bg-primary';
      case 'PENDING':     return 'bg-warning text-dark';
      case 'FAILED':
      case 'REJECTED':    return 'bg-danger';
      default:            return 'bg-secondary';
    }
  }

  reportTypeToken(i: number): TokenColor { return this.palette[i % this.palette.length]; }

  trackByRec: TrackByFunction<TestingRecord> = (_: number, r: TestingRecord) => r.id;
}
