import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';

interface DashboardTestingUserResponse {
  generated_at?: string;
  counts?: {
    total_assigned: number;
    total_tested: number;
    pending_for_tested: number;
  };
  pending_devices?: any[];
}

@Component({
  selector: 'app-rmtl-testing-dashboard',
  templateUrl: './rmtl-testing-dashboard.component.html',
  styleUrls: ['./rmtl-testing-dashboard.component.css'],
})
export class RmtlTestingDashboardComponent implements OnInit, OnDestroy {
  filters = {
    start_date: '',
    end_date: '',
    lab_id: '',
    user_id: '',
    search: '',
  };

  labs: any[] = [];
  testingData: DashboardTestingUserResponse | null = null;

  isLoading = false;
  error: string | null = null;

  private subs: Subscription[] = [];

  constructor(private api: ApiServicesService,  private authService: AuthService  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.api.getLabs().subscribe({
        next: (res) => (this.labs = res || []),
        error: () => (this.labs = []),
      })
    );

    this.filters.lab_id = String(this.authService?.getlabidfromtoken() ?? '');
    this.filters.user_id = String(this.authService?.getuseridfromtoken() ?? '');


    this.reload();
  }
  onSearchChanged() {
   this.subs.push(
      this.api.getDashboardTestingUser({ user_id: this.filters.user_id,serial_number: this.filters.search }).subscribe({
        next: (res: DashboardTestingUserResponse) => {
          this.testingData = res;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = err?.error?.detail || err?.message || 'Something went wrong while Searching Data';
          this.isLoading = false;
        },
      }));
  }
  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  onDateChange(): void {
    this.reload();
  }



  reload(): void {
    this.error = null;
    this.isLoading = true;
    this.testingData = null;

    const { from_date, to_date } = this.getDateRange();

    // NOTE: backend currently ignores lab_id for testing-user (unless you add it)
    this.subs.push(
      this.api.getDashboardTestingUser({ from_date, to_date, user_id: this.filters.user_id }).subscribe({
        next: (res: DashboardTestingUserResponse) => {
          this.testingData = res;
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
