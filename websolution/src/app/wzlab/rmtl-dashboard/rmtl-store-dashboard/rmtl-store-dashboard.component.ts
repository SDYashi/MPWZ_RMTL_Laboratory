import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiServicesService } from 'src/app/services/api-services.service';

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
  selector: 'app-rmtl-store-dashboard',
  templateUrl: './rmtl-store-dashboard.component.html',
  styleUrls: ['./rmtl-store-dashboard.component.css'],
})
export class RmtlStoreDashboardComponent implements OnInit, OnDestroy {
  filters = {
    start_date: '',
    end_date: '',
    lab_id: '' as string,
  };

  labs: any[] = [];
  storeData: DashboardStoreUserResponse | null = null;

  isLoading = false;
  error: string | null = null;

  private subs: Subscription[] = [];

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    this.subs.push(
      this.api.getLabs().subscribe({
        next: (res) => (this.labs = res || []),
        error: () => (this.labs = []),
      })
    );

    this.reload();
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  onDateChange(): void {
    this.reload();
  }

  onLabChange(): void {
    this.reload();
  }

  reload(): void {
    this.error = null;
    this.isLoading = true;
    this.storeData = null;

    const { from_date, to_date } = this.getDateRange();

    // NOTE: backend currently ignores lab_id for store-user (unless you add it)
    this.subs.push(
      this.api.getDashboardStoreUser({ from_date, to_date }).subscribe({
        next: (res: DashboardStoreUserResponse) => {
          this.storeData = res;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = err?.error?.detail || err?.message || 'Something went wrong';
          this.isLoading = false;
        },
      })
    );
  }

  private getDateRange(): { from_date: string; to_date: string } {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const from_date = this.filters.start_date || first.toISOString().split('T')[0];
    const to_date = this.filters.end_date || last.toISOString().split('T')[0];
    return { from_date, to_date };
  }

  number(n?: number | null): string {
    return (n ?? 0).toLocaleString();
  }
}
