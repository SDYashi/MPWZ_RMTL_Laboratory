import { Component, OnInit } from '@angular/core';
import { MonthlySummaryResponse } from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-monthly-testing-summary',
  templateUrl: './rmtl-monthly-testing-summary.component.html',
  styleUrls: ['./rmtl-monthly-testing-summary.component.css']
})
export class RmtlMonthlyTestingSummaryComponent implements OnInit {
  loading = false;
  error: string | null = null;

  data: MonthlySummaryResponse | null = null;

  from_date: string = '';
  to_date: string = '';
  circle_id: number | null = null;
  division_id: number | null = null;
  dc_id: number | null = null;

  group_level: 'circle' | 'division' | 'dc' = 'dc';
  dataDc: any = null;

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;

    this.api.getMonthlySummary({
      from_date: this.from_date || undefined,
      to_date: this.to_date || undefined,
      circle_code: this.circle_id,
      division_code: this.division_id,
      dc_code: this.dc_id,
      group_level: this.group_level,
    }).subscribe({
      next: (res) => {
        this.data = res;
        this.dataDc = res;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || err?.message || 'Failed to load monthly summary';
      }
    });
  }

  clear(): void {
    this.from_date = '';
    this.to_date = '';
    this.circle_id = null;
    this.division_id = null;
    this.dc_id = null;
    this.group_level = 'dc';
    this.load();
  }
}

