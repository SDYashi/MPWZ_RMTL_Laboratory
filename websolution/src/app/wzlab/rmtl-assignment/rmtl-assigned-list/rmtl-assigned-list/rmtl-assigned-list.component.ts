import { Component } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
// For Excel export: npm i xlsx file-saver
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-rmtl-assigned-list',
  templateUrl: './rmtl-assigned-list.component.html',
  styleUrls: ['./rmtl-assigned-list.component.css']
})
export class RmtlAssignedListComponent {
  // Filters
  Math = Math;
  searchTerm = '';
  selectedStatus = 'ASSIGNED';
  fromDate: string = new Date().toISOString().slice(0, 7);
  toDate: string = new Date().toISOString().slice(0, 10);

  // Data
  assignmentHistory: any[] = [];
  filteredHistory: any[] = [];
  labids:any;

  // Pagination (client-side)
  page = 1;
  pageSize = 100;
  total = 0;
  totalPages = 1;
  pages: number[] = [];
  pagedHistory: any[] = [];

  assignmentStatuses: string[] = [];

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    // Load statuses first
    this.api.getEnums().subscribe({
      next: (response) => {
        this.assignmentStatuses = response.assignment_statuses || [];
      },
      error: (error) => {
        console.error('Error fetching assignment statuses:', error);
      }
    });

    // Default dates: current month
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    this.fromDate = start.toISOString().slice(0, 10);
    this.toDate = now.toISOString().slice(0, 10);
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.labids = [payload?.lab_id || ''];
      } catch (err) {
        console.error('Invalid token format', err);
      }
    }

    this.loadHistory();
  }

  // Fetch data (date + status). Adjust to your API signature.
  loadHistory(): void {
    // Reset client-side state
    this.assignmentHistory = [];
    this.filteredHistory = [];
    this.pagedHistory = [];
    this.page = 1;

    // If your service already supports query params, expose them:
    // Example expected signature in ApiServicesService:
    // getAssignmentsByStatus(status?: string, fromDate?: string, toDate?: string)
    this.api.getAssignmentsByStatusDatewise(this.selectedStatus || '', this.fromDate || '', this.toDate || '',this.labids||'')
      .subscribe({
        next: (response) => {
          // If server returns array:
          this.assignmentHistory = response || [];

          // If server returns paginated object, switch to server-side pagination:
          // const { results, total } = response;
          // this.assignmentHistory = results || [];
          // this.total = total || 0;
          // this.totalPages = Math.max(1, Math.ceil(this.total / this.pageSize));
          // this.pages = this.buildPages(this.page, this.totalPages);
          // this.pagedHistory = this.assignmentHistory; // when server-side, page contains only current slice
          // return;

          // Client-side filtering & pagination
          this.filterHistory();
        },
        error: (error) => {
          console.error('Error fetching assignment history:', error);
          this.applyPaging(); // keep UI consistent
        }
      });
  }

  filterHistory(): void {
    const term = (this.searchTerm || '').toLowerCase();
    const data = this.assignmentHistory.filter(record => {
      const sn = record?.device?.serial_number?.toLowerCase() || '';
      const ua = record?.user_assigned?.name?.toLowerCase() || '';
      const ab = record?.assigned_by_user?.name?.toLowerCase() || '';
      return sn.includes(term) || ua.includes(term) || ab.includes(term);
    });

    this.filteredHistory = data;
    this.total = this.filteredHistory.length;
    this.totalPages = Math.max(1, Math.ceil(this.total / this.pageSize));
    this.pages = this.buildPages(this.page, this.totalPages);
    this.applyPaging();
  }

  applyPaging(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedHistory = this.filteredHistory.slice(start, end);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.pages = this.buildPages(this.page, this.totalPages);
    this.applyPaging();
  }

  buildPages(current: number, totalPages: number): number[] {
    // Compact pagination: show up to 7 numbers around current
    const window = 7;
    let start = Math.max(1, current - Math.floor(window / 2));
    let end = Math.min(totalPages, start + window - 1);
    if (end - start + 1 < window) start = Math.max(1, end - window + 1);

    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  // Excel export
  exportToExcel(): void {
    // Export filtered rows (or paged; choose what you want)
    const rows = this.filteredHistory.map((r: any) => ({
      'Inward No': r?.device?.inward_number || '',
      'Serial No': r?.device?.serial_number || '',
      'Device Type': r?.device?.device_type || '',
      'Status': r?.assignment_status || '',
      'Assigned To': r?.user_assigned?.name || '',
      'Assigned By': r?.assigned_by_user?.name || '',
      'Assigned Date': r?.assigned_datetime ? new Date(r.assigned_datetime).toLocaleString() : '',
      'Bench': r?.testing_bench?.bench_name || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AssignmentHistory');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const filename = `assignment_history_${this.fromDate || 'all'}_${this.toDate || 'all'}.xlsx`;
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, filename);
  }

  onPageSizeChange(): void {
    this.page = 1;
    this.pages = this.buildPages(this.page, this.totalPages);
    this.applyPaging();
  }
}
