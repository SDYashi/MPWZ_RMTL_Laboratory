import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';
import { ApiServicesService } from 'src/app/services/api-services.service';

type ISODateString = string;

interface Gatepass {
  id: number;
  receiver_name: string;
  receiver_mobile: string;
  created_at: ISODateString;
  updated_at: ISODateString;
  serial_numbers: string;    // e.g. "UNKNOWN: 120, 119 | HPL: 101, 20"
  report_ids: string;        // e.g. "20250820-6901"
  receiver_designation: string;
  dispatch_number: string;   // e.g. "220825-970182"
  dispatch_to: string;
  vehicle: string;
  created_by: number;
  updated_by: number | null;
}

interface Row {
  sl: number;
  dispatch_number: string;
  report_ids: string;
  serial_no: string;
  make: string;
  receiver: string;
  vehicle: string;
  created_date: string; // yyyy-MM-dd
}

@Component({
  selector: 'app-rmtl-gatepass-list',
  templateUrl: './rmtl-gatepass-list.component.html',
  styleUrls: ['./rmtl-gatepass-list.component.css']
})
export class RmtlGatepassListComponent implements OnInit {

  // Filters
  startDate: string = '';
  endDate: string = '';
  dispatchNos: string[] = [];
  selectedDispatchNo: string = '';

  // Data
  private allGatepasses: Gatepass[] = [];
  rows: Row[] = [];              // flattened + filtered

  // Loading state (optional for UI spinners)
  loading = false;

  // Pagination state (client-side)
  page = 1;
  pageSize = 25;
  pageSizeOptions = [10, 25, 50, 100];

  constructor(private apiService: ApiServicesService) {}

  ngOnInit(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay  = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.startDate = firstDay.toISOString().slice(0,10);
    this.endDate   = lastDay.toISOString().slice(0,10);

    this.loadData();
  }

  // ---------- Derived pagination values ----------
  get total(): number { return this.rows.length; }

  get indexOfFirst(): number {
    return (this.page - 1) * this.pageSize;
  }

  get indexOfLast(): number {
    return Math.min(this.indexOfFirst + this.pageSize, this.total);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  pagedRows(): Row[] {
    if (!this.rows || !this.rows.length) return [];
    return this.rows.slice(this.indexOfFirst, this.indexOfLast);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
  }

  next(): void {
    if (this.page < this.totalPages) this.page++;
  }

  prev(): void {
    if (this.page > 1) this.page--;
  }

  /** Small window of page numbers around current page */
  pageWindow(radius: number = 2): number[] {
    const start = Math.max(1, this.page - radius);
    const end = Math.min(this.totalPages, this.page + radius);
    const arr: number[] = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  }

  // ---------- Data loading & filters ----------
  private loadData(): void {
    this.loading = true;
    this.apiService.getGatePasses(this.startDate, this.endDate, this.selectedDispatchNo).subscribe({
      next: (data: any) => {
        this.allGatepasses = data ?? [];

        // Build unique dispatch numbers for dropdown
        const set = new Set<string>(this.allGatepasses.map(g => g.dispatch_number));
        this.dispatchNos = Array.from(set).sort();

        // Build filtered table rows initially
        this.rebuildRows();

        // Reset pagination to first page when data changes
        this.page = 1;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching gate passes:', err);
        this.allGatepasses = [];
        this.rows = [];
        this.page = 1;
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    // fetch fresh data for the date range, then rebuild rows
    this.loadData();
    this.page = 1;
  }

  resetFilters(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay  = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.startDate = firstDay.toISOString().slice(0,10);
    this.endDate   = lastDay.toISOString().slice(0,10);
    this.selectedDispatchNo = '';
    this.loadData();
    this.page = 1;
  }

  // ---------- Helpers ----------
  private parseSerials(serialsStr: string): { make: string; serials: string[] }[] {
    // Expected: "MAKE1: s1, s2 | MAKE2: s3"
    if (!serialsStr) return [];
    return serialsStr
      .split('|')
      .map(s => s.trim())
      .filter(Boolean)
      .map(group => {
        const [mk, rest] = group.split(':');
        const make = (mk || 'UNKNOWN').trim().toUpperCase();
        const serials = (rest || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        return { make, serials };
      });
  }

  private inSelectedDispatch(g: Gatepass): boolean {
    return !this.selectedDispatchNo || g.dispatch_number === this.selectedDispatchNo;
  }

  private toDateOnly(iso: string): string {
    try {
      return new Date(iso).toISOString().slice(0,10);
    } catch {
      return '';
    }
  }

  public rebuildRows(): void {
    const rows: Row[] = [];
    let sl = 1;

    for (const g of this.allGatepasses) {
      if (!this.inSelectedDispatch(g)) continue;

      const groups = this.parseSerials(g.serial_numbers);
      const created = this.toDateOnly(g.created_at);

      for (const grp of groups) {
        for (const s of grp.serials) {
          rows.push({
            sl: sl++,
            dispatch_number: g.dispatch_number,
            report_ids: g.report_ids,
            serial_no: s,
            make: grp.make,
            receiver: `${g.receiver_name} (${g.receiver_designation})`,
            vehicle: g.vehicle,
            created_date: created,
          });
        }
      }
    }

    // Keep stable order: newest first by created_date, then dispatch, then serial
    rows.sort((a, b) => {
      if (a.created_date > b.created_date) return -1;
      if (a.created_date < b.created_date) return 1;
      if (a.dispatch_number > b.dispatch_number) return 1;
      if (a.dispatch_number < b.dispatch_number) return -1;
      return a.serial_no.localeCompare(b.serial_no);
    });

    // re-number after sort
    this.rows = rows.map((r, idx) => ({ ...r, sl: idx + 1 }));
    this.page = 1; // reset to first page after rebuild
  }

  // ---------- Exporters ----------
  exportToExcel(): void {
    if (!this.rows.length) return;

    // Export all filtered rows. To export only current page, use: this.pagedRows()
    const worksheet = XLSX.utils.json_to_sheet(this.rows);
    const workbook: XLSX.WorkBook = {
      Sheets: { 'Gatepass Dispatch' : worksheet },
      SheetNames: ['Gatepass Dispatch']
    };
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, `Gatepass_Dispatch_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  // Example PDF export (kept commented if not needed)
  // exportToPDF(): void {
  //   if (!this.rows.length) return;
  //   const doc = new jsPDF();
  //   // autoTable(doc, { html: '#printSection table' });
  //   doc.save(`Gatepass_Dispatch_${new Date().toISOString().slice(0,10)}.pdf`);
  // }
}
