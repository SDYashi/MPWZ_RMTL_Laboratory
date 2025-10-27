import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';

import {
  ContestedReportPdfService,
  ContestedReportHeader,
  ContestedReportRow
} from 'src/app/shared/contested-report-pdf.service';

import {
  CtReportPdfService,
  CtHeader,
  CtPdfRow
} from 'src/app/shared/ct-report-pdf.service';

import {
  P4onmReportPdfService,
  P4ONMReportHeader,
  P4ONMReportRow
} from 'src/app/shared/p4onm-report-pdf.service';

import {
  P4VigReportPdfService,
  VigHeader,
  VigRow
} from 'src/app/shared/p4vig-report-pdf.service';

import {
  SolarGenMeterCertificatePdfService,
  GenHeader,
  GenRow
} from 'src/app/shared/solargenmeter-certificate-pdf.service';

import {
  SolarNetMeterCertificatePdfService,
  SolarHeader,
  SolarRow
} from 'src/app/shared/solarnetmeter-certificate-pdf.service';

import {
  PdfLogos,
  StopDefectiveReportPdfService,
  StopDefMeta,
  StopDefRow
} from 'src/app/shared/stopdefective-report-pdf.service';

import {
  OldAgainstMeta,
  OldAgainstMeterReportPdfService,
  OldAgainstRow
} from 'src/app/shared/oldagainstmeter-report-pdf.service';

import {
  SmartAgainstMeterReportPdfService,
  SmartMeta,
  SmartRow
} from 'src/app/shared/smartagainstmeter-report-pdf.service';

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

// NOTE: If these exist in your codebase, keep them.
// I'm keeping these aliases for clarity.
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
  pageSize = 50;
  pageSizeOptions = [10, 25, 50, 100, 250, 500, 1000];

  pages: number[] = [];
  allPages: number[] = [];
  pageWindow: Array<number | '…'> = [];
  totalPages = 1;
  gotoInput: number | null = null;

  // ui state
  loading = false;
  error: string | null = null;

  selected: TestReport | null = null;

  // ========= lifecycle =========
  ngOnInit(): void {
    this.fetchFromServer(true);

    this.api.getEnums().subscribe({
      next: (data) => {
        this.reportTypes = data?.test_report_types || [];
      },
      error: (err) => console.error('Failed to load report types:', err)
    });
  }

  // ========= date helpers =========

  /** Format as yyyy-MM-dd in local time (no TZ shift) */
  private fmt(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** First-of-month -> today */
  private currentMonthRange(): { from: string; to: string } {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = now;
    return { from: this.fmt(from), to: this.fmt(to) };
  }

  /** Decide final date range we send to API */
  private resolveDateRange(): { from: string; to: string } {
    const hasFrom = !!this.filters.from;
    const hasTo = !!this.filters.to;

    if (!hasFrom && !hasTo) {
      return this.currentMonthRange();
    }

    let from = this.filters.from;
    let to   = this.filters.to;

    if (hasFrom && !hasTo) {
      to = this.fmt(new Date()); // from -> today
    } else if (!hasFrom && hasTo) {
      const t = new Date(this.filters.to);
      from = this.fmt(new Date(t.getFullYear(), t.getMonth(), 1)); // first of "to" month
    }

    // swap if reversed
    if (from && to && new Date(from) > new Date(to)) {
      [from, to] = [to!, from!];
    }

    return { from: from!, to: to! };
  }

  // ========= data fetch =========

  onSearchChanged(): void {
    this.fetchFromServer(true);
  }

  /** Fetch reports for table */
  private fetchFromServer(resetPage = false): void {
    if (resetPage) this.page = 1;

    this.loading = true;
    this.error = null;

    const { from, to } = this.resolveDateRange();

    this.api.getTestingRecords(
      this.search_serial,         // serial_number
      null,                       // user_id
      null,                       // test_result
      null,                       // test_method
      null,                       // test_status
      null,                       // lab_id
      null,                       // offset
      null,                       // limit
      this.filters.report_type,   // report_type
      from,                       // start_date
      to                          // end_date
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

  // ========= PDF GENERATION FLOW =========
  //
  // Public method you call from (click) in the template.
  //
async downloadTestreports_byreportidwithReportTypes(
  report_id?: string | null,
  report_type?: string | null
) {
  const rid = (report_id ?? '').toString().trim();
  const rtype = (report_type ?? '').toString().trim();

  if (!rid || !rtype) {
    console.warn('Missing report_id or report_type', { rid, rtype });
    return;
  }

  this.loading = true;

  try {
    // 1. Fetch all test rows for that report_id
    const apiResp: any = await new Promise((resolve, reject) =>
      this.api.getDevicesByReportId(rid).subscribe({
        next: resolve,
        error: reject
      })
    );

    // Your sample response is already an array of { testing, device, assignment }
    // Normalize it:
    const rowsRaw: Array<{
      testing: any;
      device?: any;
      assignment?: any;
    }> = Array.isArray(apiResp)
      ? apiResp
      : Array.isArray(apiResp?.devices)
        ? apiResp.devices
        : Array.isArray(apiResp?.rows)
          ? apiResp.rows
          : Array.isArray(apiResp?.items)
            ? apiResp.items
            : [];

    if (!rowsRaw.length) {
      alert('No devices found for this report.');
      this.loading = false;
      return;
    }

    // helpers for safe extraction/formatting
    const S = (v: any) => (v === null || v === undefined ? '' : String(v));
    const N = (v: any) => {
      if (v === null || v === undefined || v === '') return undefined;
      const num = Number(v);
      return Number.isFinite(num) ? num : undefined;
    };

    // 2. Build header from first record.
    // We’ll try to pull common fields your PDFs usually want:
    const first = rowsRaw[0];
    const t0 = first.testing || {};
    const d0 = first.device || {};
    const benchName = first.assignment?.bench_name || first.assignment?.bench?.bench_name || '';
    const testUserName = t0.tested_by || t0.testing_user || t0.testing_by || ''; // fallback if later you add tester
    const approvingUser = t0.approving_user || t0.approved_by || '';

    // We’ll keep this generic and then adapt per report_type below.
    const commonHeaderBase = {
      // zone/location
      location_code: S(d0.location_code || t0.location_code || ''),
      location_name: S(d0.location_name || t0.location_name || ''),

      // lab / meta
      date: S(
        (t0.start_datetime || t0.tested_date || t0.testing_date || t0.created_at || new Date().toISOString())
      ).slice(0, 10),

      testMethod: S(t0.test_method || ''),
      testStatus: S(t0.test_status || ''),
      testing_bench: S(benchName || t0.testing_bench || ''),
      testing_user: S(testUserName || t0.testing_user || ''),
      approving_user: S(approvingUser || ''),

      lab_name:  S(t0.lab_name  || ''),
      lab_address: S(t0.lab_address || ''),
      lab_email: S(t0.lab_email || ''),
      lab_phone: S(t0.lab_phone || ''),
      leftLogoUrl: t0.left_logo_url || t0.leftLogoUrl,
      rightLogoUrl: t0.right_logo_url || t0.rightLogoUrl,
    };

    // 3. Per-report row mappers.
    // IMPORTANT: We now pull from both .testing and .device for each row.
    const mapSMART_AGAINST_METER = (rec: any) => {
      const t = rec.testing || {};
      const d = rec.device || {};

      const rowForSmartPdf = {
        // SmartAgainstMeterReportPdfService / SmartRow needs typical fields like:
        serial_number: S(d.serial_number),
        make: S(d.make),
        capacity: S(d.capacity || d.phase || ''),
        meter_category: S(d.meter_category || ''),
        test_result: S(t.test_result),
        final_remarks: S(t.final_remarks || t.details || ''),
        // readings / errors if relevant in your SmartAgainstMeterReportPdfService
        reading_before_test: N(t.reading_before_test),
        reading_after_test: N(t.reading_after_test),
        error_percentage: N(t.error_percentage_import ?? t.error_percentage_export),
      };

      return rowForSmartPdf as any; // cast to SmartRow if you have interface
    };

    const mapAGAINST_OLD_METER = (rec: any) => {
      const t = rec.testing || {};
      const d = rec.device || {};
      return {
        serial_number: S(d.serial_number),
        make: S(d.make),
        capacity: S(d.capacity || d.phase || ''),
        meter_category: S(d.meter_category || ''),
        test_result: S(t.test_result),
        final_remarks: S(t.final_remarks || t.details || ''),
        reading_before_test: N(t.reading_before_test),
        reading_after_test: N(t.reading_after_test),
        error_percentage: N(t.error_percentage_import ?? t.error_percentage_export),
      } as any; // OldAgainstRow
    };

    const mapP4ONM = (rec: any, idx: number) => {
      const t = rec.testing || {};
      const d = rec.device || {};
      return {
        serial: S(d.serial_number || `S${idx + 1}`),
        make: S(d.make),
        capacity: S(d.capacity),
        removal_reading: N(t.meter_removaltime_reading),
        consumer_name: S(d.consumer_name || t.consumer_name),
        account_no_ivrs: S(d.consumer_no || d.consumer_number || ''), // adjust with real key
        address: S(d.location_name || d.location_code || ''),
        p4onm_by: S(t.testing_user || t.tested_by || ''),
        payment_particulars: S(d.payment_remarks || ''),
        receipt_no: S(t.fees_mr_no),
        receipt_date: S(t.fees_mr_date),
        condition_at_removal: S(t.meter_removaltime_metercondition),
        testing_date: S(t.start_datetime).slice(0,10),
        physical_condition_of_device: S(t.physical_condition_of_device),
        is_burned: !!t.is_burned,
        seal_status: S(t.seal_status),
        meter_glass_cover: S(t.meter_glass_cover),
        terminal_block: S(t.terminal_block),
        meter_body: S(t.meter_body),
        // starting_current_test / creep etc can be added if P4ONMReportPdfService expects them
        starting_current_test: S(t.shunt_current_test || t.nutral_current_test),
        creep_test: S(t.shunt_creep_test || t.nutral_creep_test),
        remark: S(t.final_remarks || t.details || ''),
      } as any; // P4ONMReportRow
    };

    const mapP4VIG = (rec: any, idx: number) => {
      const t = rec.testing || {};
      const d = rec.device || {};
      return {
        serial: S(d.serial_number || `S${idx + 1}`),
        make: S(d.make),
        capacity: S(d.capacity),
        reading_before_test: N(t.reading_before_test),
        reading_after_test: N(t.reading_after_test),
        error_percentage: N(
          t.error_percentage ??
          t.error_percentage_import ??
          t.error_percentage_export
        ),
        remark: S(t.final_remarks || t.details || ''),
      } as any; // VigRow
    };

    const mapCT = (rec: any, idx: number) => {
      const t = rec.testing || {};
      const d = rec.device || {};
      return {
        serial: S(d.serial_number || `CT${idx + 1}`),
        make: S(d.make),
        ct_ratio: S(t.ct_ratio || d.ct_ratio),
        ct_class: S(t.ct_class || d.ct_class),
        burden_va: S(t.burden_va || t.burden || ''),
        remark: S(t.final_remarks || t.details || ''),
      } as any; // CtPdfRow
    };

    const mapCONTESTED = (rec: any, idx: number) => {
      const t = rec.testing || {};
      const d = rec.device || {};
      return {
        serial: S(d.serial_number || `S${idx + 1}`),
        make: S(d.make),
        capacity: S(d.capacity),
        testing_date: S(t.start_datetime || t.end_datetime).slice(0,10),
        remark: S(t.final_remarks || t.details || ''),
      } as any; // ContestedReportRow
    };

    const mapSOLAR_GEN = (rec: any) => {
      const t = rec.testing || {};
      const d = rec.device || {};
      return {
        certificate_no: S(t.certificate_number),
        consumer_name: S(t.consumer_name),
        address: S(t.consumer_address),
        meter_make: S(d.make),
        meter_sr_no: S(d.serial_number),
        meter_capacity: S(d.capacity),
        date_of_testing: S(t.start_datetime || t.end_datetime).slice(0,10),

        testing_fees: N(t.testing_fees),
        mr_no: S(t.fees_mr_no),
        mr_date: S(t.fees_mr_date),
        ref_no: S(t.ref_no),

        starting_reading: N(t.reading_before_test),
        final_reading_r: N(t.reading_after_test), // repurpose if you store import/export separately
        final_reading_e: undefined,
        difference: undefined,

        // include the channel details if your PDF supports them:
        shunt_reading_before_test: N(t.shunt_reading_before_test),
        shunt_reading_after_test: N(t.shunt_reading_after_test),
        shunt_ref_start_reading: N(t.shunt_ref_start_reading),
        shunt_ref_end_reading: N(t.shunt_ref_end_reading),
        shunt_error_percentage: N(t.shunt_error_percentage),

        nutral_reading_before_test: N(t.nutral_reading_before_test),
        nutral_reading_after_test: N(t.nutral_reading_after_test),
        nutral_ref_start_reading: N(t.nutral_ref_start_reading),
        nutral_ref_end_reading: N(t.nutral_ref_end_reading),
        nutral_error_percentage: N(t.nutral_error_percentage),

        starting_current_test: S(t.shunt_current_test || t.nutral_current_test),
        creep_test: S(t.shunt_creep_test || t.nutral_creep_test),
        dial_test: S(t.shunt_dail_test || t.nutral_dail_test),

        test_result: S(t.test_result),
        remark: S(t.final_remarks || t.details || '')
      } as any; // GenRow
    };

    const mapSOLAR_NET = (rec: any) => {
      const t = rec.testing || {};
      const d = rec.device || {};

      // this one is richer, but we'll map minimum viable fields first:
      return {
        certificate_no: S(t.certificate_number),
        consumer_name: S(t.consumer_name),
        address: S(t.consumer_address),
        meter_make: S(d.make),
        meter_sr_no: S(d.serial_number),
        meter_capacity: S(d.capacity),
        date_of_testing: S(t.start_datetime || t.end_datetime).slice(0,10),

        testing_fees: N(t.testing_fees),
        mr_no: S(t.fees_mr_no),
        mr_date: S(t.fees_mr_date),
        ref_no: S(t.ref_no),

        starting_reading: N(t.reading_before_test),
        final_reading_r: N(t.reading_after_test),
        final_reading_e: undefined,
        difference: undefined,

        // import/export style fields if you have them in backend in future:
        start_reading_import: N(t.start_reading_import),
        final_reading__import: N(t.final_reading__import),
        difference__import: N(t.difference__import),
        start_reading_export: N(t.start_reading_export),
        final_reading_export: N(t.final_reading_export),
        difference_export: N(t.difference_export),
        final_Meter_Difference: N(t.final_Meter_Difference),

        import_ref_start_reading: N(t.import_ref_start_reading),
        import_ref_end_reading: N(t.import_ref_end_reading),
        export_ref_start_reading: N(t.export_ref_start_reading),
        export_ref_end_reading: N(t.export_ref_end_reading),
        error_percentage_import: N(t.error_percentage_import),
        error_percentage_export: N(t.error_percentage_export),

        shunt_reading_before_test: N(t.shunt_reading_before_test),
        shunt_reading_after_test: N(t.shunt_reading_after_test),
        shunt_ref_start_reading: N(t.shunt_ref_start_reading),
        shunt_ref_end_reading: N(t.shunt_ref_end_reading),
        shunt_error_percentage: N(t.shunt_error_percentage),

        nutral_reading_before_test: N(t.nutral_reading_before_test),
        nutral_reading_after_test: N(t.nutral_reading_after_test),
        nutral_ref_start_reading: N(t.nutral_ref_start_reading),
        nutral_ref_end_reading: N(t.nutral_ref_end_reading),
        nutral_error_percentage: N(t.nutral_error_percentage),

        starting_current_test: S(t.shunt_current_test || t.nutral_current_test),
        creep_test: S(t.shunt_creep_test || t.nutral_creep_test),
        dial_test: S(t.shunt_dail_test || t.nutral_dail_test),

        remark: S(t.final_remarks || t.details || ''),
        test_result: S(t.test_result)
      } as any; // SolarRow
    };

    const mapSTOP_DEF = (rec: any) => {
      const t = rec.testing || {};
      const d = rec.device || {};
      return {
        serial_number: S(d.serial_number),
        make: S(d.make),
        capacity: S(d.capacity || d.phase || ''),
        physical_condition_of_device: S(t.physical_condition_of_device),
        seal_status: S(t.seal_status),
        meter_body: S(t.meter_body),
        meter_glass_cover: S(t.meter_glass_cover),
        terminal_block: S(t.terminal_block),
        is_burned: !!t.is_burned,
        remark: S(t.final_remarks || t.details || ''),
      } as any; // StopDefRow
    };

    // 4. Build header+rows specifically for each report_type, then call the right PDF service
    switch (rtype) {

      case 'SMART_AGAINST_METER': {
        const headerForSmart = {
          date: commonHeaderBase.date,
          zone: commonHeaderBase.location_code + ' - ' + commonHeaderBase.location_name,
          testing_bench: commonHeaderBase.testing_bench,
          testing_user: commonHeaderBase.testing_user,
          approving_user: commonHeaderBase.approving_user,
          testMethod: commonHeaderBase.testMethod,
          testStatus: commonHeaderBase.testStatus,
          lab_name: commonHeaderBase.lab_name,
          lab_address: commonHeaderBase.lab_address,
          lab_email: commonHeaderBase.lab_email,
          lab_phone: commonHeaderBase.lab_phone,
          leftLogoUrl: commonHeaderBase.leftLogoUrl,
          rightLogoUrl: commonHeaderBase.rightLogoUrl,
          // add any other fields SmartAgainstMeterReportPdfService expects in its Meta
        } as any; // SmartMeta

        const smartRows = rowsRaw.map(mapSMART_AGAINST_METER);
        await this.smartmeterPdf.download(smartRows, headerForSmart, {
          leftLogoUrl: headerForSmart.leftLogoUrl,
          rightLogoUrl: headerForSmart.rightLogoUrl
        } as any);
        break;
      }

      case 'AGAINST_OLD_METER': {
        const headerForOld = {
          date: commonHeaderBase.date,
          zone: commonHeaderBase.location_code + ' - ' + commonHeaderBase.location_name,
          testing_bench: commonHeaderBase.testing_bench,
          testing_user: commonHeaderBase.testing_user,
          approving_user: commonHeaderBase.approving_user,
          testMethod: commonHeaderBase.testMethod,
          testStatus: commonHeaderBase.testStatus,
          lab_name: commonHeaderBase.lab_name,
          lab_address: commonHeaderBase.lab_address,
          lab_email: commonHeaderBase.lab_email,
          lab_phone: commonHeaderBase.lab_phone,
          leftLogoUrl: commonHeaderBase.leftLogoUrl,
          rightLogoUrl: commonHeaderBase.rightLogoUrl,
        } as any; // OldAgainstMeta

        const oldRows = rowsRaw.map(mapAGAINST_OLD_METER);
        await this.oldmeterPdf.download(oldRows, headerForOld, {
          leftLogoUrl: headerForOld.leftLogoUrl,
          rightLogoUrl: headerForOld.rightLogoUrl
        } as any);
        break;
      }

      case 'ONM_CHECKING': {
        const headerForOnm = {
          date: commonHeaderBase.date,
          zone: commonHeaderBase.location_code + ' - ' + commonHeaderBase.location_name,
          testing_bench: commonHeaderBase.testing_bench,
          testing_user: commonHeaderBase.testing_user,
          approving_user: commonHeaderBase.approving_user,
          lab_name: commonHeaderBase.lab_name,
          lab_address: commonHeaderBase.lab_address,
          lab_email: commonHeaderBase.lab_email,
          lab_phone: commonHeaderBase.lab_phone,
          leftLogoUrl: commonHeaderBase.leftLogoUrl,
          rightLogoUrl: commonHeaderBase.rightLogoUrl,
        } as any as P4ONMReportHeader;

        const onmRows = rowsRaw.map(mapP4ONM);
        await this.p4onmPdf.downloadFromBatch(headerForOnm, onmRows, {
          fileName: `P4_ONM_${headerForOnm.date}_${rid}.pdf`
        });
        break;
      }

      case 'VIGILENCE_CHECKING': {
        const headerForVig = {
          date: commonHeaderBase.date,
          zone: commonHeaderBase.location_code + ' - ' + commonHeaderBase.location_name,
          testing_bench: commonHeaderBase.testing_bench,
          testing_user: commonHeaderBase.testing_user,
          approving_user: commonHeaderBase.approving_user,
          lab_name: commonHeaderBase.lab_name,
          lab_address: commonHeaderBase.lab_address,
          lab_email: commonHeaderBase.lab_email,
          lab_phone: commonHeaderBase.lab_phone,
          leftLogoUrl: commonHeaderBase.leftLogoUrl,
          rightLogoUrl: commonHeaderBase.rightLogoUrl,
        } as any as VigHeader;

        const vigRows = rowsRaw.map(mapP4VIG);
        await this.p4vigPdf.download(headerForVig, vigRows);
        break;
      }

      case 'CT_TESTING': {
        const headerForCt = {
          date: commonHeaderBase.date,
          testing_bench: commonHeaderBase.testing_bench,
          testing_user: commonHeaderBase.testing_user,
          approving_user: commonHeaderBase.approving_user,
          lab_name: commonHeaderBase.lab_name,
          lab_address: commonHeaderBase.lab_address,
          lab_email: commonHeaderBase.lab_email,
          lab_phone: commonHeaderBase.lab_phone,
          leftLogoUrl: commonHeaderBase.leftLogoUrl,
          rightLogoUrl: commonHeaderBase.rightLogoUrl,
        } as any as CtHeader;

        const ctRows = rowsRaw.map(mapCT);
        await this.ctPdf.download(headerForCt, ctRows);
        break;
      }

      case 'CONTESTED': {
        const headerForContested = {
          date: commonHeaderBase.date,
          testing_bench: commonHeaderBase.testing_bench,
          testing_user: commonHeaderBase.testing_user,
          approving_user: commonHeaderBase.approving_user,
          lab_name: commonHeaderBase.lab_name,
          lab_address: commonHeaderBase.lab_address,
          lab_email: commonHeaderBase.lab_email,
          lab_phone: commonHeaderBase.lab_phone,
          leftLogoUrl: commonHeaderBase.leftLogoUrl,
          rightLogoUrl: commonHeaderBase.rightLogoUrl,
        } as any as ContestedReportHeader;

        const contRows = rowsRaw.map(mapCONTESTED);
        await this.contestedPdf.downloadFromBatch(headerForContested, contRows, {
          fileName: `Contested_${headerForContested.date}_${rid}.pdf`
        });
        break;
      }

      case 'SOLAR_GENERATION_METER': {
        const headerForSolarGen = {
          location_code: commonHeaderBase.location_code,
          location_name: commonHeaderBase.location_name,
          testMethod: commonHeaderBase.testMethod,
          testStatus: commonHeaderBase.testStatus,
          testing_bench: commonHeaderBase.testing_bench,
          testing_user: commonHeaderBase.testing_user,
          date: commonHeaderBase.date,
          lab_name: commonHeaderBase.lab_name,
          lab_address: commonHeaderBase.lab_address,
          lab_email: commonHeaderBase.lab_email,
          lab_phone: commonHeaderBase.lab_phone,
          leftLogoUrl: commonHeaderBase.leftLogoUrl,
          rightLogoUrl: commonHeaderBase.rightLogoUrl,
        } as GenHeader;

        const genRows = rowsRaw.map(mapSOLAR_GEN);
        await this.solarGenPdf.download(headerForSolarGen, genRows, `SOLAR_GENERATION_${rid}.pdf`);
        break;
      }

      case 'SOLAR_NETMETER': {
        const headerForSolarNet = {
          location_code: commonHeaderBase.location_code,
          location_name: commonHeaderBase.location_name,
          testMethod: commonHeaderBase.testMethod,
          testStatus: commonHeaderBase.testStatus,
          testing_bench: commonHeaderBase.testing_bench,
          testing_user: commonHeaderBase.testing_user,
          date: commonHeaderBase.date,
          lab_name: commonHeaderBase.lab_name,
          lab_address: commonHeaderBase.lab_address,
          lab_email: commonHeaderBase.lab_email,
          lab_phone: commonHeaderBase.lab_phone,
          leftLogoUrl: commonHeaderBase.leftLogoUrl,
          rightLogoUrl: commonHeaderBase.rightLogoUrl,
        } as SolarHeader;

        const netRows = rowsRaw.map(mapSOLAR_NET);
        await this.solarNetPdf.download(headerForSolarNet, netRows, `SOLAR_NETMETER_${rid}.pdf`);
        break;
      }

      case 'STOP_DEFECTIVE': {
        const headerForStopDef = {
          date: commonHeaderBase.date,
          zone: commonHeaderBase.location_code + ' - ' + commonHeaderBase.location_name,
          testing_bench: commonHeaderBase.testing_bench,
          testing_user: commonHeaderBase.testing_user,
          approving_user: commonHeaderBase.approving_user,
          lab: {
            lab_name: commonHeaderBase.lab_name,
            address_line: commonHeaderBase.lab_address,
            email: commonHeaderBase.lab_email,
            phone: commonHeaderBase.lab_phone,
          }
        } as StopDefMeta;

        const stopRows = rowsRaw.map(mapSTOP_DEF);
        await this.stopDefPdf.download(stopRows, headerForStopDef, {
          leftLogoUrl: commonHeaderBase.leftLogoUrl,
          rightLogoUrl: commonHeaderBase.rightLogoUrl
        } as any);
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


  /**
   * Build header for each PDF service, using known common fields.
   * Returns the object to pass as the "header" argument to that PDF service.
   */
  private buildHeaderForPdf(
    reportType: string,
    chunk: any,
    devices: any[],
    report_id: string
  ): any {
    const str = (v:any)=> (v === null || v === undefined) ? '' : String(v);

    const hdrSource = chunk?.header ?? chunk?.meta ?? chunk?.info ?? chunk ?? {};
    const first = devices[0] || {};

    const guessedDate =
      hdrSource.date ||
      hdrSource.tested_date ||
      first.testing_date ||
      first.tested_date ||
      new Date().toISOString().slice(0,10);

    const base = {
      date: str(guessedDate).slice(0,10),
      phase: str(hdrSource.phase ?? hdrSource.meter_category ?? ''),
      zone: str(hdrSource.zone ?? hdrSource.location_zone ?? hdrSource.zone_name ?? ''),
      location_code: str(hdrSource.location_code ?? hdrSource.loc_code ?? first.location_code ?? ''),
      location_name: str(hdrSource.location_name ?? hdrSource.loc_name ?? first.location_name ?? ''),
      testing_bench: str(hdrSource.testing_bench ?? hdrSource.bench ?? first.testing_bench ?? ''),
      testing_user: str(
        hdrSource.testing_user ?? hdrSource.tested_by ?? hdrSource.testing_by ??
        first.testing_user ?? first.tested_by ?? ''
      ),
      approving_user: str(hdrSource.approving_user ?? hdrSource.approved_by ?? ''),
      lab_name: str(hdrSource.lab_name ?? chunk.lab_name ?? ''),
      lab_address: str(hdrSource.lab_address ?? chunk.lab_address ?? ''),
      lab_email: str(hdrSource.lab_email ?? chunk.lab_email ?? ''),
      lab_phone: str(hdrSource.lab_phone ?? chunk.lab_phone ?? ''),
      leftLogoUrl: hdrSource.leftLogoUrl ?? hdrSource.left_logo_url ?? hdrSource.left_logo ?? chunk.left_logo_url,
      rightLogoUrl: hdrSource.rightLogoUrl ?? hdrSource.right_logo_url ?? hdrSource.right_logo ?? chunk.right_logo_url,
      testerName: str(hdrSource.testerName ?? hdrSource.tester_name ?? first.testerName ?? ''),
      report_id: report_id
    };

    // If any report type needs a stricter header model (like GenHeader vs VigHeader),
    // you can "shape" base here with a switch. For now we return base as-is
    // because your services mostly accept compatible objects.

    return base;
  }

  /**
   * Take raw "devices" from API and transform into the row array the
   * PDF service expects (per reportType).
   */
  private buildRowsForPdf(
    reportType: string,
    devices: any[],
    fallbackDate: string
  ): any[] {
    const s = (v:any)=> (v === null || v === undefined) ? '' : String(v);
    const n = (v:any)=> {
      if (v === null || v === undefined || v === '') return undefined;
      const num = Number(v);
      return Number.isFinite(num) ? num : undefined;
    };
    const yesNo = (v:any)=> !!v;

    switch (reportType) {
      case 'ONM_CHECKING': {
        // P4ONMReportRow[]
        return devices.map((d:any, idx:number): P4ONMReportRow => ({
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
          testing_date: s(d.testing_date || d.tested_date || fallbackDate),
          physical_condition_of_device: s(d.physical_condition_of_device || d.physical_condition),
          is_burned: yesNo(d.is_burned || d.burnt || d.found_burnt),
          seal_status: s(d.seal_status || d.body_seal),
          meter_glass_cover: s(d.meter_glass_cover || d.glass_cover),
          terminal_block: s(d.terminal_block || d.terminal),
          meter_body: s(d.meter_body || d.body),
        }));
      }

      case 'VIGILENCE_CHECKING': {
        // VigRow[]
        return devices.map((d:any, idx:number): VigRow => ({
          serial: s(d.serial || d.serial_number || d.meter_no || d.sn || `S${idx+1}`),
          make: s(d.make || d.manufacturer),
          capacity: s(d.capacity || d.kva),
          reading_before_test: n(d.reading_before_test ?? d.before_test ?? d.reading_before),
          reading_after_test: n(d.reading_after_test ?? d.after_test ?? d.reading_after),
          error_percentage: n(d.error_percentage ?? d.ratio_error_pct ?? d.error_pct),
          remark: s(d.remark || d.remarks || d.observation),
          ...(d as any)
        }));
      }

      case 'AGAINST_OLD_METER': {
        // OldAgainstRow[] (similar to VigRow)
        return devices.map((d:any, idx:number): OldAgainstRow => ({
          serial: s(d.serial || d.serial_number || d.meter_no || d.sn || `S${idx+1}`),
          make: s(d.make || d.manufacturer),
          capacity: s(d.capacity || d.kva),
          reading_before_test: n(d.reading_before_test ?? d.before_test ?? d.reading_before),
          reading_after_test: n(d.reading_after_test ?? d.after_test ?? d.reading_after),
          error_percentage: n(d.error_percentage ?? d.ratio_error_pct ?? d.error_pct),
          remark: s(d.remark || d.remarks || d.observation),
          ...(d as any)
        }));
      }

      case 'SMART_AGAINST_METER': {
        // SmartRow[]
        return devices.map((d:any, idx:number): SmartRow => ({
          serial: s(d.serial || d.serial_number || d.meter_no || d.sn || `S${idx+1}`),
          make: s(d.make || d.manufacturer),
          capacity: s(d.capacity || d.kva),
          reading_before_test: n(d.reading_before_test ?? d.before_test ?? d.reading_before),
          reading_after_test: n(d.reading_after_test ?? d.after_test ?? d.reading_after),
          error_percentage: n(d.error_percentage ?? d.ratio_error_pct ?? d.error_pct),
          remark: s(d.remark || d.remarks || d.observation),
          ...(d as any)
        }));
      }

      case 'CT_TESTING': {
        // CtPdfRow[]
        return devices.map((d:any, idx:number): CtPdfRow => ({
          serial: s(d.serial || d.ct_sn || d.device_sn || `CT${idx+1}`),
          make: s(d.make || d.manufacturer),
          ct_ratio: s(d.ct_ratio || d.ratio || d.ctRatio),
          ct_class: s(d.ct_class || d.class),
          burden_va: s(d.burden_va ?? d.burden),
          remark: s(d.remark || d.remarks),
          ...(d as any)
        }));
      }

      case 'CONTESTED': {
        // ContestedReportRow[]
        return devices.map((d:any, idx:number): ContestedReportRow => ({
          serial: s(d.serial || d.serial_number || d.meter_no || `S${idx+1}`),
          make: s(d.make || d.manufacturer),
          capacity: s(d.capacity || d.kva),
          testing_date: s(d.testing_date || d.tested_date || fallbackDate),
          remark: s(d.remark || d.remarks || d.observation),
          ...(d as any)
        }));
      }

      case 'SOLAR_GENERATION_METER': {
        // GenRow[]
        return devices.map((d:any): GenRow => ({
          certificate_no: d.certificate_no ?? d.certificate_number ?? null,
          consumer_name: d.consumer_name ?? null,
          address: d.consumer_address ?? d.address ?? null,
          meter_make: d.meter_make ?? d.make ?? d.manufacturer ?? null,
          meter_sr_no: d.meter_sr_no ?? d.serial_number ?? d.serial ?? null,
          meter_capacity: d.meter_capacity ?? d.capacity ?? null,
          date_of_testing: d.date_of_testing ?? d.testing_date ?? d.tested_date ?? fallbackDate ?? null,

          testing_fees:
            d.testing_fees != null && d.testing_fees !== ''
              ? Number(d.testing_fees)
              : null,
          mr_no: d.fees_mr_no ?? d.mr_no ?? null,
          mr_date: d.fees_mr_date ?? d.mr_date ?? null,
          ref_no: d.ref_no ?? null,

          starting_reading: d.starting_reading ?? null,
          final_reading_r: d.final_reading_r ?? null,
          final_reading_e: d.final_reading_e ?? null,
          difference: d.difference ?? null,

          starting_current_test: d.starting_current_test ?? d.shunt_current_test ?? null,
          creep_test: d.creep_test ?? d.shunt_creep_test ?? null,
          dial_test: d.dial_test ?? d.shunt_dail_test ?? null,

          test_result: d.test_result ?? null,
          remark: d.remark ?? d.details ?? null,
        }));
      }

      case 'SOLAR_NETMETER': {
        // SolarRow[]
        return devices.map((d:any): SolarRow => ({
          certificate_no: d.certificate_no ?? d.certificate_number ?? null,
          consumer_name: d.consumer_name ?? null,
          address: d.consumer_address ?? d.address ?? null,
          meter_make: d.meter_make ?? d.make ?? d.manufacturer ?? null,
          meter_sr_no: d.meter_sr_no ?? d.serial_number ?? d.serial ?? null,
          meter_capacity: d.meter_capacity ?? d.capacity ?? null,
          date_of_testing: d.date_of_testing ?? d.testing_date ?? d.tested_date ?? fallbackDate ?? null,

          testing_fees: d.testing_fees != null ? Number(d.testing_fees) : null,
          mr_no: d.fees_mr_no ?? d.mr_no ?? null,
          mr_date: d.fees_mr_date ?? d.mr_date ?? null,
          ref_no: d.ref_no ?? null,

          start_reading_import: d.start_reading_import ?? null,
          final_reading__import: d.final_reading__import ?? null,
          difference__import: d.difference__import ?? null,
          import_ref_start_reading: d.import_ref_start_reading ?? null,
          import_ref_end_reading: d.import_ref_end_reading ?? null,
          error_percentage_import: d.error_percentage_import ?? null,

          start_reading_export: d.start_reading_export ?? null,
          final_reading_export: d.final_reading_export ?? null,
          difference_export: d.difference_export ?? null,
          export_ref_start_reading: d.export_ref_start_reading ?? null,
          export_ref_end_reading: d.export_ref_end_reading ?? null,
          error_percentage_export: d.error_percentage_export ?? null,

          final_Meter_Difference: d.final_Meter_Difference ?? null,

          shunt_reading_before_test: d.shunt_reading_before_test ?? null,
          shunt_reading_after_test: d.shunt_reading_after_test ?? null,
          shunt_ref_start_reading: d.shunt_ref_start_reading ?? null,
          shunt_ref_end_reading: d.shunt_ref_end_reading ?? null,
          shunt_error_percentage: d.shunt_error_percentage ?? null,

          nutral_reading_before_test: d.nutral_reading_before_test ?? null,
          nutral_reading_after_test: d.nutral_reading_after_test ?? null,
          nutral_ref_start_reading: d.nutral_ref_start_reading ?? null,
          nutral_ref_end_reading: d.nutral_ref_end_reading ?? null,
          nutral_error_percentage: d.nutral_error_percentage ?? null,

          starting_current_test: d.starting_current_test ?? d.shunt_current_test ?? null,
          creep_test: d.creep_test ?? d.shunt_creep_test ?? null,
          dial_test: d.dial_test ?? d.shunt_dail_test ?? null,

          remark: d.remark ?? d.details ?? d.final_remarks ?? null,
          final_remark: d.final_remarks ?? null,
          test_result: d.test_result ?? null
        }));
      }

      case 'STOP_DEFECTIVE': {
        // StopDefRow[]
        return devices.map((d:any, idx:number): StopDefRow => ({
          serial: s(d.serial || d.serial_number || `S${idx+1}`),
          make: s(d.make || d.manufacturer),
          condition: s(d.condition || d.status || d.defect_description),
          remark: s(d.remark || d.remarks),
          ...(d as any)
        }));
      }

      default: {
        console.warn('Unsupported reportType for row mapping:', reportType);
        return [];
      }
    }
  }

  /**
   * Dispatch to the proper PDF service (download) for a given type.
   */
  private async generatePdfForType(
    reportType: string,
    headerObj: any,
    rowsObj: any[]
  ): Promise<void> {

    switch (reportType) {
      case 'ONM_CHECKING':
        // P4ONMReportPdfService
        return this.p4onmPdf.downloadFromBatch(
          headerObj as P4ONMReportHeader,
          rowsObj as P4ONMReportRow[],
          { fileName: `P4_ONM_${headerObj.date}_${headerObj.report_id}.pdf` }
        );

      case 'VIGILENCE_CHECKING':
        // P4VigReportPdfService
        return this.p4vigPdf.download(
          headerObj as VigHeader,
          rowsObj as VigRow[]
        );

      case 'AGAINST_OLD_METER':
        // OldAgainstMeterReportPdfService
        return this.oldmeterPdf.download(
          rowsObj as OldAgainstRow[],
          headerObj as OldAgainstMeta,
          /* logos */ undefined as unknown as PdfLogos
        );

      case 'SMART_AGAINST_METER':
        // SmartAgainstMeterReportPdfService
        return this.smartmeterPdf.download(
          rowsObj as SmartRow[],
          headerObj as SmartMeta,
          /* logos */ undefined as unknown as PdfLogos
        );

      case 'SOLAR_GENERATION_METER':
        // SolarGenMeterCertificatePdfService
        return this.solarGenPdf.download(
          headerObj as GenHeader,
          rowsObj as GenRow[],
          `SOLAR_GENERATIONMETER_${headerObj.date || 'report'}.pdf`
        );

      case 'SOLAR_NETMETER':
        // SolarNetMeterCertificatePdfService
        return this.solarNetPdf.download(
          headerObj as SolarHeader,
          rowsObj as SolarRow[],
          `SOLAR_NETMETER_${headerObj.date || 'report'}.pdf`
        );

      case 'CT_TESTING':
        // CtReportPdfService
        return this.ctPdf.download(
          headerObj as CtHeader,
          rowsObj as CtPdfRow[]
        );

      case 'CONTESTED':
        // ContestedReportPdfService
        return this.contestedPdf.downloadFromBatch(
          headerObj as ContestedReportHeader,
          rowsObj as ContestedReportRow[],
          { fileName: `CONTESTED_${headerObj.date}_${headerObj.report_id}.pdf` }
        );

      case 'STOP_DEFECTIVE':
        // StopDefectiveReportPdfService
        return this.stopDefPdf.download(
          rowsObj as StopDefRow[],
          headerObj as StopDefMeta
        );

      default:
        console.error('No PDF generator registered for', reportType);
        alert(`Unsupported report type: ${reportType}`);
        return;
    }
  }

  // ========= filter / pagination =========

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

  private buildPageWindow(current: number, total: number, radius = 1): Array<number|'…'> {
    const set = new Set<number>();
    const add = (n: number) => { if (n >= 1 && n <= total) set.add(n); };

    add(1); add(total);
    for (let d = -radius; d <= radius; d++) add(current + d);
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

  // ========= detail / csv =========

  openDetails(r: TestReport): void {
    this.selected = r;
  }

  exportCSV(): void {
    const headers = [
      'id','tested_date','device_type','report_type','serial_number','make','result','inward_no',
      'meter_category','phase','meter_type','ct_class','ct_ratio','burden_va',
      'observation','cause','site','load_kw','inspection_ref','solar_kwp','inverter_make','grid_voltage',
      'magnetization_test','ratio_error_pct','phase_angle_min','tested_by','remarks'
    ];

    const val = (r: any, k: string) =>
      (r?.[k] ?? r?.testing?.[k] ?? r?.device?.[k] ?? '');

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
