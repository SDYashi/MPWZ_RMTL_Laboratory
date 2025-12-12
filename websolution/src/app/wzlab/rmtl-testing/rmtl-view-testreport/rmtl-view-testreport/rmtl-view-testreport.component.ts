import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { firstValueFrom } from 'rxjs';

// existing pdf services...
import { ContestedReportPdfService } from 'src/app/shared/contested-report-pdf.service';
import { CtReportPdfService } from 'src/app/shared/ct-report-pdf.service';
import { P4onmReportPdfService } from 'src/app/shared/p4onm-report-pdf.service';
import { P4VigReportPdfService } from 'src/app/shared/p4vig-report-pdf.service';
import { SolarGenMeterCertificatePdfService } from 'src/app/shared/solargenmeter-certificate-pdf.service';
import { SolarNetMeterCertificatePdfService } from 'src/app/shared/solarnetmeter-certificate-pdf.service';
import { StopDefectiveReportPdfService } from 'src/app/shared/stopdefective-report-pdf.service';
import { OldAgainstMeterReportPdfService } from 'src/app/shared/oldagainstmeter-report-pdf.service';
import { SmartAgainstMeterReportPdfService } from 'src/app/shared/smartagainstmeter-report-pdf.service';
import { NewMeterReportPdfService } from 'src/app/shared/newmeter-report-pdf.service';

// ✅ SAMPLE PDF service types (MATCH YOUR SERVICE FILE)
import {
  SampleMeterReportPdfService,
  SampleMeterRow,
  SampleMeterMeta,
  PdfLogos
} from 'src/app/shared/samplemeter-report-pdf.service';

// ✅ PQ PDF service types (adjust names to match your pq service file)
import {
  PqMeterReportPdfService,
  PqMeterRow,
  PqMeterMeta
} from 'src/app/shared/pqmeter-report-pdf.service';

type ReportType = any;
type TestReport = any;

@Component({
  selector: 'app-rmtl-view-testreport',
  templateUrl: './rmtl-view-testreport.component.html',
  styleUrls: ['./rmtl-view-testreport.component.css']
})
export class RmtlViewTestreportComponent implements OnInit {
  Math = Math;
  search_serial = '';

  constructor(
    private router: Router,
    private api: ApiServicesService,
    private contestedPdf: ContestedReportPdfService,
    private ctPdf: CtReportPdfService,
    private p4onmPdf: P4onmReportPdfService,
    private p4vigPdf: P4VigReportPdfService,
    private oldmeterPdf: OldAgainstMeterReportPdfService,
    private smartmeterPdf: SmartAgainstMeterReportPdfService,
    private solarGenPdf: SolarGenMeterCertificatePdfService,
    private solarNetPdf: SolarNetMeterCertificatePdfService,
    private stopDefPdf: StopDefectiveReportPdfService,
    private newMeterPdf: NewMeterReportPdfService,

    // ✅ NEW
    private samplePdf: SampleMeterReportPdfService,
    private pqPdf: PqMeterReportPdfService
  ) {}

  reportTypes: ReportType[] = [];
  filters = { from: '', to: '', report_type: '' as '' | ReportType };

  all: TestReport[] = [];
  filtered: TestReport[] = [];
  pageRows: TestReport[] = [];

  page = 1;
  pageSize = 50;
  pageSizeOptions = [10, 25, 50, 100, 250, 500, 1000];

  pages: number[] = [];
  allPages: number[] = [];
  pageWindow: Array<number | '…'> = [];
  totalPages = 1;
  gotoInput: number | null = null;

  loading = false;
  error: string | null = null;

  selected: TestReport | null = null;

  ngOnInit(): void {
    this.fetchFromServer(true);
    this.api.getEnums().subscribe({
      next: (data) => (this.reportTypes = data?.test_report_types || []),
      error: (err) => console.error('Failed to load report types:', err)
    });
  }

  private S(v: any): string {
    return (v ?? '').toString().trim();
  }

  async getUserNameById(id: number): Promise<string> {
    try {
      const user = await firstValueFrom(this.api.getUser(id));
      return user?.name ?? '';
    } catch {
      return '';
    }
  }

  // ✅ PDF download by report id & type (SAMPLE + PQ included)
  async downloadTestreports_byreportidwithReportTypes(report_id?: string | null, report_type?: string | null) {
    const rid = this.S(report_id);
    const rtype = this.S(report_type);

    if (!rid || !rtype) return;

    this.loading = true;

    try {
      const apiResp: any = await new Promise((resolve, reject) =>
        this.api.getDevicesByReportId(rid).subscribe({ next: resolve, error: reject })
      );

      const rowsRaw: Array<{
        testing: any;
        device?: any;
        assignment?: any;
        lab?: any;
        user?: any;
        testing_bench?: any;
      }> = Array.isArray(apiResp) ? apiResp : [];

      if (!rowsRaw.length) {
        alert('No devices found for this report.');
        return;
      }

      const first = rowsRaw[0];
      const t0 = first.testing || {};
      const d0 = first.device || {};
      const a0 = first.assignment || {};
      const lab0 = first.lab || {};
      const bench0 = first.testing_bench || {};

      const benchName =
        bench0?.bench_name ||
        a0?.bench_name ||
        a0?.bench?.bench_name ||
        '';

      const phaseName = this.S(d0.phase || t0.phase);

      const testedBy = await this.getUserNameById(a0.user_id);
      const approvedBy = await this.getUserNameById(a0.assigned_by);

      const metaBase = {
        zone: `${this.S(d0.location_code || t0.location_code)} - ${this.S(d0.location_name || t0.location_name)}`.trim().replace(/^-?\s*-\s*$/, '-'),
        phase: phaseName || '-',
        date: this.S(t0.start_datetime || t0.testing_date || t0.created_at || new Date().toISOString()).slice(0, 10),
        testMethod: this.S(t0.test_method || 'NA').toUpperCase(),
        testStatus: this.S(t0.test_status || 'NA').toUpperCase(),
        testing_bench: this.S(benchName || bench0?.id || ''),
        testing_user: this.S(testedBy || ''),
        approving_user: this.S(approvedBy || ''),
        lab: {
          lab_name: this.S(lab0.lab_pdfheader_name || lab0.lab_name || t0.lab_name || ''),
          address_line: this.S(lab0.lab_pdfheader_address || lab0.lab_location || t0.lab_address || ''),
          email: this.S(lab0.lab_pdfheader_email || t0.lab_email || ''),
          phone: this.S(lab0.lab_pdfheader_contact_no || t0.lab_phone || '')
        }
      };

      const logos: PdfLogos = {
        leftLogoUrl: '/assets/icons/wzlogo.png',
        rightLogoUrl: '/assets/icons/wzlogo.png'
      };

      // ✅ SAMPLE mapping: MUST match SampleMeterRow interface (remark field!)
      const mapSAMPLE = (rec: any): SampleMeterRow => {
        const t = rec.testing || {};
        const d = rec.device || {};
        return {
          serial_number: this.S(d.serial_number),
          make: this.S(d.make),
          capacity: this.S(d.capacity),
          remark: this.S(t.final_remarks || t.details || ''),
          test_result: this.S(t.test_result)
        };
      };

      // ✅ PQ mapping: adjust to your PqMeterRow interface
      const mapPQ = (rec: any): PqMeterRow => {
        const t = rec.testing || {};
        const d = rec.device || {};
        return {
          serial_number: this.S(d.serial_number),
          make: this.S(d.make),
          phase: this.S(d.phase),
          voltage_rating: this.S(d.voltage_rating),
          meter_type: this.S(d.meter_type),
          meter_class: this.S(d.meter_class),
          remark: this.S(t.final_remarks || t.details || ''),
          test_result: this.S(t.test_result)
        } as any;
      };

      switch (rtype) {
        case 'SAMPLE': {
          const meta: SampleMeterMeta = metaBase as SampleMeterMeta;
          const sampleRows: SampleMeterRow[] = rowsRaw.map(mapSAMPLE);

          await this.samplePdf.download(sampleRows, meta, logos);
          break;
        }

        case 'PQ_METER_TESTING': {
          const meta: PqMeterMeta = {
            ...metaBase
          } as any;

          const pqRows: PqMeterRow[] = rowsRaw.map(mapPQ);
          await this.pqPdf.download(pqRows, meta, logos);
          break;
        }

        default: {
          alert(`Unsupported / unhandled report type: ${rtype}`);
          break;
        }
      }
    } catch (err) {
      console.error('downloadTestreports_byreportidwithReportTypes failed:', err);
      alert('Could not generate PDF for this report. Check console for details.');
    } finally {
      this.loading = false;
    }
  }

  // ---------------- existing methods below unchanged ----------------
  onSearchChanged(): void { this.fetchFromServer(true); }

  private fmt(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private currentMonthRange(): { from: string; to: string } {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = now;
    return { from: this.fmt(from), to: this.fmt(to) };
  }

  private resolveDateRange(): { from: string; to: string } {
    const hasFrom = !!this.filters.from;
    const hasTo = !!this.filters.to;

    if (!hasFrom && !hasTo) return this.currentMonthRange();

    let from = this.filters.from;
    let to = this.filters.to;

    if (hasFrom && !hasTo) to = this.fmt(new Date());
    else if (!hasFrom && hasTo) {
      const t = new Date(this.filters.to);
      from = this.fmt(new Date(t.getFullYear(), t.getMonth(), 1));
    }

    if (from && to && new Date(from) > new Date(to)) [from, to] = [to!, from!];
    return { from: from!, to: to! };
  }

  private fetchFromServer(resetPage = false): void {
    if (resetPage) this.page = 1;

    this.loading = true;
    this.error = null;

    const { from, to } = this.resolveDateRange();

    this.api.getTestingRecords(
      this.search_serial,
      null, null, null, null, null, null, null,
      this.filters.report_type,
      from,
      to
    ).subscribe({
      next: (data) => {
        this.all = Array.isArray(data) ? data : [];
        this.filtered = this.all.slice();
        this.repaginate();
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.detail || err?.message || 'Failed to load test reports.';
        this.all = [];
        this.filtered = [];
        this.pageRows = [];
        this.pages = [];
        this.totalPages = 1;
        this.allPages = [];
        this.pageWindow = [];
        this.loading = false;
      }
    });
  }

  onDateChanged(): void { this.fetchFromServer(true); }
  onReportTypeChanged(): void { this.fetchFromServer(true); }

  resetFilters(): void {
    this.filters = { from: '', to: '', report_type: '' };
    this.fetchFromServer(true);
  }

  private buildPageWindow(current: number, total: number, radius = 1): Array<number | '…'> {
    const set = new Set<number>();
    const add = (n: number) => { if (n >= 1 && n <= total) set.add(n); };
    add(1); add(total);
    for (let d = -radius; d <= radius; d++) add(current + d);
    add(2); add(3); add(total - 1); add(total - 2);

    const sorted = Array.from(set).sort((a, b) => a - b);
    const out: Array<number | '…'> = [];
    for (let i = 0; i < sorted.length; i++) {
      const n = sorted[i];
      if (i === 0) { out.push(n); continue; }
      const prev = sorted[i - 1];
      if (n === prev + 1) out.push(n);
      else out.push('…', n);
    }
    return out;
  }

  private repaginate(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    if (this.page > this.totalPages) this.page = this.totalPages;

    const start = (this.page - 1) * this.pageSize;
    this.pageRows = this.filtered.slice(start, start + this.pageSize);

    this.allPages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.pageWindow = this.buildPageWindow(this.page, this.totalPages, 1);
    this.pages = this.allPages;
  }

  goto(p: number): void {
    if (!p) return;
    const next = Math.max(1, Math.min(this.totalPages, Math.floor(p)));
    if (next === this.page) return;
    this.page = next;
    this.repaginate();
  }

  onPageSizeChange(): void {
    this.page = 1;
    this.repaginate();
  }

  openDetails(r: TestReport): void {
    this.selected = r;
  }

  exportCSV(): void {
    const headers = [
      'report_id','report_type','test_method','test_status','test_result',
      'serial_number','make','inward_number','inward_date','phase','meter_type','voltage_rating',
      'final_remarks'
    ];

    const val = (r: any, k: string) => (r?.[k] ?? r?.testing?.[k] ?? r?.device?.[k] ?? '');
    const rows = this.filtered.map(r => headers.map(k => val(r, k)));

    const csv = [headers, ...rows]
      .map(row => row.map(v => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rmtl_test_reports_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
