import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { firstValueFrom } from 'rxjs';
import { ApiServicesService } from 'src/app/services/api-services.service';

import { ContestedReportPdfService, ContestedReportRow, ContestedReportHeader } from 'src/app/shared/contested-report-pdf.service';
import { CtReportPdfService, CtPdfRow, CtHeader } from 'src/app/shared/ct-report-pdf.service';
import { NewMeterReportPdfService, NewMeterRow } from 'src/app/shared/newmeter-report-pdf.service';
import { OldAgainstMeterReportPdfService, OldAgainstRow, OldAgainstMeta } from 'src/app/shared/oldagainstmeter-report-pdf.service';
import { P4onmReportPdfService, P4ONMReportRow, P4ONMReportHeader } from 'src/app/shared/p4onm-report-pdf.service';
import { P4VigReportPdfService, VigRow, VigHeader } from 'src/app/shared/p4vig-report-pdf.service';
import { PqMeterReportPdfService } from 'src/app/shared/pqmeter-report-pdf.service';
import { SampleMeterReportPdfService } from 'src/app/shared/samplemeter-report-pdf.service';
import { SmartAgainstMeterReportPdfService, SmartRow, SmartMeta } from 'src/app/shared/smartagainstmeter-report-pdf.service';
import { SolarGenMeterCertificatePdfService, GenRow, GenHeader } from 'src/app/shared/solargenmeter-certificate-pdf.service';
import { SolarNetMeterCertificatePdfService, SolarRow, SolarHeader } from 'src/app/shared/solarnetmeter-certificate-pdf.service';
import { StopDefectiveReportPdfService, StopDefRow, StopDefMeta } from 'src/app/shared/stopdefective-report-pdf.service';

(pdfMake as any).vfs = pdfFonts.vfs;

type DeviceType = any;
type ReportType = any;
type TestReport = any;
type User = any;

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
    private newPdf: NewMeterReportPdfService,
    private samplePdf: SampleMeterReportPdfService,
    private pqPdf: PqMeterReportPdfService,

  ) {}

  // Filters & data
  reportTypes: ReportType[] = [];
  filters = {
    from: '',
    to: '',
    report_type: '' as '' | ReportType,
  };

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

  // ui state
  loading = false;
  error: string | null = null;

  selected: TestReport | null = null;
  lab : any = null;

  // ===== NEW: cache for usernames =====
  private userNameCache = new Map<number, string>();

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

  // ===== UPDATED: cached username lookup =====
  async getUserNameById(id: number): Promise<string> {
    if (!id && id !== 0) return '';
    if (this.userNameCache.has(id)) return this.userNameCache.get(id)!;

    try {
      const user = await firstValueFrom(this.api.getUser(id));
      const name = user?.name ?? '';
      this.userNameCache.set(id, name);
      return name;
    } catch (err) {
      console.error(err);
      return '';
    }
  }

  // ===== NEW: helper to fetch rows for a report_id =====
  private async fetchReportBatchRows(report_id: string): Promise<Array<{
    testing: any;
    device?: any;
    assignment?: any;
    lab?: any;
    user?: any;
    testing_bench?: any;
  }>> {
    const apiResp: any = await new Promise((resolve, reject) =>
      this.api.getDevicesByReportId(report_id).subscribe({
        next: resolve,
        error: reject
      })
    );

    return Array.isArray(apiResp) ? apiResp : [];
  }

  // ========= date helpers =========
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

    if (!hasFrom && !hasTo) {
      return this.currentMonthRange();
    }

    let from = this.filters.from;
    let to = this.filters.to;

    if (hasFrom && !hasTo) {
      to = this.fmt(new Date());
    } else if (!hasFrom && hasTo) {
      const t = new Date(this.filters.to);
      from = this.fmt(new Date(t.getFullYear(), t.getMonth(), 1));
    }

    if (from && to && new Date(from) > new Date(to)) {
      [from, to] = [to!, from!];
    }

    return { from: from!, to: to! };
  }

  // ========= data fetch =========
  onSearchChanged(): void {
    this.fetchFromServer(true);
  }

  private fetchFromServer(resetPage = false): void {
    if (resetPage) this.page = 1;

    this.loading = true;
    this.error = null;

    const { from, to } = this.resolveDateRange();

    this.api.getTestingRecords(
      this.search_serial,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
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

  // Download ALL unique (report_id + report_type) from filtered list
  async downloadAllFilteredReports(): Promise<void> {
    if (this.loading) return;

    const uniq = new Map<string, { report_id: string; report_type: string }>();

    for (const r of this.filtered || []) {
      const rid = (r?.report_id ?? r?.testing?.report_id ?? '').toString().trim();
      const rtype = (r?.report_type ?? r?.testing?.report_type ?? '').toString().trim();
      if (!rid || !rtype) continue;

      const key = `${rid}__${rtype}`;
      if (!uniq.has(key)) uniq.set(key, { report_id: rid, report_type: rtype });
    }

    const list = Array.from(uniq.values());
    if (!list.length) {
      alert('No reports found to download (report_id/report_type missing).');
      return;
    }

    this.loading = true;
    let ok = 0;
    let fail = 0;

    try {
      for (const item of list) {
        try {
          await this.downloadTestreports_byreportidwithReportTypes(item.report_id, item.report_type);
          ok++;
        } catch (e) {
          console.error('Download failed', item, e);
          fail++;
        }
      }
      alert(`Download completed.\nSuccess: ${ok}\nFailed: ${fail}`);
    } finally {
      this.loading = false;
    }
  }

  // Download unique (report_id + report_type) only from current page rows
  async downloadCurrentPageReports(): Promise<void> {
    if (this.loading) return;

    const uniq = new Map<string, { report_id: string; report_type: string }>();

    for (const r of this.pageRows || []) {
      const rid = (r?.report_id ?? r?.testing?.report_id ?? '').toString().trim();
      const rtype = (r?.report_type ?? r?.testing?.report_type ?? '').toString().trim();
      if (!rid || !rtype) continue;

      const key = `${rid}__${rtype}`;
      if (!uniq.has(key)) uniq.set(key, { report_id: rid, report_type: rtype });
    }

    const list = Array.from(uniq.values());
    if (!list.length) {
      alert('No reports found on this page to download.');
      return;
    }

    this.loading = true;
    let ok = 0;
    let fail = 0;

    try {
      for (const item of list) {
        try {
          await this.downloadTestreports_byreportidwithReportTypes(item.report_id, item.report_type);
          ok++;
        } catch (e) {
          console.error('Download failed', item, e);
          fail++;
        }
      }
      alert(`Page download completed.\nSuccess: ${ok}\nFailed: ${fail}`);
    } finally {
      this.loading = false;
    }
  }

  // ========= PDF GENERATION FLOW =========
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
      // ===== UPDATED: use helper =====
      const rowsRaw = await this.fetchReportBatchRows(rid);

      if (!rowsRaw.length) {
        alert('No devices found for this report.');
        this.loading = false;
        return;
      }

      const S = (v: any) => (v === null || v === undefined ? '' : String(v));
      const N = (v: any) => {
        if (v === null || v === undefined || v === '') return undefined;
        const num = Number(v);
        return Number.isFinite(num) ? num : undefined;
      };

      // pick first item for header info
      const first = rowsRaw[0];
      const t0 = first.testing || {};
      const d0 = first.device || {};
      const assignment0 = first.assignment || {};
      const lab0 = first.lab || {};
      const bench0 = first.testing_bench || {};

      const phase_name = d0.phase || t0.phase || '';

      const benchName =
        bench0.bench_name ||
        assignment0.bench_name ||
        assignment0.bench?.bench_name ||
        '';

      const testUserName = await this.getUserNameById(assignment0.user_id);
      const approvingUser = await this.getUserNameById(assignment0.assigned_by);

      const testmethod = S(t0.test_method || 'NA').toUpperCase();
      const testStatus = S(t0.test_status || 'NA').toUpperCase();

      const commonHeaderBase = {
        location_code: S(d0.location_code || t0.location_code || ''),
        location_name: S(d0.location_name || t0.location_name || ''),
        date: S(
          t0.start_datetime ||
          t0.testing_date ||
          t0.created_at || ''
        ).slice(0, 10),

        testMethod: S(testmethod || 'NA'),
        phase: S(phase_name || 'NA'),
        testStatus: S(testStatus || 'NA'),
        testing_bench: S(benchName || bench0.id || ''),
        testing_user: S(testUserName || ''),
        approving_user: S(approvingUser || ''),

        lab_name: S(lab0.lab_pdfheader_name || lab0.lab_name || t0.lab_name || ''),
        lab_address: S(lab0.lab_pdfheader_address || lab0.lab_location || t0.lab_address || ''),
        lab_email: S(lab0.lab_pdfheader_email || t0.lab_email || ''),
        lab_phone: S(lab0.lab_pdfheader_contact_no || t0.lab_phone || ''),
        leftLogoUrl: '/assets/icons/wzlogo.png',
        rightLogoUrl: '/assets/icons/wzlogo.png'
      };

      // ======== Row mappers ========

      const mapSMART_AGAINST_METER = (rec: any) => {
        const t = rec.testing || {};
        const d = rec.device || {};
        return {
          serial: S(d.serial_number),
          make: S(d.make),
          capacity: S(d.capacity || d.phase || ''),
          meter_category: S(d.meter_category || ''),
          test_result: S(t.test_result),
          final_remarks: S(t.final_remarks || t.details || ''),
          reading_before_test: N(t.reading_before_test),
          reading_after_test: N(t.reading_after_test),
          error_percentage: N(t.error_percentage_import ?? t.error_percentage_export),
        } as any as SmartRow;
      };

      const mapAGAINST_OLD_METER = (rec: any) => {
        const t = rec.testing || {};
        const d = rec.device || {};
        return {
          serial: S(d.serial_number),
          make: S(d.make),
          capacity: S(d.capacity || d.phase || ''),
          meter_category: S(d.meter_category || ''),
          test_result: S(t.test_result),
          final_remarks: S(t.final_remarks || t.details || ''),
          reading_before_test: N(t.reading_before_test),
          reading_after_test: N(t.reading_after_test),
          error_percentage: N(t.error_percentage_import ?? t.error_percentage_export),
        } as any as OldAgainstRow;
      };


        const mapP4ONM = (rec: any, idx: number): P4ONMReportRow => {
          const t = rec?.testing || {};
          const d = rec?.device || {};
          const u = rec?.user || {};
          const b = rec?.testing_bench || {};

          return {
            // must exist for buildPayload()
            device_id: d.id ?? t.device_id ?? null,
            assignment_id: rec?.assignment?.id ?? t.assignment_id ?? null,
            serial: S(d.serial_number || `S${idx + 1}`),
            make: S(d.make),
            capacity: S(d.capacity),
            consumer_name: S(t.consumer_name),
            address: S(t.consumer_address),
            account_no_ivrs: S(t.ref_no || d.consumer_no || ''),
            payment_particulars: S(t.testing_fees),
            receipt_no: S(t.fees_mr_no),
            receipt_date: t.fees_mr_date ? S(t.fees_mr_date).slice(0, 10) : '',
            removal_reading: N(t.meter_removaltime_reading),
            condition_at_removal: S(t.meter_removaltime_metercondition || t.any_other_remarkny_zone || ''),
            physical_condition_of_device: S(t.physical_condition_of_device),
            seal_status: S(t.seal_status),
            meter_glass_cover: S(t.meter_glass_cover),
            terminal_block: S(t.terminal_block),
            meter_body: S(t.meter_body),
            is_burned: !!t.is_burned,
            shunt_reading_before_test: N(t.shunt_reading_before_test),
            shunt_reading_after_test: N(t.shunt_reading_after_test),
            shunt_ref_start_reading: N(t.shunt_ref_start_reading),
            shunt_ref_end_reading: N(t.shunt_ref_end_reading),
            shunt_error_percentage: N(t.shunt_error_percentage),
            shunt_current_test: S(t.shunt_current_test),
            shunt_creep_test: S(t.shunt_creep_test),
            shunt_dail_test: S(t.shunt_dail_test),
            nutral_reading_before_test: N(t.nutral_reading_before_test),
            nutral_reading_after_test: N(t.nutral_reading_after_test),
            nutral_ref_start_reading: N(t.nutral_ref_start_reading),
            nutral_ref_end_reading: N(t.nutral_ref_end_reading),
            nutral_error_percentage: N(t.nutral_error_percentage),
            nutral_current_test: S(t.nutral_current_test),
            nutral_creep_test: S(t.nutral_creep_test),
            nutral_dail_test: S(t.nutral_dail_test),
            error_percentage_import: N(t.error_percentage_import),
            test_result: S(t.test_result),
            remark: S(t.details || ''),
            final_remarks: S(t.final_remarks || ''),
            testing_date: S(t.start_datetime || t.end_datetime).slice(0, 10),
            p4onm_by: S(u.name || u.username || ''),
            bench_name: S(b.bench_name || ''),
          } as any as P4ONMReportRow;
        };

        const mapP4VIG = (rec: any, idx: number) => {
          const t = rec?.testing || {};
          const d = rec?.device || {};
          const u = rec?.user || {};
          const a = rec?.assignment || {};

          return {
            // identity
            serial: S(d.serial_number || `S${idx + 1}`),
            make: S(d.make),
            capacity: S(d.capacity),

            device_id: d.id ?? t.device_id ?? null,
            assignment_id: a.id ?? t.assignment_id ?? null,

            // removal / basic
            removal_reading: N(t.meter_removaltime_reading),

            // result + mode
            test_result: S(t.test_result),
            view_mode: 'BOTH', 

            // consumer / seizure info (your response has mostly null, keep safe)
            consumer_name: S(t.consumer_name),
            address: S(t.consumer_address),
            account_number: S(t.ref_no || ''), // best available in your response
            division_zone: S(t.test_requester_name || d.location_name || ''), // ex: "3465205 - AE-Zone..."
            panchanama_no: S(t.p4_no || ''),   // null in response, but keep mapping
            panchanama_date: t.p4_date ? S(t.p4_date).slice(0, 10) : '',
            condition_at_removal: S(t.meter_removaltime_metercondition || t.any_other_remarkny_zone || t.p4_metercodition || ''),

            // physical condition block
            testing_date: S(t.start_datetime || t.end_datetime).slice(0, 10),
            is_burned: !!t.is_burned,
            seal_status: S(t.seal_status),
            meter_glass_cover: S(t.meter_glass_cover),
            terminal_block: S(t.terminal_block),
            meter_body: S(t.meter_body),
            other: t.other ?? null,

            // SHUNT set
            shunt_reading_before_test: N(t.shunt_reading_before_test),
            shunt_reading_after_test: N(t.shunt_reading_after_test),
            shunt_ref_start_reading: N(t.shunt_ref_start_reading),
            shunt_ref_end_reading: N(t.shunt_ref_end_reading),
            shunt_error_percentage: N(t.shunt_error_percentage),
            shunt_current_test: t.shunt_current_test ?? null,
            shunt_creep_test: t.shunt_creep_test ?? null,
            shunt_dail_test: t.shunt_dail_test ?? null,

            // NUTRAL set
            nutral_reading_before_test: N(t.nutral_reading_before_test),
            nutral_reading_after_test: N(t.nutral_reading_after_test),
            nutral_ref_start_reading: N(t.nutral_ref_start_reading),
            nutral_ref_end_reading: N(t.nutral_ref_end_reading),
            nutral_error_percentage: N(t.nutral_error_percentage),
            nutral_current_test: t.nutral_current_test ?? null,
            nutral_creep_test: t.nutral_creep_test ?? null,
            nutral_dail_test: t.nutral_dail_test ?? null,

            // error (PDF uses error_percentage_import sometimes)
            error_percentage_import: N(t.error_percentage_import),
            error_percentage_export: N(t.error_percentage_export),

            // request / misc
            test_requester_name: S(t.test_requester_name || d.location_name || ''),
            meter_removaltime_metercondition: t.meter_removaltime_metercondition ?? null,
            any_other_remarkny_zone: t.any_other_remarkny_zone ?? null,

            // P4-ish
            p4_division: S(t.p4_division || ''),
            p4_no: S(t.p4_no || ''),
            p4_date: t.p4_date ? S(t.p4_date).slice(0, 10) : '',
            p4_metercodition: t.p4_metercodition ?? null,

            // remarks
            final_remarks: S(t.final_remarks || ''),
            remark: S(t.details || ''),

            // (optional) who tested/approved
            tested_by: S(u.name || u.username || ''),
            approver_id: t.approver_id ?? null, 

            
          } as any as VigRow;
        };


      const mapCT = (rec: any, idx: number) => {
  const t = rec.testing || {};
  const d = rec.device || {};
  const det = safeJson(t.details);

  return {
    serial_number: S(pick(d.serial_number, det.serial_number, `CT${idx + 1}`)),
    make: S(pick(d.make, det.make)),
    ct_ratio: S(pick(d.ct_ratio, det.ratio, t.ct_ratio)),
    ct_class: S(pick(t.ct_class, det.city_class, d.ct_class)),
    remark: S(pick(det.remark, t.final_remarks, '')),
  } as CtPdfRow;
};





        const mapCONTESTED = (rec: any, idx: number): ContestedReportRow => {
          const t = rec?.testing ?? {}; // ✅ main testing record
          const d = rec?.device ?? {};  // ✅ device record

          return {
            // Device basics
            serial: S(d.serial_number || `S${idx + 1}`),
            make: S(d.make),
            capacity: S(d.capacity),
            removal_reading: t.meter_removaltime_reading ?? null,   // ✅ from testing

            // Consumer / AE–JE slip fields (all from testing)
            consumer_name: S(t.consumer_name),
            account_no_ivrs: S((t as any).account_no_ivrs), // keep if your backend has it
            address: S(t.consumer_address),
            contested_by: S(t.any_other_remarkny_zone),
            payment_particulars: S(t.testing_fees),
            receipt_no: S(t.fees_mr_no),
            receipt_date: t.fees_mr_date ? S(t.fees_mr_date).slice(0, 10) : undefined,
            condition_at_removal: S(t.meter_removaltime_metercondition),

            // Device condition & meta
            testing_date: S(t.start_datetime || t.end_datetime).slice(0, 10),
            physical_condition_of_device: S(t.physical_condition_of_device),
            is_burned: !!t.is_burned,
            seal_status: S(t.seal_status),
            meter_glass_cover: S(t.meter_glass_cover),
            terminal_block: S(t.terminal_block),
            meter_body: S(t.meter_body),
            other: S(t.other),

            // SHUNT readings
            shunt_reading_before_test: t.shunt_reading_before_test ?? null,
            shunt_reading_after_test: t.shunt_reading_after_test ?? null,
            shunt_ref_start_reading: t.shunt_ref_start_reading ?? null,
            shunt_ref_end_reading: t.shunt_ref_end_reading ?? null,
            shunt_current_test: t.shunt_current_test ?? null,
            shunt_creep_test: t.shunt_creep_test ?? null,
            shunt_dail_test: t.shunt_dail_test ?? null,
            shunt_error_percentage: t.shunt_error_percentage ?? null,

            // NUTRAL readings
            nutral_reading_before_test: t.nutral_reading_before_test ?? null,
            nutral_reading_after_test: t.nutral_reading_after_test ?? null,
            nutral_ref_start_reading: t.nutral_ref_start_reading ?? null,
            nutral_ref_end_reading: t.nutral_ref_end_reading ?? null,
            nutral_current_test: t.nutral_current_test ?? null,
            nutral_creep_test: t.nutral_creep_test ?? null,
            nutral_dail_test: t.nutral_dail_test ?? null,
            nutral_error_percentage: t.nutral_error_percentage ?? null,

            // Combined error
            error_percentage_import: t.error_percentage_import ?? null,

            // Free-form remark
            remark: S(t.final_remarks || t.details || '')
          };
        };



const mapSOLAR_GEN = (rec: any) => {
  const t = rec?.testing || {};
  const d = rec?.device || {};

  return {
    certificate_no: S(t.certificate_number),
    consumer_name: S(t.consumer_name),
    address: S(t.consumer_address),
    meter_make: S(d.make),
    meter_sr_no: S(d.serial_number),
    meter_capacity: S(d.capacity),
    date_of_testing: S(t.start_datetime || t.end_datetime).slice(0, 10),

    testing_fees: t.testing_fees,
    mr_no: S(t.fees_mr_no),
    mr_date: S(t.fees_mr_date),
    ref_no: S(t.ref_no),

    starting_reading: N(t.reading_before_test),
    final_reading_r: N(t.reading_after_test),
    final_reading_e: undefined,
    difference: undefined,

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
    remark: S(t.final_remarks || t.details || ''),
    physical_condition_of_device: S(t.physical_condition_of_device),
    seal_status: S(t.seal_status),
    meter_glass_cover: S(t.meter_glass_cover),
    terminal_block: S(t.terminal_block),
    meter_body: S(t.meter_body),
  } as any as GenRow;
};


  const mapSOLAR_NET = (rec: any) => {
  const t = rec?.testing ?? {};
  const d = rec?.device ?? {};
  const ISO_DATE = (v: any) => S(v).slice(0, 10);

  return {
    // device / consumer
    device_id: t.device_id ?? 0,
    assignment_id: t.assignment_id ?? 0,

    certificate_no: S(t.certificate_number),
    consumer_name: S(t.consumer_name),
    address: S(t.consumer_address),

    meter_make: S(d.make),
    meter_sr_no: S(d.serial_number),
    meter_capacity: S(d.capacity),

    // dates
    date_of_testing: ISO_DATE(t.start_datetime || t.end_datetime),

    // fees (NOTE: in payload you send testing_fees as string; keep string for view/pdf)
    testing_fees: t.testing_fees ?? null,
    mr_no: S(t.fees_mr_no),
    mr_date: S(t.fees_mr_date),
    ref_no: S(t.ref_no),

    // import/export readings (payload exact keys)
    start_reading_import: N(t.start_reading_import),
    final_reading__import: N(t.final_reading__import),
    difference__import: N(t.difference__import),

    start_reading_export: N(t.start_reading_export),
    final_reading_export: N(t.final_reading_export),
    difference_export: N(t.difference_export),

    // ref readings (payload exact keys)
    import_ref_start_reading: N(t.import_ref_start_reading),
    import_ref_end_reading: N(t.import_ref_end_reading),
    export_ref_start_reading: N(t.export_ref_start_reading),
    export_ref_end_reading: N(t.export_ref_end_reading),

    // final diff & errors
    final_Meter_Difference: N(t.final_Meter_Difference),
    error_percentage_import: N(t.error_percentage_import),
    error_percentage_export: N(t.error_percentage_export),

    // SHUNT block (payload exact keys)
    shunt_reading_before_test: N(t.shunt_reading_before_test),
    shunt_reading_after_test: N(t.shunt_reading_after_test),
    shunt_ref_start_reading: N(t.shunt_ref_start_reading),
    shunt_ref_end_reading: N(t.shunt_ref_end_reading),
    shunt_error_percentage: N(t.shunt_error_percentage),

    shunt_current_test: S(t.shunt_current_test),
    shunt_creep_test: S(t.shunt_creep_test),
    shunt_dail_test: S(t.shunt_dail_test),

    // NUTRAL block (payload exact keys)
    nutral_reading_before_test: N(t.nutral_reading_before_test),
    nutral_reading_after_test: N(t.nutral_reading_after_test),
    nutral_ref_start_reading: N(t.nutral_ref_start_reading),
    nutral_ref_end_reading: N(t.nutral_ref_end_reading),
    nutral_error_percentage: N(t.nutral_error_percentage),

    nutral_current_test: S(t.nutral_current_test),
    nutral_creep_test: S(t.nutral_creep_test),
    nutral_dail_test: S(t.nutral_dail_test),

    // for old PDF fields (if your Solar PDF template expects these 3 combined)
    starting_current_test: S(t.shunt_current_test || t.nutral_current_test),
    creep_test: S(t.shunt_creep_test || t.nutral_creep_test),
    dial_test: S(t.shunt_dail_test || t.nutral_dail_test),

    // remarks/result/method/status/requester
    remark: S(t.final_remarks || t.details || ''),
    final_remarks: S(t.final_remarks),
    test_result: S(t.test_result),
    test_method: S(t.test_method),
    test_status: S(t.test_status),
    test_requester_name: S(t.test_requester_name),

    // physical condition fields (if PDF shows these)
    physical_condition_of_device: S(t.physical_condition_of_device),
    seal_status: S(t.seal_status),
    meter_glass_cover: S(t.meter_glass_cover),
    terminal_block: S(t.terminal_block),
    meter_body: S(t.meter_body),
  } as SolarRow;
};


      const mapSTOP_DEF = (rec: any) => {
        const t = rec.testing || {};
        const d = rec.device || {};
        return {
          serial: S(d.serial_number),
          make: S(d.make),
          capacity: S(d.capacity || d.phase || ''),
          physical_condition_of_device: S(t.physical_condition_of_device),
          seal_status: S(t.seal_status),
          meter_body: S(t.meter_body),
          meter_glass_cover: S(t.meter_glass_cover),
          terminal_block: S(t.terminal_block),
          is_burned: !!t.is_burned,
          test_result: S(t.test_result),
          test_method: S(t.test_method),
          test_status: S(t.test_status),

          shunt_reading_before_test: N(t.shunt_reading_before_test),
          shunt_reading_after_test: N(t.shunt_reading_after_test),
          shunt_ref_start_reading: N(t.shunt_ref_start_reading),
          shunt_ref_end_reading: N(t.shunt_ref_end_reading),
          shunt_error_percentage: N(t.shunt_error_percentage),
          shunt_current_test: S(t.shunt_current_test),
          shunt_creep_test: S(t.shunt_creep_test),
          shunt_dail_test: S(t.shunt_dail_test),

          nutral_reading_before_test: N(t.nutral_reading_before_test),
          nutral_reading_after_test: N(t.nutral_reading_after_test),
          nutral_ref_start_reading: N(t.nutral_ref_start_reading),
          nutral_ref_end_reading: N(t.nutral_ref_end_reading),
          nutral_error_percentage: N(t.nutral_error_percentage),
          nutral_current_test: S(t.nutral_current_test),
          nutral_creep_test: S(t.nutral_creep_test),
          nutral_dail_test: S(t.nutral_dail_test),

          testing_fees: S(t.testing_fees),
          fees_mr_no: S(t.fees_mr_no),
          fees_mr_date: S(t.fees_mr_date),
          ref_no: S(t.ref_no),

          consumer_name: S(t.consumer_name),
          consumer_address: S(t.consumer_address),

          meter_removaltime_reading: N(t.meter_removaltime_reading),
          meter_removaltime_metercondition: S(t.meter_removaltime_metercondition),

          remark: S(t.final_remarks || t.details || ''),
        } as any as StopDefRow;
      };

      // NEW
      const mapNEW = (rec: any, idx: number) => {
        const t = rec.testing || {};
        const d = rec.device || {};
        return {
          serial_number: S(d.serial_number),
          make: S(d.make),
          capacity: S(d.capacity || d.phase || ''),
          meter_category: S(d.meter_category || ''),
          phase: S(d.phase || t.phase || ''),
          test_result: S(t.test_result),
          test_method: S(t.test_method),
          test_status: S(t.test_status),
          reading_before_test: N(t.reading_before_test),
          reading_after_test: N(t.reading_after_test),
          error_percentage: N(t.error_percentage ?? t.error_percentage_import ?? t.error_percentage_export),
          remark: S(t.final_remarks || t.details || '')
        } as any as NewMeterRow; 
      };

      const mapSAMPLE = (rec: any, idx: number) => {
        const t = rec.testing || {};
        const d = rec.device || {};
        return {
          serial_number: S(d.serial_number || `S${idx + 1}`),
          make: S(d.make),
          capacity: S(d.capacity || d.phase || ''),
          meter_category: S(d.meter_category || ''),
          phase: S(d.phase || t.phase || ''),
          test_result: S(t.test_result),
          test_method: S(t.test_method),
          test_status: S(t.test_status),
          remark: S(t.final_remarks || t.details || ''),
        } as any ; 
      };

      const mapPQ = (rec: any, idx: number) => {
        const t = rec.testing || {};
        const d = rec.device || {};
        return {
          serial_number: S(d.serial_number || `PQ${idx + 1}`),
          make: S(d.make),
          capacity: S(d.capacity || d.phase || ''),
          meter_category: S(d.meter_category || ''),
          phase: S(d.phase || t.phase || ''),
          voltage: N(t.voltage || d.voltage),
          current: N(t.current || d.current),
          frequency: N(t.frequency || ''),
          pf: N(t.power_factor || t.pf || ''),
          remark: S(t.final_remarks || t.details || ''),
          test_result: S(t.test_result),
        } as any;
      };
  const safeJson = (v: any) => {
      if (!v) return {};
      if (typeof v === 'object') return v; 
      try { return JSON.parse(v); } catch { return {}; }
    };
  const pick = (...vals: any[]) => vals.find(v => v !== null && v !== undefined && String(v).trim() !== '') ?? '';

      // ======== dispatch by report_type ========
      switch (rtype) {

        case 'SMART_AGAINST_METER': {
          const headerForSmart: SmartMeta = {
            date: commonHeaderBase.date,
            zone: commonHeaderBase.location_code + ' - ' + commonHeaderBase.location_name,
            testing_bench: commonHeaderBase.testing_bench,
            testing_user: commonHeaderBase.testing_user,
            approving_user: commonHeaderBase.approving_user,
            testMethod: commonHeaderBase.testMethod,
            testStatus: commonHeaderBase.testStatus,
            phase: commonHeaderBase.phase,
            lab: {
              lab_name: commonHeaderBase.lab_name,
              address_line: commonHeaderBase.lab_address,
              email: commonHeaderBase.lab_email,
              phone: commonHeaderBase.lab_phone,
            },
            leftLogoUrl: commonHeaderBase.leftLogoUrl,
            rightLogoUrl: commonHeaderBase.rightLogoUrl,
          };

          const smartRows = rowsRaw.map(mapSMART_AGAINST_METER);
          await this.smartmeterPdf.download(smartRows, headerForSmart, {
            leftLogoUrl: headerForSmart.leftLogoUrl,
            rightLogoUrl: headerForSmart.rightLogoUrl
          } as any);
          break;
        }
        case 'AGAINST_OLD_METER': {
          const headerForOld: OldAgainstMeta = {
            date: commonHeaderBase.date,
            zone: commonHeaderBase.location_code + ' - ' + commonHeaderBase.location_name,
            testing_bench: commonHeaderBase.testing_bench,
            testing_user: commonHeaderBase.testing_user,
            approving_user: commonHeaderBase.approving_user,
            testMethod: commonHeaderBase.testMethod,
            testStatus: commonHeaderBase.testStatus,
            phase: commonHeaderBase.phase,
            lab: {
              lab_name: commonHeaderBase.lab_name,
              address_line: commonHeaderBase.lab_address,
              email: commonHeaderBase.lab_email,
              phone: commonHeaderBase.lab_phone,
            },
            leftLogoUrl: commonHeaderBase.leftLogoUrl,
            rightLogoUrl: commonHeaderBase.rightLogoUrl,
          };

          const oldRows = rowsRaw.map(mapAGAINST_OLD_METER);
          await this.oldmeterPdf.download(oldRows, headerForOld, {
            leftLogoUrl: headerForOld.leftLogoUrl,
            rightLogoUrl: headerForOld.rightLogoUrl
          } as any);
          break;
        }
        case 'ONM_CHECKING': {
          const headerForOnm: P4ONMReportHeader = {
            date: commonHeaderBase.date,
            zone: commonHeaderBase.location_code + ' - ' + commonHeaderBase.location_name,
            testing_bench: commonHeaderBase.testing_bench,
            testing_user: commonHeaderBase.testing_user,
            approving_user: commonHeaderBase.approving_user,
            phase: commonHeaderBase.phase,
            lab_name: commonHeaderBase.lab_name,
            lab_address: commonHeaderBase.lab_address,
            lab_email: commonHeaderBase.lab_email,
            lab_phone: commonHeaderBase.lab_phone,
            leftLogoUrl: commonHeaderBase.leftLogoUrl,
            rightLogoUrl: commonHeaderBase.rightLogoUrl,
          };

          const onmRows = rowsRaw.map(mapP4ONM);
          await this.p4onmPdf.downloadFromBatch(headerForOnm, onmRows, {
            fileName: `P4_ONM_${headerForOnm.date}_${rid}.pdf`
          });
          break;
        }
        case 'VIGILENCE_CHECKING': {
          const headerForVig: VigHeader = {
            date: commonHeaderBase.date,
            zone: commonHeaderBase.location_code + ' - ' + commonHeaderBase.location_name,
            phase: commonHeaderBase.phase,
            test_method: commonHeaderBase.testMethod,
            test_status: commonHeaderBase.testStatus,
            testing_bench: commonHeaderBase.testing_bench,
            testing_user: commonHeaderBase.testing_user,
            approving_user: commonHeaderBase.approving_user,
            lab_name: commonHeaderBase.lab_name,
            lab_address: commonHeaderBase.lab_address,
            lab_email: commonHeaderBase.lab_email,
            lab_phone: commonHeaderBase.lab_phone,
            leftLogoUrl: commonHeaderBase.leftLogoUrl,
            rightLogoUrl: commonHeaderBase.rightLogoUrl,
          };

          const vigRows = rowsRaw.map(mapP4VIG);
          await this.p4vigPdf.download(headerForVig, vigRows);
          break;
        }
      case 'CT_TESTING': {
  const first = rowsRaw[0] || {};
  const t0 = first.testing || {};
  const d0 = first.device || {};
  const a0 = first.assignment || {};

  const det0 = safeJson(t0.details);

  const headerForCt: CtHeader = {
    location_code: S(pick(d0.location_code, t0.location_code, det0.zone_code)),
    location_name: S(pick(d0.location_name, t0.location_name, det0.zone_dc)),

    consumer_name: S(pick(t0.consumer_name, d0.consumer_name, det0.consumer_name)),
    address: S(pick(t0.consumer_address, d0.consumer_address, det0.address)),

    no_of_ct: S(pick(det0.no_of_ct, rowsRaw.length)),
    city_class: S(pick(t0.ct_class, det0.city_class, d0.ct_class)), // your payload uses ct_class

    ref_no: S(pick(t0.ref_no, det0.ref_no)),
    ct_make: S(pick(det0.ct_make, d0.make)),

    mr_no: S(pick(t0.fees_mr_no, det0.mr_no)),
    mr_date: S(pick(t0.fees_mr_date, det0.mr_date)),
    amount_deposited: S(pick(t0.testing_fees, det0.amount_deposited)),

    date_of_testing: S(pick(t0.start_datetime, t0.created_at, new Date().toISOString())).slice(0, 10),

    // your DB columns are ct_primary_current / ct_secondary_current
    primary_current: S(pick(t0.ct_primary_current, det0.primary_current)),
    secondary_current: S(pick(t0.ct_secondary_current, det0.secondary_current)),

    testMethod: S(pick(commonHeaderBase.testMethod, t0.test_method)),
    testStatus: S(pick(commonHeaderBase.testStatus, t0.test_status)),
    testing_bench: S(pick(commonHeaderBase.testing_bench, a0.bench_name)),
    testing_user: S(pick(commonHeaderBase.testing_user)),
    approving_user: S(pick(commonHeaderBase.approving_user)),
    date: S(pick(commonHeaderBase.date, t0.created_at)).slice(0, 10),

    lab_name: S(commonHeaderBase.lab_name || ''),
    lab_address: S(commonHeaderBase.lab_address || ''),
    lab_email: S(commonHeaderBase.lab_email || ''),
    lab_phone: S(commonHeaderBase.lab_phone || ''),
    leftLogoUrl: commonHeaderBase.leftLogoUrl,
    rightLogoUrl: commonHeaderBase.rightLogoUrl,
  };

  const ctRows = rowsRaw.map(mapCT);

  await this.ctPdf.download(
    headerForCt,
    ctRows,
    `CT_TESTING_${headerForCt.date_of_testing || headerForCt.date}_${rid}.pdf`
  );
  break;
}


        case 'CONTESTED': {
          const headerForContested: ContestedReportHeader = {
            date: commonHeaderBase.date,
            testing_bench: commonHeaderBase.testing_bench,
            testing_user: commonHeaderBase.testing_user,
            zone: commonHeaderBase.location_code + ' - ' + commonHeaderBase.location_name,
            approving_user: commonHeaderBase.approving_user,
            phase: commonHeaderBase.phase,
            lab_name: commonHeaderBase.lab_name,
            lab_address: commonHeaderBase.lab_address,
            lab_email: commonHeaderBase.lab_email,
            lab_phone: commonHeaderBase.lab_phone,
            leftLogoUrl: commonHeaderBase.leftLogoUrl,
            rightLogoUrl: commonHeaderBase.rightLogoUrl,
          };

          const contRows = rowsRaw.map(mapCONTESTED);
          await this.contestedPdf.downloadFromBatch(headerForContested, contRows, {
            fileName: `Contested_${headerForContested.date}_${rid}.pdf`
          });
          break;
        }
        case 'SOLAR_GENERATION_METER': {
          const headerForSolarGen: GenHeader = {
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
          };

          const genRows = rowsRaw.map(mapSOLAR_GEN);
          await this.solarGenPdf.download(headerForSolarGen, genRows, `SOLAR_GENERATION_${rid}.pdf`);
          break;
        }
        case 'SOLAR_NETMETER': {
          const headerForSolarNet: SolarHeader = {
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
          };

          const netRows = rowsRaw.map(mapSOLAR_NET);
          await this.solarNetPdf.download(headerForSolarNet, netRows, `SOLAR_NETMETER_${rid}.pdf`);
          break;
        }
        case 'STOP_DEFECTIVE': {
          const headerForStopDef: StopDefMeta = {
            date: commonHeaderBase.date,
            zone: commonHeaderBase.location_code + ' - ' + commonHeaderBase.location_name,
            testing_bench: commonHeaderBase.testing_bench,
            testing_user: commonHeaderBase.testing_user,
            approving_user: commonHeaderBase.approving_user,
            testMethod: commonHeaderBase.testMethod,
            testStatus: commonHeaderBase.testStatus,
            phase: commonHeaderBase.phase,
            lab: {
              lab_name: commonHeaderBase.lab_name,
              address_line: commonHeaderBase.lab_address,
              email: commonHeaderBase.lab_email,
              phone: commonHeaderBase.lab_phone,
            }
          };

          const stopRows = rowsRaw.map(mapSTOP_DEF);
          await this.stopDefPdf.download(stopRows, headerForStopDef, {
            leftLogoUrl: commonHeaderBase.leftLogoUrl,
            rightLogoUrl: commonHeaderBase.rightLogoUrl
          } as any);
          break;
        }
        case 'NEW': {
          const headerForNew: any = {
            date: commonHeaderBase.date,
            zone: commonHeaderBase.location_code + ' - ' + commonHeaderBase.location_name,
            testing_bench: commonHeaderBase.testing_bench,
            testing_user: commonHeaderBase.testing_user,
            approving_user: commonHeaderBase.approving_user,
            testMethod: commonHeaderBase.testMethod,
            testStatus: commonHeaderBase.testStatus,
            phase: commonHeaderBase.phase,
            lab: {
              lab_name: commonHeaderBase.lab_name,
              address_line: commonHeaderBase.lab_address,
              email: commonHeaderBase.lab_email,
              phone: commonHeaderBase.lab_phone,
            }
          };

          const newRows = rowsRaw.map(mapNEW);
          await this.newPdf.download(newRows, headerForNew, {
            leftLogoUrl: commonHeaderBase.leftLogoUrl,
            rightLogoUrl: commonHeaderBase.rightLogoUrl
          } as any);

          break;
        }
        case 'SAMPLE_TESTING': {
          const headerForSample: any = {
            date: commonHeaderBase.date,
            zone: commonHeaderBase.location_code + ' - ' + commonHeaderBase.location_name,
            testing_bench: commonHeaderBase.testing_bench,
            testing_user: commonHeaderBase.testing_user,
            approving_user: commonHeaderBase.approving_user,
            testMethod: commonHeaderBase.testMethod,
            testStatus: commonHeaderBase.testStatus,
            phase: commonHeaderBase.phase,
            lab: {
              lab_name: commonHeaderBase.lab_name,
              address_line: commonHeaderBase.lab_address,
              email: commonHeaderBase.lab_email,
              phone: commonHeaderBase.lab_phone,
            }
          };

          const sampleRows = rowsRaw.map(mapSAMPLE);
          await this.samplePdf.download(sampleRows, headerForSample, {
            leftLogoUrl: commonHeaderBase.leftLogoUrl,
            rightLogoUrl: commonHeaderBase.rightLogoUrl
          } as any);

          break;
        }
        case 'PQ_METER_TESTING': {
          const headerForPq: any = {
            date: commonHeaderBase.date,
            zone: commonHeaderBase.location_code + ' - ' + commonHeaderBase.location_name,
            testing_bench: commonHeaderBase.testing_bench,
            testing_user: commonHeaderBase.testing_user,
            approving_user: commonHeaderBase.approving_user,
            testMethod: commonHeaderBase.testMethod,
            testStatus: commonHeaderBase.testStatus,
            phase: commonHeaderBase.phase,
            lab: {
              lab_name: commonHeaderBase.lab_name,
              address_line: commonHeaderBase.lab_address,
              email: commonHeaderBase.lab_email,
              phone: commonHeaderBase.lab_phone,
            }
          };

          const pqRows = rowsRaw.map(mapPQ);
          await this.pqPdf.download(pqRows, headerForPq, {
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
