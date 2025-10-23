import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';
import{ ContestedReportPdfService,ContestedReportHeader, ContestedReportRow } from 'src/app/shared/contested-report-pdf.service'; 
import {CtReportPdfService, CtHeader, CtPdfRow } from 'src/app/shared/ct-report-pdf.service';
import { P4onmReportPdfService, P4ONMReportHeader, P4ONMReportRow } from 'src/app/shared/p4onm-report-pdf.service';
import { P4VigReportPdfService, VigHeader, VigRow } from 'src/app/shared/p4vig-report-pdf.service';
import { SolarGenMeterCertificatePdfService, GenHeader, GenRow } from 'src/app/shared/solargenmeter-certificate-pdf.service';
import { SolarNetMeterCertificatePdfService, SolarHeader, SolarRow } from 'src/app/shared/solarnetmeter-certificate-pdf.service';
import { PdfLogos, StopDefectiveReportPdfService, StopDefMeta, StopDefRow } from 'src/app/shared/stopdefective-report-pdf.service';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { OldAgainstMeta, OldAgainstMeterReportPdfService, OldAgainstRow } from 'src/app/shared/oldagainstmeter-report-pdf.service';
import { SmartAgainstMeterReportPdfService, SmartMeta, SmartRow } from 'src/app/shared/smartagainstmeter-report-pdf.service';
// import { DomSanitizer } from '@angular/platform-browser';
(pdfMake as any).vfs = pdfFonts.vfs;
type TDocumentDefinition = /*unresolved*/ any;
type DeviceType = any;   
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

  constructor(private router: Router, 
    private api: ApiServicesService,
    private contestedPdf: ContestedReportPdfService,
    private ctPdf: CtReportPdfService,
    private p4onmPdf: P4onmReportPdfService,
    private p4vigPdf: P4VigReportPdfService,
    private oldmeterPdf: OldAgainstMeterReportPdfService,
    private smartmeterPdf: SmartAgainstMeterReportPdfService,
    private solarGenPdf: SolarGenMeterCertificatePdfService,
    private solarNetPdf: SolarNetMeterCertificatePdfService,
    private stopDefPdf: StopDefectiveReportPdfService
  ) {}

  // Filters & data
  reportTypes: ReportType[] = [];
  filters = {
    from: '',              // yyyy-MM-dd (optional)
    to: '',                // yyyy-MM-dd (optional)
    report_type: '' as '' | ReportType,
  };

  all: TestReport[] = [];
  filtered: TestReport[] = [];
  pageRows: TestReport[] = [];

  // pagination controls
  page = 1;
  pageSize = 50; // attractive default; adjust if needed
  pageSizeOptions = [10, 25, 50, 100, 250, 500, 1000];

  pages: number[] = [];      // legacy reference
  allPages: number[] = [];   // for mobile <select>
  pageWindow: Array<number | '…'> = []; // desktop ellipses window
  totalPages = 1;
  gotoInput: number | null = null;

  // ui state
  loading = false;
  error: string | null = null;

  selected: TestReport | null = null;

  ngOnInit(): void {
    this.fetchFromServer(true);
    this.api.getEnums().subscribe({
      next: (data) => this.reportTypes = data.test_report_types || [],
      error: (err) => console.error('Failed to load report types:', err)
    });
  }

  /** Format as yyyy-MM-dd in local time (no TZ shift) */
  private fmt(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** First and last day (today) for current month */
  private currentMonthRange(): { from: string; to: string } {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = now; // today
    return { from: this.fmt(from), to: this.fmt(to) };
  }

  /** Decide final date range to send to API based on filters */
  private resolveDateRange(): { from: string; to: string } {
    const hasFrom = !!this.filters.from;
    const hasTo = !!this.filters.to;

    if (!hasFrom && !hasTo) {
      return this.currentMonthRange();
    }

    let from = this.filters.from;
    let to = this.filters.to;

    if (hasFrom && !hasTo) {
      // from only → up to today
      to = this.fmt(new Date());
    } else if (!hasFrom && hasTo) {
      // to only → from first day of that month
      const t = new Date(this.filters.to);
      from = this.fmt(new Date(t.getFullYear(), t.getMonth(), 1));
    }

    // swap if reversed
    if (from && to && new Date(from) > new Date(to)) {
      [from, to] = [to, from];
    }
    return { from: from!, to: to! };
  }
  onSearchChanged(): void {
    this.fetchFromServer(true);
  }

  /** Fetch from API using server-side date range (no full dump) */
  private fetchFromServer(resetPage = false): void {
    if (resetPage) this.page = 1;

    this.loading = true;
    this.error = null;

    const { from, to } = this.resolveDateRange();

    this.api.getTestingRecords(
      this.search_serial, // serial_number
      null, // user_id
      null, // test_result
      null, // test_method
      null, // test_status
      null, // lab_id
      null, // offset
      null, // limit
      this.filters.report_type, // report_type
      from, // start_date (FIX: use resolved 'from')
      to    // end_date
      
    ).subscribe({
      next: (data) => {
        this.all = Array.isArray(data) ? data : [];
        // Server already filtered by date; optionally filter further by report_type here if needed
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

    async downloadTestreports_byreportidwithReportTypes(report_id?: string | null, report_type?: string | null) {
      const id = (report_id ?? '').toString().trim();
      const type = (report_type ?? '').toString().trim();

      if (!id || !type) {
        console.warn('Invalid report type or report id', { id, type });
        return;
      }

      this.loading = true;
      try {
        const data: any = await new Promise((resolve, reject) =>
          this.api.getDevicesByReportId(id).subscribe({ next: resolve, error: reject })
        );

        if (!data) {
          alert('Empty response from server while fetching testreport info by report id.');
          this.loading = false;
          return;
        }

        // ---------- Helpers ----------
        const s = (v: any) => (v === null || v === undefined) ? '' : String(v);
        const n = (v: any) => (v === null || v === undefined || v === '') ? undefined : Number(v);
        const yesNo = (v: any) => !!v;

        // Detect a devices array in common shapes
        let devices: any[] = [];
        if (Array.isArray(data.devices)) devices = data.devices;
        else if (Array.isArray(data.rows)) devices = data.rows;
        else if (Array.isArray(data.items)) devices = data.items;
        else if (Array.isArray(data)) devices = data;
        else {
          // pick any first Array-valued property
          const arrField = Object.values(data).find(v => Array.isArray(v)) as any[] | undefined;
          if (arrField) devices = arrField;
        }

        // Generic header guesser (best-effort)
        const hdrSource = data.header ?? data.meta ?? data.info ?? data;
        const guessedDate =
          hdrSource?.date ??
          hdrSource?.tested_date ??
          (devices[0]?.testing_date) ??
          new Date().toISOString().slice(0, 10);

        const baseHeader = {
          date: s(guessedDate).slice(0, 10),
          phase: s(hdrSource?.phase ?? hdrSource?.meter_category ?? ''),
          zone: s(hdrSource?.zone ?? hdrSource?.location_zone ?? hdrSource?.zone_name ?? ''),
          location_code: s(hdrSource?.location_code ?? hdrSource?.loc_code ?? ''),
          location_name: s(hdrSource?.location_name ?? hdrSource?.loc_name ?? ''),
          testing_bench: s(hdrSource?.testing_bench ?? hdrSource?.bench ?? ''),
          testing_user: s(hdrSource?.testing_user ?? hdrSource?.tested_by ?? hdrSource?.testing_by ?? ''),
          approving_user: s(hdrSource?.approving_user ?? hdrSource?.approved_by ?? ''),
          lab_name: s(hdrSource?.lab_name ?? hdrSource?.lab_name ?? undefined),
          lab_address: s(hdrSource?.lab_address ?? hdrSource?.lab_address ?? undefined),
          lab_email: s(hdrSource?.lab_email ?? hdrSource?.lab_email ?? undefined),
          lab_phone: s(hdrSource?.lab_phone ?? hdrSource?.lab_phone ?? undefined),
          leftLogoUrl: hdrSource?.leftLogoUrl ?? hdrSource?.left_logo_url ?? hdrSource?.left_logo ?? undefined,
          rightLogoUrl: hdrSource?.rightLogoUrl ?? hdrSource?.right_logo_url ?? hdrSource?.right_logo ?? undefined,
          testerName: s(hdrSource?.testerName ?? hdrSource?.tester_name ?? ''),
          report_id: s(hdrSource?.report_id ?? hdrSource?.reportId ?? hdrSource?.id ?? `RPT-${hdrSource?.date ?? ''}`)
        } as P4ONMReportHeader; 

        // ---------- Specific mappers ----------
        const mapP4ONMRow = (d: any, idx = 0): P4ONMReportRow => ({
          serial: s(d.serial || d.serial_number || d.meter_no || d.sn || `S${idx+1}`),
          make: s(d.make || d.manufacturer || d.brand),
          capacity: s(d.capacity || d.kva || d.rating),
          removal_reading: n(d.removal_reading ?? d.removalReading ?? d.reading_at_removal ?? d.removal_read),
          consumer_name: s(d.consumer_name || d.customer_name || d.name),
          account_no_ivrs: s(d.account_no_ivrs || d.account_number || d.ivrs),
          address: s(d.address || d.consumer_address || d.addr),
          p4onm_by: s(d.p4onm_by || d.p4_by || d.collected_by),
          payment_particulars: s(d.payment_particulars || d.payment_desc || d.payment_details),
          receipt_no: s(d.receipt_no || d.receipt_number),
          receipt_date: s(d.receipt_date || d.receipt_on || d.payment_date),
          condition_at_removal: s(d.condition_at_removal || d.removal_condition),
          testing_date: s(d.testing_date || d.tested_date || baseHeader.date),
          physical_condition_of_device: s(d.physical_condition_of_device || d.physical_condition),
          is_burned: yesNo(d.is_burned || d.burnt || d.found_burnt),
          seal_status: s(d.seal_status || d.body_seal),
          meter_glass_cover: s(d.meter_glass_cover || d.glass_cover),
          terminal_block: s(d.terminal_block || d.terminal),
          meter_body: s(d.meter_body || d.body),
          // other: s(d.other || d.notes),
          // // reading_before_test: n(d.reading_before_test ?? d.before_test ?? d.reading_before),
          // // reading_after_test: n(d.reading_after_test ?? d.after_test ?? d.reading_after),
          // // rsm_kwh: n(d.rsm_kwh ?? d.rsm),
          // // meter_kwh: n(d.meter_kwh ?? d.meter_kwh_reading ?? d.meter_kwh_value),
          // // error_percentage: n(d.error_percentage ?? d.ratio_error_pct ?? d.error_pct),
          // starting_current_test: s(d.starting_current_test ?? d.starting_current ?? d.start_current_status),
          // creep_test: s(d.creep_test ?? d.creep_status),
          // remark: s(d.remark || d.remarks || d.observation)
        });

        // Vig / P4VIG mapper 
        const mapVigRow = (d: any, idx = 0): VigRow => {
          return {
            serial: s(d.serial || d.serial_number || d.meter_no || d.sn || `S${idx+1}`),
            make: s(d.make || d.manufacturer),
            capacity: s(d.capacity || d.kva),
            reading_before_test: n(d.reading_before_test ?? d.before_test ?? d.reading_before),
            reading_after_test: n(d.reading_after_test ?? d.after_test ?? d.reading_after),
            error_percentage: n(d.error_percentage ?? d.ratio_error_pct ?? d.error_pct),
            remark: s(d.remark || d.remarks || d.observation),
            ...(d as any)
          } as any;
        };
        const mapAgainstOldRow = ( d:any, idx=0): VigRow => {
            return {
            serial: s(d.serial || d.serial_number || d.meter_no || d.sn || `S${idx+1}`),
            make: s(d.make || d.manufacturer),
            capacity: s(d.capacity || d.kva),
            reading_before_test: n(d.reading_before_test ?? d.before_test ?? d.reading_before),
            reading_after_test: n(d.reading_after_test ?? d.after_test ?? d.reading_after),
            error_percentage: n(d.error_percentage ?? d.ratio_error_pct ?? d.error_pct),
            remark: s(d.remark || d.remarks || d.observation),
            ...(d as any)
          } as any;
        }
        const mapSmartAgainstRow = (d:any, idx=0):VigRow =>{
            return {
            serial: s(d.serial || d.serial_number || d.meter_no || d.sn || `S${idx+1}`),
            make: s(d.make || d.manufacturer),
            capacity: s(d.capacity || d.kva),
            reading_before_test: n(d.reading_before_test ?? d.before_test ?? d.reading_before),
            reading_after_test: n(d.reading_after_test ?? d.after_test ?? d.reading_after),
            error_percentage: n(d.error_percentage ?? d.ratio_error_pct ?? d.error_pct),
            remark: s(d.remark || d.remarks || d.observation),
            ...(d as any)
          } as any;
        }

        // CT testing mapper
        const mapCtRow = (d: any, idx = 0): CtPdfRow => ({
          serial: s(d.serial || d.ct_sn || d.device_sn || `CT${idx+1}`),
          make: s(d.make || d.manufacturer),
          ct_ratio: s(d.ct_ratio || d.ratio || d.ctRatio),
          ct_class: s(d.ct_class || d.class),
          burden_va: s(d.burden_va ?? d.burden),
          remark: s(d.remark || d.remarks),
          // additional CT-specific fields you might need
          ...(d as any)
        } as any);

        // Contested report mapper
        const mapContestedRow = (d: any, idx = 0): ContestedReportRow => ({
          serial: s(d.serial || d.serial_number || d.meter_no || `S${idx+1}`),
          make: s(d.make || d.manufacturer),
          capacity: s(d.capacity || d.kva),
          testing_date: s(d.testing_date || d.tested_date || baseHeader.date),
          remark: s(d.remark || d.remarks || d.observation),
          // include fields your contested report expects; fallback to raw object
          ...(d as any)
        } as any);

        // Solar generation / netmeter mappers (very generic — adapt to your service interfaces)
        const mapSolarGenRow = (d: any, idx = 0): GenRow => ({
          serial: s(d.serial || d.serial_number || `S${idx+1}`),
          make: s(d.make || d.inverter_make || d.manufacturer),
          meter_kwh: n(d.meter_kwh || d.generation_kwh),
          error_percentage: n(d.error_percentage),
          remark: s(d.remark || d.notes || d.remarks),
          ...(d as any)
        } as any);

        const mapSolarNetRow = (d: any, idx = 0): SolarRow => ({
          serial: s(d.serial || d.serial_number || `S${idx+1}`),
          make: s(d.make || d.manufacturer),
          meter_kwh: n(d.meter_kwh || d.net_kwh),
          remark: s(d.remark || d.notes),
          ...(d as any)
        } as any);

        // Stop defective mapper
        const mapStopDefRow = (d: any, idx = 0): StopDefRow => ({
          serial: s(d.serial || d.serial_number || `S${idx+1}`),
          make: s(d.make || d.manufacturer),
          condition: s(d.condition || d.status || d.defect_description),
          remark: s(d.remark || d.remarks),
          ...(d as any)
        } as any);

        // ---------- Choose mapper & service by report type ----------
        type ServiceCall = { serviceName: string; call: (header: any, rows: any[]) => Promise<void> };
        const svcCalls: Record<string, ServiceCall> = {
          'ONM_CHECKING': {
            serviceName: 'P4onmReportPdfService',
            call: async (header: P4ONMReportHeader, rows: P4ONMReportRow[]) =>
              this.p4onmPdf.downloadFromBatch(header, rows, { fileName: `P4_ONM_${header.date}_${id}.pdf` })
          },
          'VIGILENCE_CHECKING': {
            serviceName: 'P4VigReportPdfService',
            call: async (header: VigHeader, rows: VigRow[]) =>
              this.p4vigPdf.download(header, rows)
          },
          'AGAINST_OLD_METER': {
            serviceName: 'OldAgainstMeterReportPdfService',
                call: async (header: OldAgainstMeta, rows: OldAgainstRow[], logos?: PdfLogos) => {
                  this.oldmeterPdf.download( rows, header, logos)
                },
          },
          'SMART_AGAINST_METER': {
            serviceName: 'SmartAgainstMeterReportPdfService',
            call: async (header: SmartMeta, rows: SmartRow[], logos?: PdfLogos) =>
               this.smartmeterPdf.download( rows, header, logos)
          },
          'SOLAR_GENERATION_METER': {
            serviceName: 'SolarGenMeterCertificatePdfService',
            call: async (header: GenHeader, rows: GenRow[]) =>
              this.solarGenPdf.download(header, rows)
          },
          'SOLAR_NETMETER': {
            serviceName: 'SolarNetMeterCertificatePdfService',
            call: async (header: SolarHeader, rows: SolarRow[]) =>
              this.solarNetPdf.download(header, rows)
          },
          'CT_TESTING': {
            serviceName: 'CtReportPdfService',
            call: async (header: CtHeader, rows: CtPdfRow[]) =>
              this.ctPdf.download(header, rows)
          },
          'CONTESTED': {
            serviceName: 'ContestedReportPdfService',
            call: async (header: ContestedReportHeader, rows: ContestedReportRow[]) =>
              this.contestedPdf.downloadFromBatch(header, rows, { fileName: `Contested_${header.date}_${id}.pdf` })
          },
          'STOP_DEFECTIVE': {
            serviceName: 'StopDefectiveReportPdfService',
            call: async (header: StopDefMeta, rows: StopDefRow[]) =>
              this.stopDefPdf.download(rows, header)
          },
        };

        const handler = svcCalls[type];
        if (!handler) {
          alert(`Unsupported report type: ${type}`);
          console.error('Unsupported report type:', type);
          this.loading = false;
          return;
        }

        // Build rows depending on type
        let headerObj: any = { ...baseHeader };
        let rowsObj: any[] = [];

        switch (type) {
          case 'ONM_CHECKING':
            rowsObj = devices.map(mapP4ONMRow);
            break;
          case 'VIGILENCE_CHECKING':
            rowsObj = devices.map(mapVigRow);
            break;          
          case 'AGAINST_OLD_METER':
            rowsObj = devices.map(mapAgainstOldRow);
            break;
          case 'SMART_AGAINST_METER':  
            rowsObj = devices.map(mapSmartAgainstRow);
            break;
          case 'CT_TESTING':
            rowsObj = devices.map(mapCtRow);
            break;
          case 'CONTESTED':
            rowsObj = devices.map(mapContestedRow);
            break;
          case 'SOLAR_GENERATION_METER':
            rowsObj = devices.map(mapSolarGenRow);
            break;
          case 'SOLAR_NETMETER':
            rowsObj = devices.map(mapSolarNetRow);
            break;
          case 'STOP_DEFECTIVE':
            rowsObj = devices.map(mapStopDefRow);
            break;
          default:
            // generic fallback: pass the raw devices array
            rowsObj = devices;
            break;
        }

        if (!rowsObj || !rowsObj.length) {
          alert('No device rows found for this report — cannot generate PDF.');
          console.warn('No rows found from API response:', data);
          this.loading = false;
          return;
        }

        // Call the service
        try {
          await handler.call(headerObj, rowsObj);
          // success
        } catch (err) {
          console.error(`Failed to generate ${type} PDF via ${handler.serviceName}:`, err);
          alert('Failed to generate PDF. See console for details.');
        }

      } catch (err: any) {
        console.error('Failed to fetch report data:', err);
        alert('Could not generate PDF. Try again later.');
      } finally {
        this.loading = false;
      }
    }



  /** When the user changes any date or report_type, re-query the API */
  onDateChanged(): void {
    this.fetchFromServer(true);
  }
  onReportTypeChanged(): void {
    this.fetchFromServer(true);
  }

  resetFilters(): void {
    this.filters = { from: '', to: '', report_type: '' };
    this.fetchFromServer(true); 
  }

  // ===== Pagination helpers =====
  private buildPageWindow(current: number, total: number, radius = 1): Array<number|'…'> {
    const set = new Set<number>();
    const add = (n: number) => { if (n >= 1 && n <= total) set.add(n); };

    add(1); add(total);
    for (let d = -radius; d <= radius; d++) add(current + d);
    // Smoother edges
    add(2); add(3); add(total - 1); add(total - 2);

    const sorted = Array.from(set).sort((a, b) => a - b);
    const out: Array<number|'…'> = [];
    for (let i = 0; i < sorted.length; i++) {
      const n = sorted[i];
      if (i === 0) { out.push(n); continue; }
      const prev = sorted[i - 1];
      if (n === prev + 1) {
        out.push(n);
      } else {
        out.push('…', n);
      }
    }
    return out;
  }

  private repaginate(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    if (this.page > this.totalPages) this.page = this.totalPages;

    const start = (this.page - 1) * this.pageSize;
    this.pageRows = this.filtered.slice(start, start + this.pageSize);

    // build arrays
    this.allPages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.pageWindow = this.buildPageWindow(this.page, this.totalPages, 1);
    this.pages = this.allPages; // kept for any older references
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

  // ===== Actions =====
  openDetails(r: TestReport): void {
    this.selected = r;
  }

  // ===== CSV export =====
  exportCSV(): void {
    const headers = [
      'id','tested_date','device_type','report_type','serial_number','make','result','inward_no',
      'meter_category','phase','meter_type','ct_class','ct_ratio','burden_va',
      'observation','cause','site','load_kw','inspection_ref','solar_kwp','inverter_make','grid_voltage',
      'magnetization_test','ratio_error_pct','phase_angle_min','tested_by','remarks'
    ];

    const val = (r: any, k: string) => (r?.[k] ?? r?.testing?.[k] ?? r?.device?.[k] ?? '');

    const rows = this.filtered.map(r => headers.map(k => val(r, k)));
    const csv = [headers, ...rows]
      .map(row => row.map(v => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
      }).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rmtl_test_reports_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
