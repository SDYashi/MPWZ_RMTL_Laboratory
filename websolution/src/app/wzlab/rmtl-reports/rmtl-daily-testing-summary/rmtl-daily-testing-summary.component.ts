import { Component, OnInit } from '@angular/core';
import { DailySummaryResponse, Lab } from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-daily-testing-summary',
  templateUrl: './rmtl-daily-testing-summary.component.html',
  styleUrls: ['./rmtl-daily-testing-summary.component.css']
})
export class RmtlDailyTestingSummaryComponent implements OnInit {
  loading = false;
  error: string | null = null;

  data: DailySummaryResponse | null = null;

  labs: Lab[] = [];
  // filters
  report_date: string = ''; // keep optional (not used here)
  from_date: string = '';
  to_date: string = '';
  lab_id: number = 0; // ✅ 0 means All

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    // ✅ load labs first
    this.api.getLabs().subscribe({
      next: (response) => {
        this.labs = response || [];
      },
      error: (error) => console.error('Error fetching labs:', error)
    });

    // ✅ default load current month
    this.load();
  }

  // ✅ Header helpers for table title
  get selectedLabName(): string {
    if (!this.lab_id || this.lab_id === 0) return 'All';
    const found = (this.labs || []).find(x => Number(x.id) === Number(this.lab_id));
    return found?.lab_name || 'All';
  }

  get selectedDateLabel(): string {
    if (!this.from_date && !this.to_date) return 'Current Month';
    if (this.from_date && !this.to_date) return `${this.from_date}`;
    if (!this.from_date && this.to_date) return `${this.to_date}`;
    return `${this.from_date} to ${this.to_date}`;
  }

  load(): void {
    this.loading = true;
    this.error = null;

    // ✅ default current month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const format = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Apply defaults ONLY if user has not selected anything
    if (!this.report_date && !this.from_date && !this.to_date) {
      this.from_date = format(firstDayOfMonth);
      this.to_date = format(today);
    }

    // ✅ All lab -> send null/undefined
    const apiLabId = (this.lab_id === 0 ? undefined : this.lab_id);

    this.api.getDailySummary({
      report_date: this.report_date || undefined,
      from_date: this.from_date || undefined,
      to_date: this.to_date || undefined,
      lab_id: apiLabId,
    }).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || err?.message || 'Failed to load daily summary';
      }
    });
  }

  clear(): void {
    this.report_date = '';
    this.from_date = '';
    this.to_date = '';
    this.lab_id = 0; // ✅ All
    this.data = null;
    this.load();
  }

  displayMeterType(val: string | null | undefined): string {
    if (!val) return '';
    return val.includes('.') ? val.split('.').pop()! : val;
  }
get workingShiftCount(): number {
  if (!this.data?.total) return 0;

  const t = this.data.total;
  let count = 0;

  if ((t.shift_1.single + t.shift_1.three) > 0) count++;
  if ((t.shift_2.single + t.shift_2.three) > 0) count++;
  if ((t.shift_3.single + t.shift_3.three) > 0) count++;

  return count;
}

// optional custom header name text
get headerName(): string {
  return 'Daily Meter Testing Report';
}


}
