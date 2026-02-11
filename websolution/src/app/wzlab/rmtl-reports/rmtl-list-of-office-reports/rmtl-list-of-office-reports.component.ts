import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { OfficeReport } from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-rmtl-list-of-office-reports',
  templateUrl: './rmtl-list-of-office-reports.component.html',
  styleUrls: ['./rmtl-list-of-office-reports.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RmtlListOfOfficeReportsComponent implements OnInit {

  all: OfficeReport[] = [];
  rows: OfficeReport[] = [];

  searchText = '';
  selectedRegion: string = 'ALL';
  selectedCircle: string = 'ALL';
  selectedDivision: string = 'ALL';

  regions: string[] = [];
  circles: string[] = [];
  divisions: string[] = [];

  private useMock = false;

  constructor(
    private service: ApiServicesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // ✅ AUTO LOAD ON PAGE OPEN
    this.loadOfficeList();
  }

  loadOfficeList(): void {
    if (this.useMock) {
      this.all = this.mockData().map(this.normalizeNulls);
      this.setupDropdowns();
      this.applyFilters();
      this.cdr.markForCheck(); // ✅ refresh UI
      return;
    }

    this.service.getofficelist().subscribe({
      next: (data: any) => {
        this.all = (data ?? []).map(this.normalizeNulls);
        this.setupDropdowns();
        this.applyFilters();

        this.cdr.markForCheck(); // ✅ VERY IMPORTANT FOR OnPush
      },
      error: (err: any) => {
        console.error('Failed to fetch list:', err);
        this.cdr.markForCheck();
      }
    });
  }

  private normalizeNulls = (r: OfficeReport): OfficeReport => {
    const fix = (v: any) => (v === 'NULL' || v === undefined ? null : (typeof v === 'string' ? v.trim() : v));
    return {
      ...r,
      org_code: fix(r.org_code),
      org_name: fix(r.org_name),
      region_code: fix(r.region_code),
      region_name: fix(r.region_name),
      circle_code: fix(r.circle_code),
      circle_name: fix(r.circle_name),
      division_code: fix(r.division_code),
      division_name: fix(r.division_name),
    };
  };

  private setupDropdowns(): void {
    const uniq = (arr: (string | null | undefined)[]) =>
      Array.from(new Set(arr.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));

    this.regions = ['ALL', ...uniq(this.all.map(x => x.region_name))];
    this.circles = ['ALL', ...uniq(this.all.map(x => x.circle_name))];
    this.divisions = ['ALL', ...uniq(this.all.map(x => x.division_name))];
  }

  onFilterChange(): void {
    this.applyFilters();
    this.cdr.markForCheck();
  }

  onSearchChange(): void {
    this.applyFilters();
    this.cdr.markForCheck();
  }

  resetFilters(): void {
    this.searchText = '';
    this.selectedRegion = 'ALL';
    this.selectedCircle = 'ALL';
    this.selectedDivision = 'ALL';
    this.applyFilters();
    this.cdr.markForCheck();
  }

  private includesText(hay: string | null | undefined, needle: string): boolean {
    if (!needle) return true;
    const h = (hay ?? '').toLowerCase();
    return h.includes(needle.toLowerCase());
  }

  private applyFilters(): void {
    const txt = this.searchText.trim().toLowerCase();

    this.rows = this.all.filter(row => {
      const regionOk = this.selectedRegion === 'ALL' || row.region_name === this.selectedRegion;
      const circleOk = this.selectedCircle === 'ALL' || row.circle_name === this.selectedCircle;
      const divisionOk = this.selectedDivision === 'ALL' || row.division_name === this.selectedDivision;
      if (!(regionOk && circleOk && divisionOk)) return false;

      if (!txt) return true;

      return [
        row.code, row.name, row.org_name,
        row.region_name, row.circle_name, row.division_name
      ].some(v => this.includesText(v, txt));
    });
  }

  display(val: string | null | undefined): string {
    return (val && val !== 'NULL') ? val : '';
  }

  trackById = (_: number, r: OfficeReport) => r.id;

  exportToExcel(): void {
    const exportRows = this.rows.map(r => ({
      Code: r.code,
      Name: r.name,
      Organization: this.display(r.org_name),
      Region: this.display(r.region_name),
      Circle: this.display(r.circle_name),
      Division: this.display(r.division_name),
      CreatedAt: r.created_at,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Offices');

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fname = `RMTL_Offices_${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.xlsx`;

    XLSX.writeFile(wb, fname);
  }

  private mockData(): OfficeReport[] {
    return [/* same as your mock */] as any;
  }
}
