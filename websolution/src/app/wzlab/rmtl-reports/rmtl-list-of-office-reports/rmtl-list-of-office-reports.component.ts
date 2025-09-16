import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
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

  // Raw + filtered
  all: OfficeReport[] = [];
  rows: OfficeReport[] = [];

  // Filters
  searchText = '';
  selectedRegion: string = 'ALL';
  selectedCircle: string = 'ALL';
  selectedDivision: string = 'ALL';

  // Dropdown options (unique values)
  regions: string[] = [];
  circles: string[] = [];
  divisions: string[] = [];

  // Flip this to true to use STATIC data below instead of API
  private useMock = false;

  constructor(private service: ApiServicesService) {}

  ngOnInit(): void {
    if (this.useMock) {
      this.all = this.mockData().map(this.normalizeNulls);
      this.setupDropdowns();
      this.applyFilters();
    } else {
      this.service.getofficelist().subscribe({
        next: (data:any) => {
          this.all = (data ?? []).map(this.normalizeNulls);          
          this.applyFilters();
          this.setupDropdowns();
        },
        error: (err:any) => {
          console.error('Failed to fetch list:', err);
        }
      });
    }
  }

  // Replace "NULL" strings with actual nulls; trim values
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
    const uniq = (arr: (string|null|undefined)[]) =>
      Array.from(new Set(arr.filter(Boolean) as string[])).sort((a,b)=>a.localeCompare(b));

    this.regions = ['ALL', ...uniq(this.all.map(x => x.region_name))];
    this.circles = ['ALL', ...uniq(this.all.map(x => x.circle_name))];
    this.divisions = ['ALL', ...uniq(this.all.map(x => x.division_name))];
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchText = '';
    this.selectedRegion = 'ALL';
    this.selectedCircle = 'ALL';
    this.selectedDivision = 'ALL';
    this.applyFilters();
  }

  private includesText(hay: string | null | undefined, needle: string): boolean {
    if (!needle) return true;
    const h = (hay ?? '').toLowerCase();
    return h.includes(needle.toLowerCase());
  }

  private applyFilters(): void {
    const txt = this.searchText.trim().toLowerCase();

    this.rows = this.all.filter(row => {
      // Dropdown filters
      const regionOk = this.selectedRegion === 'ALL' || row.region_name === this.selectedRegion;
      const circleOk = this.selectedCircle === 'ALL' || row.circle_name === this.selectedCircle;
      const divisionOk = this.selectedDivision === 'ALL' || row.division_name === this.selectedDivision;

      if (!(regionOk && circleOk && divisionOk)) return false;

      // Text search across common fields
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

  // --- TEMP MOCK DATA (useMock=true to test without API) ---
  private mockData(): OfficeReport[] {
    return [
      {
        "division_code": "NULL","id": 1,"circle_code": "NULL","region_code": "3610100","org_code": "3429800",
        "created_at": "2025-08-23T14:18:30","created_by": 1,"updated_by": 1,"division_name": "NULL",
        "code": "3361000","name": "SE-O&M Circle-Dewas","circle_name": "NULL","region_name": "CE/ED-Region-Ujjain",
        "org_name": "MD-Corporate-Office","updated_at": "2025-08-23T14:18:30"
      },
      {
        "division_code": "NULL","id": 2,"circle_code": "NULL","region_code": "NULL","org_code": "3429800",
        "created_at": "2025-08-23T14:18:30","created_by": 1,"updated_by": 1,"division_name": "NULL",
        "code": "3361001","name": "AE Nodal Office (FSP) Dewas","circle_name": "NULL","region_name": "NULL",
        "org_name": "MD-Corporate-Office","updated_at": "2025-08-23T14:18:30"
      },
      {
        "division_code": "NULL","id": 3,"circle_code": "NULL","region_code": "3610100","org_code": "3429800",
        "created_at": "2025-08-23T14:18:30","created_by": 1,"updated_by": 1,"division_name": "NULL",
        "code": "3362000","name": "SE-O&M Circle-Shajapur","circle_name": "NULL","region_name": "CE/ED-Region-Ujjain",
        "org_name": "MD-Corporate-Office","updated_at": "2025-08-23T14:18:30"
      },
      {
        "division_code": "NULL","id": 4,"circle_code": "NULL","region_code": "NULL","org_code": "3429800",
        "created_at": "2025-08-23T14:18:30","created_by": 1,"updated_by": 1,"division_name": "NULL",
        "code": "3362800","name": "EE Vigilance Shajapur","circle_name": "NULL","region_name": "NULL",
        "org_name": "MD-Corporate-Office","updated_at": "2025-08-23T14:18:30"
      },
      {
        "division_code": "NULL","id": 5,"circle_code": "NULL","region_code": "3610100","org_code": "3429800",
        "created_at": "2025-08-23T14:18:30","created_by": 1,"updated_by": 1,"division_name": "NULL",
        "code": "3363000","name": "SE-O&M Circle-Agar","circle_name": "NULL","region_name": "CE/ED-Region-Ujjain",
        "org_name": "MD-Corporate-Office","updated_at": "2025-08-23T14:18:30"
      }
    ] as any;
  }
}
