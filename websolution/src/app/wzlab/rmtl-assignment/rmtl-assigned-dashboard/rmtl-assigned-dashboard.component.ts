import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

type AssignmentStatus = 'ASSIGNED' | 'TESTED' | 'APPROVED' | string;

interface AssignmentHistory {
  id: number;
  user_id: number;
  device_id: number;
  assigned_by: number;
  assigned_datetime: string; // ISO
  assignment_status: AssignmentStatus;
}

interface AssignmentsSummary {
  total_assignments: number;
  userwise_count: { user_id: number; count: number }[];
  recent_assignment_history: AssignmentHistory[];
}

@Component({
  selector: 'app-rmtl-assigned-dashboard',
  templateUrl: './rmtl-assigned-dashboard.component.html',
  styleUrls: ['./rmtl-assigned-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class RmtlAssignedDashboardComponent implements OnInit {
  // Loading flags
  loading = { assignments: true };

  // Data
  assignments: AssignmentsSummary | null = null;

  // UI
  showAllUsers = false;

  // Color tokens we’ll rotate for user cards
  palette = ['primary','success','info','warning','danger','secondary'];

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    this.fetchAssignments();
  }

  private fetchAssignments(): void {
    this.loading.assignments = true;
    this.api.getAssignmentStatusDashboard().subscribe({
      next: (res) => {
        const data = (res || {}) as Partial<AssignmentsSummary>;
        this.assignments = {
          total_assignments: data.total_assignments ?? 0,
          userwise_count: Array.isArray(data.userwise_count) ? data.userwise_count : [],
          recent_assignment_history: Array.isArray(data.recent_assignment_history) ? data.recent_assignment_history : [],
        };
      },
      error: () => {
        this.assignments = { total_assignments: 0, userwise_count: [], recent_assignment_history: [] };
      },
      complete: () => (this.loading.assignments = false),
    });
  }

  // Template flag
  get isLoading(): boolean {
    return this.loading.assignments;
  }

  // --- Computed metrics ---

  /** Strongly-typed slice to avoid strict-template 'unknown' errors */
  get recent10(): AssignmentHistory[] {
    return (this.assignments?.recent_assignment_history ?? []).slice(0, 10);
  }

  /** Counts by status using the full recent history array */
  private _statusCounts(): Record<string, number> {
    const map: Record<string, number> = {};
    for (const h of this.assignments?.recent_assignment_history ?? []) {
      const key = (h.assignment_status || 'UNKNOWN').toUpperCase();
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }

  /** Preferred status ordering */
  private statusOrder = ['ASSIGNED', 'TESTED', 'APPROVED'];

  /** Sorted status entries for the UI cards */
  get statusEntries(): { key: string; value: number }[] {
    const entries = Object.entries(this._statusCounts()).map(([key, value]) => ({ key, value }));
    const pri = (k: string) => {
      const i = this.statusOrder.indexOf(k);
      return i === -1 ? 9 : i; // unknown at end
    };
    return entries.sort((a, b) => pri(a.key) - pri(b.key) || b.value - a.value || a.key.localeCompare(b.key));
  }

  /** User cards list (top 8 unless toggled) */
  get userCards(): { user_id: number; count: number }[] {
    const arr = [...(this.assignments?.userwise_count ?? [])].sort((a, b) => b.count - a.count);
    return this.showAllUsers ? arr : arr.slice(0, 8);
  }

  // --- Utilities for template ---

  number(n?: number | null): string { return (n ?? 0).toLocaleString(); }

  statusBadgeClass(s: AssignmentStatus): string {
    switch ((s || '').toUpperCase()) {
      case 'ASSIGNED': return 'bg-primary';
      case 'APPROVED': return 'bg-success';
      case 'TESTED':   return 'bg-info';
      case 'PENDING':  return 'bg-warning text-dark';
      default:         return 'bg-secondary';
    }
  }

  /** map status -> gradient token for KPI cards */
  statusColor(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'ASSIGNED': return 'primary';
      case 'TESTED':   return 'info';
      case 'APPROVED': return 'success';
      case 'PENDING':  return 'warning';
      default:         return 'secondary';
    }
  }

  /** Pick a color for a user card (stable per user id) */
  userColor(userId: number, idx: number): string {
    const i = (userId ?? idx) % this.palette.length;
    return this.palette[i];
  }

  trackByUser = (_: number, u: { user_id: number }) => u.user_id;
  trackByHist = (_: number, r: AssignmentHistory) => r.id;
}
