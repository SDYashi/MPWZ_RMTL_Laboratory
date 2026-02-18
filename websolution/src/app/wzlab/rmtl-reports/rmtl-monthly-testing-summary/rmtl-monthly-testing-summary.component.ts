
import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
type GroupLevel = 'circle' | 'division' | 'dc';

interface MonthlySummaryFilters {
  from_date: string | null;
  to_date: string | null;
  group_level: GroupLevel;
  device_testing_purpose: string;
}

interface MonthlySummaryRow {
  lab_id: number;
  lab_name: string;

  circle_code?: string;
  circle_name?: string;

  division_code?: string;
  division_name?: string;

  dc_code?: string;
  dc_name?: string;

  received: number;
  tested_total: number;
  working_found: number;
  fast_found: number;
  slow_found: number;
  not_working_found: number;
  balance_for_testing: number;
}

interface MonthlySummaryTotals {
  received: number;
  tested_total: number;
  working_found: number;
  fast_found: number;
  slow_found: number;
  not_working_found: number;
  balance_for_testing: number;
}

interface MonthlySummaryResponseNew {
  filters: MonthlySummaryFilters;
  rows: MonthlySummaryRow[];
  totals: MonthlySummaryTotals;
}

interface MonthlySummaryResponse {
  filters: MonthlySummaryFilters;
  rows: MonthlySummaryRow[];
  totals: MonthlySummaryTotals;
  generated_at: string;
}
type ReportType = any;

@Component({
  selector: 'app-rmtl-monthly-testing-summary',
  templateUrl: './rmtl-monthly-testing-summary.component.html',
  styleUrls: ['./rmtl-monthly-testing-summary.component.css'],
})
export class RmtlMonthlyTestingSummaryComponent implements OnInit {
  loading = false;
  error: string | null = null;
  reportTypes: ReportType[] = [];
  data: MonthlySummaryResponse | null = null;

  from_date = '';
  to_date = '';
  testing_purpose = '';
  group_level: GroupLevel = 'dc';
  device_testing_purpose = 'SMART_AGAINST_METER';

  // ✅ because Fast/Slow columns removed:
  // circle: 2 group + 5 metrics = 7
  // division: 4 group + 5 metrics = 9
  // dc: 6 group + 5 metrics = 11
  groupCols = 6; // default (dc)
  colspan = 11;  // default (dc)

  totalsNotWorking = 0;

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    this.recalcCols();
    this.load();
    

    this.api.getEnums().subscribe({
      next: (data) => {
        this.reportTypes = data?.test_report_types || [];
      },
      error: (err) => console.error('Failed to load report types:', err)
    });
  }

  onGroupLevelChange(): void {
    this.recalcCols();
  }
  onReportTypeChanged(): void {
   this.device_testing_purpose= this.testing_purpose;
  }

  private recalcCols(): void {
    if (this.group_level === 'circle') {
      this.groupCols = 2;
      this.colspan = 7; // 2 + 5
    } else if (this.group_level === 'division') {
      this.groupCols = 4;
      this.colspan = 9; // 4 + 5
    } else {
      this.groupCols = 6;
      this.colspan = 11; // 6 + 5
    }
  }

  // ✅ Not Working = fast + slow + not_working_found
  getNotWorking(r: MonthlySummaryRow): number {
    const fast = Number((r as any).fast_found || 0);
    const slow = Number((r as any).slow_found || 0);
    const notW = Number((r as any).not_working_found || 0);
    return fast + slow + notW;
  }

  private calcTotalsNotWorking(): void {
    if (!this.data?.totals) {
      this.totalsNotWorking = 0;
      return;
    }

    const t: any = this.data.totals;
    this.totalsNotWorking =
      Number(t.fast_found || 0) + Number(t.slow_found || 0) + Number(t.not_working_found || 0);
  }

  load(): void {
    this.loading = true;
    this.error = null;

    this.recalcCols();

    const payload = {
      from_date: this.from_date?.trim() ? this.from_date : undefined,
      to_date: this.to_date?.trim() ? this.to_date : undefined,
      group_level: this.group_level,
      testing_purpose: this.device_testing_purpose,
    };

    this.api.getMonthlySummary(payload).subscribe({
      next: (res: any) => {
        this.data = res;
        this.calcTotalsNotWorking();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err?.error?.detail ||
          err?.message ||
          'Failed to load monthly summary';
      },
    });
  }

  clear(): void {
    this.from_date = '';
    this.to_date = '';
    this.group_level = 'dc';
    this.device_testing_purpose = 'SMART_AGAINST_METER';
    this.load();
  }
}

