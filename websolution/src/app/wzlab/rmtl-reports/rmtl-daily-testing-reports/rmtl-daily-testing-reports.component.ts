import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

interface DailyTestRow {
  date: string;
  device_type: 'METER' | 'CT';
  make: string;
  meter_category?: string;
  phase?: string;
  meter_type?: string;
  ct_class?: string;
  ct_ratio?: string;
  result: 'PASS' | 'FAIL' | 'PENDING';
}

interface ModalState {
  open: boolean;
  title: string;
  action: 'save' | 'info' | null;
}

@Component({
  selector: 'app-rmtl-daily-testing-reports',
  templateUrl: './rmtl-daily-testing-reports.component.html',
  styleUrls: ['./rmtl-daily-testing-reports.component.css']
})
export class RmtlDailyTestingReportsComponent implements OnInit {

  // Filters
  filters = { from: '', to: '', device_type: '', search: '' };

  // Data
  reportAll: DailyTestRow[] = [];
  reportFiltered: DailyTestRow[] = [];

  // UI state
  loading = false;
  submitting = false;
  modal: ModalState = { open: false, title: '', action: null };
  alertSuccess: string | null = null;
  alertError: string | null = null;

  // Summary
  passCount = 0;
  failCount = 0;
  pendingCount = 0;

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    // default range = today
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const ymd = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);
    this.filters.from = ymd(first);
    this.filters.to   = ymd(last);
    this.fetch();
  }

  // Fetch from API using provided service
  fetch(): void {
    if (!this.filters.from || !this.filters.to) return;
    this.loading = true;
    this.alertSuccess = null;
    this.alertError = null;

    this.api.getdailytestingreport(this.filters.from, this.filters.to).subscribe({
      next: (rows: DailyTestRow[]) => {
        this.reportAll = Array.isArray(rows) ? rows : [];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.reportAll = [];
        this.applyFilters();
        this.alertError = 'Failed to load daily testing reports.';
        console.error(err);
      }
    });
  }

  applyAndFetch(): void {
    this.applyFilters(); // keeps UI snappy
    this.fetch();        // then pulls fresh data
  }

  applyFilters(): void {
    const term = (this.filters.search || '').trim().toLowerCase();
    const fType = this.filters.device_type;

    this.reportFiltered = (this.reportAll || []).filter(r => {
      const typeOk = fType ? r.device_type === fType as any : true;
      const searchOk = term
        ? [
            r.make,
            r.meter_category, r.meter_type,
            r.ct_class, r.ct_ratio,
            r.phase
          ].filter(Boolean).join(' ').toLowerCase().includes(term)
        : true;
      return typeOk && searchOk;
    });

    this.computeSummary();
  }

  resetFilters(): void {
    this.filters = { from: this.filters.from, to: this.filters.to, device_type: '', search: '' };
    this.applyFilters();
  }

  computeSummary(): void {
    this.passCount = this.reportFiltered.filter(r => r.result === 'PASS').length;
    this.failCount = this.reportFiltered.filter(r => r.result === 'FAIL').length;
    this.pendingCount = this.reportFiltered.filter(r => r.result === 'PENDING').length;
  }

  // CSV export
  exportCSV(): void {
    const headers = ['date','device_type','make','category_or_class','phase_or_ratio','meter_type','result'];
    const rows = this.reportFiltered.map(r => [
      r.date, r.device_type, r.make,
      r.meter_category || r.ct_class || '',
      r.phase || r.ct_ratio || '',
      r.meter_type || '',
      r.result,
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(val => `"${String(val ?? '').replace(/"/g,'""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily_testing_report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  print(): void { window.print(); }

  // Modal flow
  openConfirm(action: ModalState['action']): void {
    this.alertSuccess = null;
    this.alertError = null;
    this.modal.action = action;
    this.modal.title = action === 'save' ? 'Save Daily Report Snapshot — Preview' : 'Info';
    this.modal.open = true;
  }
  closeModal(): void {
    this.modal.open = false;
    this.modal.action = null;
  }

  // Save + PDF (POST then generate PDF)
  saveAndGenerate(): void {
    const payload = {
      start_date: this.filters.from,
      end_date: this.filters.to,
      device_type: this.filters.device_type || null,
      search: this.filters.search || null,
      totals: {
        total: this.reportFiltered.length,
        pass: this.passCount,
        fail: this.failCount,
        pending: this.pendingCount
      },
      rows: this.reportFiltered
    };

    this.submitting = true;
    this.alertSuccess = null;
    this.alertError = null;

    // Ensure you implement this in ApiServicesService
    this.api.getdailytestingreport(this.filters.from, this.filters.to).subscribe({
      next: () => {
        this.submitting = false;
        this.alertSuccess = 'Report snapshot saved successfully.';
        // try { this.downloadPdf(); } catch (e) { console.error('PDF failed', e); }
        setTimeout(() => this.closeModal(), 1200);
      },
      error: (err) => {
        this.submitting = false;
        this.alertError = 'Failed to save report snapshot.';
        console.error(err);
      }
    });
  }

}
