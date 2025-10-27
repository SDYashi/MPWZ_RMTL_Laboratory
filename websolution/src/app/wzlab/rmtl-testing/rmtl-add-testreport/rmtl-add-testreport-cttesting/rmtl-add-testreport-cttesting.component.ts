import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { CtReportPdfService, CtHeader, CtPdfRow } from 'src/app/shared/ct-report-pdf.service';

type Working = 'OK' | 'FAST' | 'SLOW' | 'NOT WORKING';
type CTRatio = '100/5' | '200/5' | '300/5' | '400/5' | '600/5';

interface DeviceLite {
  id: number;
  serial_number: string;
  make?: string;
  capacity?: string;
  location_code?: string | null;
  location_name?: string | null;
  [key: string]: any;
}

interface AssignmentItem {
  id: number;
  device_id: number;
  device?: DeviceLite | null;
  testing_bench?: { bench_name?: string } | null;
  user_assigned?: { name?: string } | null;
  assigned_by_user?: { name?: string } | null;
}

interface CtRow {
  ct_no: string;
  make: string;
  cap: string;
  ratio: string;
  polarity: string;
  remark: string;
  working?: Working;
  assignment_id?: number;
  device_id?: number;
  notFound?: boolean;
}

interface ModalState {
  open: boolean;
  title: string;
  message: string;
  action: 'clear' | 'submit' | null;
  payload?: any;
}

@Component({
  selector: 'app-rmtl-add-testreport-cttesting',
  templateUrl: './rmtl-add-testreport-cttesting.component.html',
  styleUrls: ['./rmtl-add-testreport-cttesting.component.css']
})
export class RmtlAddTestreportCttestingComponent implements OnInit {

  header = {
    location_code: '',
    location_name: '',
    consumer_name: '',
    address: '',
    no_of_ct: '',
    city_class: '',
    ref_no: '',
    ct_make: '',
    mr_no: '',
    mr_date: '',
    amount_deposited: '',
    date_of_testing: '',
    primary_current: '',
    secondary_current: '',
    testing_user: '',
    approving_user: '',
    testing_bench: ''
  };

  testing_bench: any = '';
  testing_user: any = '';
  approving_user: any = '';

  pdf_date: string = '';

  lab_name: string = '';
  lab_address: string = '';
  lab_email: string = '';
  lab_phone: string = '';

  test_methods: any[] = [];
  test_statuses: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;
  test_results: any[] = [];
  office_types: any;
  commentby_testers: any;
  makes: any;
  ct_classes: any;

  workingOptions: Working[] = ['OK', 'FAST', 'SLOW', 'NOT WORKING'];
  ratioOptions: CTRatio[] = ['100/5', '200/5', '300/5', '400/5', '600/5'];

  device_status: 'ASSIGNED' = 'ASSIGNED';
  currentUserId: any;
  currentLabId: any;
  report_type = 'CT_TESTING';
  device_testing_purpose: any;
  device_type: any;
  loading = false;

  private serialIndex: Record<string, {
    make?: string;
    capacity?: string;
    ratio?: string;
    device_id: number;
    assignment_id: number;
  }> = {};

  ctRows: CtRow[] = [this.emptyCtRow()];
  filterText = '';

  modal: ModalState = { open: false, title: '', message: '', action: null };
  submitting = false;

  alert = {
    open: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
    autoCloseMs: 0 as number | 0,
    _t: 0 as any
  };

  approverId: number | null = null;

  assignedPicker = {
    open: false,
    items: [] as Array<{
      ratio: string;
      id: number;
      device_id: number;
      serial_number: string;
      make?: string;
      capacity?: string;
      selected: boolean;
      testing_bench?: { bench_name?: string } | null;
      testing_user?: { name?: string } | null;
      approving_user?: { name?: string } | null;
      device?: DeviceLite | null;
    }>,
    query: ''
  };

  capacities: any;
  fees_mtr_cts: any;
  test_dail_current_cheaps: any;

  constructor(
    private api: ApiServicesService,
    private ctPdf: CtReportPdfService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.device_type = 'CT';
    this.device_testing_purpose = 'CT_TESTING';

    this.currentUserId = this.authService.getuseridfromtoken();
    this.currentLabId = this.authService.getlabidfromtoken();

    const userName =
      this.authService.getUserNameFromToken?.() ||
      localStorage.getItem('currentUserName') ||
      '';
    if (userName) {
      this.testing_user = userName;
      this.header.testing_user = userName;
    }

    this.api.getEnums().subscribe({
      next: (d) => {
        this.test_methods              = d?.test_methods || [];
        this.test_statuses             = d?.test_statuses || [];
        this.report_type               = d?.test_report_types?.CT_TESTING || this.report_type;
        this.office_types              = d?.office_types || [];
        this.commentby_testers         = d?.commentby_testers || [];
        this.test_results              = d?.test_results || [];
        this.makes                     = d?.makes || [];
        this.ct_classes                = d?.ct_classes || [];
        this.device_testing_purpose    = d?.test_report_types?.CT_TESTING ?? 'CT_TESTING';
        this.device_type               = d?.device_types?.CT ?? 'CT';
        this.capacities                = d?.capacities || [];
        this.fees_mtr_cts              = d?.fees_mtr_cts || [];
        this.test_dail_current_cheaps  = d?.test_dail_current_cheaps || [];
      }
    });

    this.loadLabInfo();
    this.loadAssignedPrefill();
  }

  private pickRatio(dev?: Partial<DeviceLite> | null): string {
    if (!dev) return '';
    const direct =
      (dev as any).ratio ??
      (dev as any).ct_ratio ??
      (dev as any).ctRatio ??
      (dev as any).ctratio;
    if (direct != null) return String(direct);

    const p = (dev as any).primary_current ?? this.header.primary_current;
    const s = (dev as any).secondary_current ?? this.header.secondary_current;
    return (p && s) ? `${p}/${s}` : '';
  }

  private validateContext(): { ok: boolean; reason?: string } {
    if (!this.device_type) return { ok: false, reason: 'Missing device_type — refresh enums.' };
    if (!this.device_testing_purpose) return { ok: false, reason: 'Missing device_testing_purpose — refresh enums.' };
    if (!this.currentUserId || this.currentUserId <= 0) return { ok: false, reason: 'Missing user_id — sign in again.' };
    if (!this.currentLabId || this.currentLabId <= 0) return { ok: false, reason: 'Missing lab_id — select a lab.' };
    return { ok: true };
  }

  private validate(): { ok: boolean; reason?: string } {
    const ctx = this.validateContext();
    if (!ctx.ok) return ctx;

    if (!this.testMethod || !this.testStatus) {
      return { ok: false, reason: 'Select Test Method and Test Status.' };
    }
    if (!this.header.date_of_testing) {
      return { ok: false, reason: 'Date of testing is required.' };
    }

    const validRows = (this.ctRows || []).filter(r => (r.ct_no || '').trim());
    if (!validRows.length) {
      return { ok: false, reason: 'Add at least one CT row.' };
    }

    // normalize tester info before submit/pdf
    this.testing_bench   = String(this.testing_bench ?? '').trim()   || '-';
    this.testing_user    = String(this.testing_user ?? '').trim()    || '-';
    this.approving_user  = String(this.approving_user ?? '').trim()  || '-';

    this.header.testing_bench   = this.testing_bench;
    this.header.testing_user    = this.testing_user;
    this.header.approving_user  = this.approving_user;

    // derive summary
    this.header.no_of_ct = validRows.length.toString();
    if (!this.header.ct_make && validRows[0]) {
      this.header.ct_make = validRows[0].make || '';
    }

    return { ok: true };
  }

  private loadLabInfo() {
    if (!this.currentLabId) return;
    this.api.getLabInfo?.(this.currentLabId)?.subscribe?.({
      next: (lab: any) => {
        this.lab_name    = lab?.lab_pdfheader_name || lab?.lab_name || this.lab_name;
        this.lab_address = lab?.lab_pdfheader_address || lab?.lab_location || this.lab_address;
        this.lab_email   = lab?.lab_pdfheader_email || lab?.lab_pdfheader_contact_no || this.lab_email;
        this.lab_phone   = lab?.lab_pdfheader_contact_no || this.lab_phone;
      },
      error: () => { /* ignore */ }
    });
  }

  private loadAssignedPrefill(): void {
    const ctx = this.validateContext();
    if (!ctx.ok) { return; }

    this.api.getAssignedMeterList(
      this.device_status,
      this.currentUserId,
      this.currentLabId,
      this.device_testing_purpose,
      this.device_type
    ).subscribe({
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.results) ? data.results : []);

        this.serialIndex = {};
        for (const a of asg) {
          const d = a.device as DeviceLite | undefined;
          const key = (d?.serial_number || '').toUpperCase().trim();
          if (!key) continue;
          this.serialIndex[key] = {
            make: d?.make || '',
            capacity: d?.capacity || '',
            ratio: this.pickRatio(d),
            device_id: d?.id ?? a.device_id ?? 0,
            assignment_id: a?.id ?? 0
          };
        }

        const first = asg[0];
        if (first) {
          const dev = first.device as DeviceLite | undefined;
          const bench = first.testing_bench;
          const userAssigned = first.user_assigned;
          const assignedBy   = first.assigned_by_user;

          this.header.location_code = dev?.location_code || this.header.location_code;
          this.header.location_name = dev?.location_name || this.header.location_name;

          this.testing_bench   = this.testing_bench   || bench?.bench_name  || '-';
          this.testing_user    = this.testing_user    || userAssigned?.name || '-';
          this.approving_user  = this.approving_user  || assignedBy?.name   || '-';

          this.header.testing_bench   = this.testing_bench;
          this.header.testing_user    = this.testing_user;
          this.header.approving_user  = this.approving_user;

          if (!this.header.ct_make) this.header.ct_make = dev?.make || '';
        }
      },
      error: () => { /* ignore */ }
    });
  }

  private emptyCtRow(seed?: Partial<CtRow>): CtRow {
    return {
      ct_no: '',
      make: '',
      cap: '',
      ratio: '',
      polarity: '',
      remark: '',
      working: undefined,
      ...seed
    };
  }

  addCtRow() {
    this.ctRows.push(this.emptyCtRow());
  }

  removeCtRow(i: number) {
    if (i >= 0 && i < this.ctRows.length) {
      this.ctRows.splice(i, 1);
      if (!this.ctRows.length) this.addCtRow();

      this.header.no_of_ct = (
        this.ctRows.filter(r => (r.ct_no || '').trim()).length || 1
      ).toString();

      if (!this.header.ct_make && this.ctRows[0]) {
        this.header.ct_make = this.ctRows[0].make || '';
      }
    }
  }

  clearCtRows() {
    this.ctRows = [this.emptyCtRow()];
  }

  trackByCtRow(i: number, r: CtRow) {
    return `${r.assignment_id || 0}_${r.device_id || 0}_${r.ct_no || ''}_${i}`;
  }

  displayRows(): CtRow[] {
    const q = (this.filterText || '').trim().toLowerCase();
    if (!q) return this.ctRows;
    return this.ctRows.filter(r =>
      (r.ct_no || '').toLowerCase().includes(q) ||
      (r.make || '').toLowerCase().includes(q) ||
      (r.remark || '').toLowerCase().includes(q)
    );
  }

  openAssignPicker() {
    const v = this.validateContext();
    if (!v.ok) {
      this.openAlert('warning', 'Context Error', v.reason!);
      return;
    }

    this.loading = true;
    this.api.getAssignedMeterList(
      this.device_status,
      this.currentUserId,
      this.currentLabId,
      this.device_testing_purpose,
      this.device_type
    ).subscribe({
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];

        this.serialIndex = {};
        const items = asg
          .map(a => {
            const d = a.device || ({} as DeviceLite);
            const key = (d.serial_number || '').toUpperCase().trim();

            if (key) {
              this.serialIndex[key] = {
                make: d?.make || '',
                capacity: d?.capacity || '',
                ratio: this.pickRatio(d),
                device_id: d?.id ?? a.device_id ?? 0,
                assignment_id: a?.id ?? 0
              };
            }

            return {
              id: a.id ?? 0,
              device_id: d.id ?? a.device_id ?? 0,
              serial_number: d.serial_number || '',
              make: d.make || '',
              capacity: d.capacity || '',
              ratio: this.pickRatio(d),
              selected: false,
              testing_bench: a.testing_bench ?? null,
              testing_user: a.user_assigned ?? null,
              approving_user: a.assigned_by_user ?? null,
              device: d || null
            };
          })
          .sort((x, y) => {
            const ma = (x.make || '').toLowerCase();
            const mb = (y.make || '').toLowerCase();
            if (ma !== mb) return ma.localeCompare(mb);
            return (x.serial_number || '').localeCompare(y.serial_number || '');
          });

        this.assignedPicker.items = items;
        this.assignedPicker.query = '';
        this.assignedPicker.open = true;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.openAlert('error', 'Load failed', 'Could not fetch assigned devices.');
      }
    });
  }

  get filteredAssigned() {
    const q = (this.assignedPicker.query || '').toLowerCase().trim();
    if (!q) return this.assignedPicker.items;
    return this.assignedPicker.items.filter(it =>
      (it.serial_number || '').toLowerCase().includes(q) ||
      (it.make || '').toLowerCase().includes(q) ||
      (it.capacity || '').toLowerCase().includes(q)
    );
  }

  toggleSelectAll(ev: any) {
    const on = !!ev?.target?.checked;
    this.filteredAssigned.forEach(i => (i.selected = on));
  }

  confirmAssignPicker() {
    const chosen = this.assignedPicker.items.filter(i => i.selected);
    if (!chosen.length) {
      this.assignedPicker.open = false;
      return;
    }

    // reuse single-blank-row logic
    const onlyOneEmpty =
      this.ctRows.length === 1 &&
      !Object.values(this.ctRows[0]).some(v => (v ?? '').toString().trim());
    if (onlyOneEmpty) this.ctRows = [];

    const existing = new Set(
      this.ctRows.map(r => (r.ct_no || '').toUpperCase().trim())
    );

    for (const c of chosen) {
      const ctno = (c.serial_number || '').trim();
      if (!ctno || existing.has(ctno.toUpperCase())) continue;

      this.ctRows.push(
        this.emptyCtRow({
          ct_no: ctno,
          make: c.make || '',
          cap: c.capacity || '',
          ratio: c.ratio || '',
          device_id: c.device_id || 0,
          assignment_id: c.id || 0,
          notFound: false
        })
      );

      existing.add(ctno.toUpperCase());
    }

    if (!this.ctRows.length) this.ctRows.push(this.emptyCtRow());

    const first = chosen[0];
    const dev = first.device;
    if (dev) {
      if (!this.header.location_code)
        this.header.location_code = dev.location_code || '';
      if (!this.header.location_name)
        this.header.location_name = dev.location_name || '';
    }

    this.testing_bench =
      first.testing_bench?.bench_name || this.testing_bench || '-';
    this.testing_user =
      first.testing_user?.name || this.testing_user || '-';
    this.approving_user =
      first.approving_user?.name || this.approving_user || '-';

    this.header.testing_bench = this.testing_bench;
    this.header.testing_user = this.testing_user;
    this.header.approving_user = this.approving_user;

    this.header.no_of_ct = this.ctRows
      .filter(r => (r.ct_no || '').trim())
      .length.toString();
    this.header.ct_make = this.ctRows[0]?.make || '';

    this.assignedPicker.open = false;
  }

  onCtNoChanged(i: number, value: string) {
    const key = (value || '').toUpperCase().trim();
    const row = this.ctRows[i];
    const hit = this.serialIndex[key];

    if (hit) {
      row.make = hit.make || '';
      row.cap = hit.capacity || '';
      row.device_id = hit.device_id || 0;
      row.ratio = hit.ratio || '';
      row.assignment_id = hit.assignment_id || 0;
      row.notFound = false;
    } else {
      row.make = '';
      row.cap = '';
      row.device_id = 0;
      row.ratio = '';
      row.assignment_id = 0;
      row.notFound = key.length > 0;
    }

    this.header.no_of_ct = this.ctRows
      .filter(r => (r.ct_no || '').trim())
      .length
      .toString();

    if (!this.header.ct_make) {
      this.header.ct_make = row.make || '';
    }
  }

  private isoOn(dateStr?: string) {
    const d = dateStr ? new Date(dateStr + 'T10:00:00') : new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  }

  private inferWorkingFromRemark(remark: string): Working | undefined {
    const t = (remark || '').toLowerCase();
    if (!t) return undefined;
    if (/\bok\b/.test(t)) return 'OK';
    if (/\bfast\b/.test(t)) return 'FAST';
    if (/\bslow\b/.test(t)) return 'SLOW';
    if (/\bnot\s*working\b|\bfail\b|\bdef\b|\bdefective\b/.test(t))
      return 'NOT WORKING';
    return undefined;
  }

  private parseRatioFloat(ratioStr: string): number | null {
    if (!ratioStr) return null;
    const parts = ratioStr.split('/');
    if (parts.length !== 2) return null;
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (!isFinite(num) || !isFinite(den) || den === 0) return null;
    return num / den;
  }

  private parseFloatOrNull(v: string | number | undefined | null): number | null {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return isFinite(n) ? n : null;
  }

  private buildPayload(): any[] {
    const when = this.isoOn(this.header.date_of_testing);

    const zone_dc =
      (this.header.location_code ? this.header.location_code + ' - ' : '') +
      (this.header.location_name || '');

    return (this.ctRows || [])
      .filter(r => (r.ct_no || '').trim())
      .map(r => {
        const detailsObj = {
          consumer_name: this.header.consumer_name || '',
          address: this.header.address || '',
          ref_no: this.header.ref_no || '',
          no_of_ct: this.header.no_of_ct || '',
          city_class: this.header.city_class || '',
          ct_make: this.header.ct_make || '',
          mr_no: this.header.mr_no || '',
          mr_date: this.header.mr_date || '',
          amount_deposited: this.header.amount_deposited || '',
          primary_current: this.header.primary_current || '',
          secondary_current: this.header.secondary_current || '',
          zone_dc: zone_dc,
          ct_no: r.ct_no || '',
          make: r.make || '',
          cap: r.cap || '',
          ratio: r.ratio || '',
          polarity: r.polarity || '',
          remark: r.remark || ''
        };

        const working: Working =
          r.working ||
          this.inferWorkingFromRemark(r.remark) ||
          'OK';

        const ct_ratio_val = this.parseRatioFloat(r.ratio);

        return {
          device_id: r.device_id ?? 0,
          assignment_id: r.assignment_id ?? 0,

          start_datetime: when,
          end_datetime: when,

          physical_condition_of_device: '-',
          seal_status: '-',
          meter_glass_cover: '-',
          terminal_block: '-',
          meter_body: '-',
          other: r.remark || '-',
          is_burned: false,

          consumer_name: this.header.consumer_name || null,
          consumer_address: this.header.address || null,
          certificate_number: null,
          testing_fees: this.header.amount_deposited || null,
          fees_mr_no: this.header.mr_no || null,
          fees_mr_date: this.header.mr_date || null,
          ref_no: this.header.ref_no || null,

          ct_class: this.header.city_class || null,
          ct_primary_current: this.parseFloatOrNull(this.header.primary_current),
          ct_secondary_current: this.parseFloatOrNull(this.header.secondary_current),
          ct_ratio: ct_ratio_val,
          ct_polarity: r.polarity || null,

          test_requester_name: zone_dc || null,

          shunt_reading_before_test: null,
          shunt_reading_after_test: null,
          shunt_ref_start_reading: null,
          shunt_ref_end_reading: null,
          shunt_error_percentage: null,

          nutral_reading_before_test: null,
          nutral_reading_after_test: null,
          nutral_ref_start_reading: null,
          nutral_ref_end_reading: null,
          nutral_error_percentage: null,

          shunt_current_test: null,
          shunt_creep_test: null,
          shunt_dail_test: null,
          nutral_current_test: null,
          nutral_creep_test: null,
          nutral_dail_test: null,

          start_reading_import: null,
          final_reading__import: null,
          difference__import: null,
          start_reading_export: null,
          final_reading_export: null,
          difference_export: null,
          final_Meter_Difference: null,
          error_percentage_import: null,
          error_percentage_export: null,

          meter_removaltime_reading: null,
          meter_removaltime_metercondition: null,
          any_other_remarkny_zone: null,

          final_remarks: null,

          p4_division: null,
          p4_no: null,
          p4_date: null,
          p4_metercodition: null,

          test_result: working,
          test_method: this.testMethod,
          test_status: this.testStatus,

          approver_id: this.approverId ?? null,
          approver_remark: null,

          details: JSON.stringify(detailsObj),

          report_type: this.report_type,
          created_by: String(this.currentUserId || '')
        };
      });
  }

  openConfirm(action: ModalState['action'], payload?: any) {
    this.modal.action = action;
    this.modal.payload = payload;

    if (action === 'submit') {
      this.modal.title = 'Submit CT Report — Preview';
      this.modal.message = '';
    } else if (action === 'clear') {
      this.modal.title = 'Clear All Rows';
      this.modal.message = 'Clear all rows and leave one empty row?';
    } else {
      this.modal.title = '';
      this.modal.message = '';
    }

    this.modal.open = true;
  }

  closeModal() {
    this.modal.open = false;
    this.modal.action = null;
    this.modal.payload = undefined;
  }

  confirmModal() {
    const a = this.modal.action;
    if (a !== 'submit') this.closeModal();

    if (a === 'clear') {
      this.clearCtRows();
    }

    if (a === 'submit') {
      this.doSubmit();
    }
  }

  private doSubmit() {
    const v = this.validate();
    if (!v.ok) {
      this.openAlert('warning', 'Validation error', v.reason!);
      return;
    }

    const payload = this.buildPayload();
    if (!payload.length) {
      this.openAlert('warning', 'Nothing to submit', 'Please add at least one valid row.');
      return;
    }

    this.submitting = true;
    this.api.postTestReports(payload).subscribe({
      next: async () => {
        this.submitting = false;
        this.openAlert('success', 'Submitted', 'CT Testing report saved.');

        try {
          this.downloadPdfNow(true);
        } catch (e) {
          console.error('PDF generation failed:', e);
          this.openAlert('warning', 'PDF error', 'Saved, but PDF could not be generated.');
        }

        this.ctRows = [this.emptyCtRow()];
        this.header.no_of_ct = '1';
        setTimeout(() => this.closeModal(), 600);
      },
      error: (err) => {
        this.submitting = false;
        console.error(err);
        this.openAlert('error', 'Submission failed', 'Something went wrong while submitting the report.');
      }
    });
  }

  // PDF helpers

  private toCtHeader(): CtHeader {
    return {
      location_code: this.header.location_code,
      location_name: this.header.location_name,
      consumer_name: this.header.consumer_name,
      address: this.header.address,
      no_of_ct: this.header.no_of_ct,
      city_class: this.header.city_class,
      ref_no: this.header.ref_no,
      ct_make: this.header.ct_make,
      mr_no: this.header.mr_no,
      mr_date: this.header.mr_date,
      amount_deposited: this.header.amount_deposited,
      date_of_testing: this.header.date_of_testing,
      primary_current: this.header.primary_current,
      secondary_current: this.header.secondary_current,

      testMethod: this.testMethod,
      testStatus: this.testStatus,

      // include bench/user/approver/date so it prints in meta + signature
      testing_bench: this.testing_bench || '-',
      testing_user: this.testing_user || '-',
      approving_user: this.approving_user || '-',
      date: this.pdf_date || this.header.date_of_testing || null,

      lab_name: this.lab_name || null,
      lab_address: this.lab_address || null,
      lab_email: this.lab_email || null,
      lab_phone: this.lab_phone || null,

      leftLogoUrl: '/assets/icons/wzlogo.png',
      rightLogoUrl: '/assets/icons/wzlogo.png'
    };
  }

  private toCtRows(): CtPdfRow[] {
    return (this.ctRows || [])
      .filter(r => (r.ct_no || '').trim())
      .map(r => ({
        ct_no: r.ct_no || '-',
        make: r.make || '-',
        cap: r.cap || '-',
        ratio: r.ratio || '-',
        polarity: r.polarity || '-',
        remark: r.remark || '-'
      }));
  }

  downloadPdfNow(fromSubmit = false) {
    const header = this.toCtHeader();
    const rows = this.toCtRows();

    this.ctPdf.download(
      header,
      rows,
      `CT_TESTING_${header.date_of_testing || new Date().toISOString().slice(0, 10)}.pdf`
    );

    this.openAlert(
      'success',
      fromSubmit ? 'PDF downloaded' : 'PDF Ready',
      fromSubmit
        ? 'Report submitted & PDF downloaded.'
        : 'CT Testing PDF downloaded.',
      1200
    );
  }

  openAlert(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    autoCloseMs: number = 0
  ) {
    if (this.alert._t) {
      clearTimeout(this.alert._t);
    }
    this.alert = { open: true, type, title, message, autoCloseMs, _t: 0 };
    if (autoCloseMs > 0) {
      this.alert._t = setTimeout(() => this.closeAlert(), autoCloseMs) as any;
    }
  }

  closeAlert() {
    if (this.alert._t) {
      clearTimeout(this.alert._t);
    }
    this.alert.open = false;
  }
}
