// src/app/wzlab/rmtl-testing/rmtl-add-testreport/rmtl-add-testreport-contested/rmtl-add-testreport-contested.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';
import {
  ContestedReportPdfService,
  ContestedReportHeader,
  ContestedReportRow
} from 'src/app/shared/contested-report-pdf.service';

type Id = number;
type ErrorFromMode = 'SHUNT' | 'NUTRAL' | 'BOTH' | null;
type ViewMode = 'SHUNT' | 'NUTRAL' | 'BOTH';

interface MeterDevice {
  id: Id;
  serial_number: string;
  make?: string;
  capacity?: string;
  phase?: string;
  location_code?: string | null;
  location_name?: string | null;
}
interface AssignmentItem {
  id: Id;              // assignment_id
  device_id: Id;
  device?: MeterDevice | null;

  testing_bench?: { bench_name?: string } | null;
  user_assigned?: { name?: string; username?: string } | null;
  assigned_by_user?: { name?: string; username?: string } | null;
}

interface DeviceRow {
  // Identity
  serial: string;
  make: string;
  capacity: string;

  // Result / remarks
  test_result?: string;
  remark: string;

  // Mapping keys
  device_id: Id;
  assignment_id: Id;
  notFound?: boolean;

  // AE/JE / Consumer slip
  form_no?: string;
  form_date?: string;
  consumer_name?: string;
  account_no_ivrs?: string;
  address?: string;
  contested_by?: string;         // -> test_requester_name
  payment_particulars?: string;  // -> testing_fees (parsed number)
  receipt_no?: string;           // -> fees_mr_no
  receipt_date?: string;         // -> fees_mr_date
  condition_at_removal?: string; // -> p4_metercodition + any_other_remarkny_zone
  removal_reading?: number;      // -> meter_removaltime_reading

  // RMTL section (device condition)
  testing_date?: string;
  physical_condition_of_device?: string;
  seal_status?: string;
  meter_glass_cover?: string;
  terminal_block?: string;
  meter_body?: string;
  other?: string;
  is_burned?: boolean;
  final_remarks?: string;


  // View & readings (SHUNT / NUTRAL)
  view_mode?: ViewMode;

  shunt_reading_before_test?: number | null;
  shunt_reading_after_test?: number | null;
  shunt_ref_start_reading?: number | null;
  shunt_ref_end_reading?: number | null;
  shunt_current_test?: string | null;
  shunt_creep_test?: string | null;
  shunt_dail_test?: string | null;
  shunt_error_percentage?: number | null;

  nutral_reading_before_test?: number | null;
  nutral_reading_after_test?: number | null;
  nutral_ref_start_reading?: number | null;
  nutral_ref_end_reading?: number | null;
  nutral_current_test?: string | null;
  nutral_creep_test?: string | null;
  nutral_dail_test?: string | null;
  nutral_error_percentage?: number | null;

  // Combined error
  error_from_mode: ErrorFromMode;
  error_percentage_import?: number | null;

  // UI
  _open?: boolean;
}

interface ModalState {
  open: boolean;
  title: string;
  message: string;
  action: 'clear' | 'submit' | null;
  payload?: any;
}

@Component({
  selector: 'app-rmtl-add-testreport-contested',
  templateUrl: './rmtl-add-testreport-contested.component.html',
  styleUrls: ['./rmtl-add-testreport-contested.component.css']
})
export class RmtlAddTestreportContestedComponent implements OnInit {
  // ===== enums/options
  device_status: 'ASSIGNED' = 'ASSIGNED';
  comment_bytester: string[] = [];
  test_methods: string[] = [];
  test_statuses: string[] = [];
  test_results: string[] = [];
  physical_conditions: string[] = [];
  seal_statuses: string[] = [];
  glass_covers: string[] = [];
  terminal_blocks: string[] = [];
  meter_bodies: string[] = [];
  makes: string[] = [];
  capacities: string[] = [];
  phases: string[] = [];
  ternal_testing_types: string[] = [];
  test_dail_current_cheaps: string[] = [];

  // ===== header + rows
  batch = {
    header: {
      zone: '',
      phase: '',
      date: '',
      location_code: '',
      location_name: '',
      testing_bench: '',
      testing_user: '',
      approving_user: ''
    },
    rows: [] as DeviceRow[]
  };

  // ===== ids/context
  currentUserId: any;
  currentLabId: any;
  device_testing_purpose: any;
  device_type: any;
  report_type = 'CONTESTED';
  approverId: number | null = null;

  // ===== ui state
  filterText = '';
  loading = false;
  submitting = false;
  modal: ModalState = { open: false, title: '', message: '', action: null };
  alertSuccess: string | null = null;
  alertError: string | null = null;
  payload: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;

  // ===== assigned cache (serial -> mapping)
  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: Id; assignment_id: Id; phase?: string; }> = {};

  // ===== PDF lab info
  labInfo: { lab_name?: string; address?: string; email?: string; phone?: string } | null = null;

  // ===== device picker state
  picking = false;
  pickerLoading = false;
  pickerAssignments: AssignmentItem[] = [];
  pickerSelected: Record<Id, boolean> = {};
  pickerFilter = '';
  testing_request_types: any;
  fees_mtr_cts: any;

  constructor(
    private api: ApiServicesService,
    private reportPdf: ContestedReportPdfService,
    private authService: AuthService
  ) {}

  // ===== lifecycle
  ngOnInit(): void {
    // date
    this.batch.header.date = this.toYMD(new Date());

    // ids from token
    this.currentUserId = this.authService.getuseridfromtoken();
    this.currentLabId = this.authService.getlabidfromtoken();

    // enums/config
    this.api.getEnums().subscribe({
      next: (d) => {
        this.device_status = (d?.device_status as 'ASSIGNED') ?? 'ASSIGNED';
        this.comment_bytester = d?.commentby_testers || [];
        this.test_results = d?.test_results || [];
        this.test_methods = d?.test_methods || [];
        this.test_statuses = d?.test_statuses || [];
        this.physical_conditions = d?.physical_conditions || [];
        this.seal_statuses = d?.seal_statuses || [];
        this.glass_covers = d?.glass_covers || [];
        this.terminal_blocks = d?.terminal_blocks || [];
        this.meter_bodies = d?.meter_bodies || [];
        this.makes = d?.makes || [];
        this.capacities = d?.capacities || [];
        this.phases = d?.phases || [];
        this.ternal_testing_types = d?.ternal_testing_types || ['SHUNT', 'NUTRAL', 'BOTH'];
        this.test_dail_current_cheaps = d?.test_dail_current_cheaps || [];

        // normalize report/device context similar to Stop/Defective
        this.report_type = d?.test_report_types?.CONTESTED ?? 'CONTESTED';
        this.device_testing_purpose = d?.test_report_types?.CONTESTED ?? 'CONTESTED';
        this.device_type = d?.device_types?.METER ?? 'METER';
        this.testing_request_types = d?.testing_request_types || [];
        this.fees_mtr_cts = d?.fees_mtr_cts || [];
        this.test_dail_current_cheaps = d?.test_dail_current_cheaps || [];


        // ensure one row
        if (!this.batch.rows.length) this.addBatchRow();

        // preload assigned cache
        this.doReloadAssignedWithoutAddingRows();
      },
      error: () => {
        this.alertError = 'Failed to load configuration (enums). Please reload.';
      }
    });

    // Lab info for PDF header
    if (this.currentLabId) {
      this.api.getLabInfo(this.currentLabId).subscribe({
        next: (info: any) => {
          this.labInfo = {
            lab_name: info?.lab_pdfheader_name || info?.lab_name,
            address: info?.address || info?.address_line,
            email: info?.email || info?.contact_email || info?.lab_email || info?.support_email,
            phone: info?.phone || info?.phone_no || info?.contact_phone || info?.mobile || info?.tel
          };
        }
      });
    }
  }

  // ===== guards
  private validateContextForAssignments(): { ok: boolean; reason?: string } {
    if (!this.currentUserId || !this.currentLabId) {
      return { ok: false, reason: 'Missing User/Lab context. Please ensure you are logged in and a lab is selected.' };
    }
    if (!this.device_type || !this.device_testing_purpose) {
      return { ok: false, reason: 'Missing Device Type/Testing Purpose. Please reload configuration.' };
    }
    return { ok: true };
  }

  private validateBeforeSubmit(): { ok: boolean; reason?: string } {
    const ctx = this.validateContextForAssignments();
    if (!ctx.ok) return ctx;

    if (!this.batch.header.location_code || !this.batch.header.location_name) {
      return { ok: false, reason: 'Zone/DC Code & Name are required (auto-filled from assignment).' };
    }
    if (!this.batch.header.date) return { ok: false, reason: 'Testing Date is required.' };
    if (!this.testMethod) return { ok: false, reason: 'Select a Test Method.' };
    if (!this.testStatus) return { ok: false, reason: 'Select a Test Status.' };

    const clean = (this.batch.rows || []).filter(r => (r.serial || '').trim());
    if (!clean.length) return { ok: false, reason: 'Enter at least one serial number.' };

    for (let i = 0; i < clean.length; i++) {
      const r = clean[i];
      if (r.notFound) return { ok: false, reason: `Row #${i + 1}: Serial not in assigned list.` };
      if (!r.assignment_id || !r.device_id) return { ok: false, reason: `Row #${i + 1}: Missing assignment/device mapping.` };
      if (!r.test_result) return { ok: false, reason: `Row #${i + 1}: Choose Test Result.` };
    }
    return { ok: true };
  }

  // ===== counts
  get totalCount(){ return this.batch?.rows?.length ?? 0; }
  get matchedCount(){ return (this.batch?.rows ?? []).filter(r => !!r.serial && !r.notFound).length; }
  get unknownCount(){ return (this.batch?.rows ?? []).filter(r => !!r.notFound).length; }

  // ===== assigned cache
  private rebuildSerialIndex(asg: AssignmentItem[]): void {
    this.serialIndex = {};
    for (const a of asg) {
      const d = a?.device ?? null;
      const s = (d?.serial_number || '').toUpperCase().trim();
      if (!s) continue;
      this.serialIndex[s] = {
        make: d?.make || '',
        capacity: d?.capacity || '',
        device_id: d?.id ?? a.device_id ?? 0,
        assignment_id: a?.id ?? 0,
        phase: d?.phase || ''
      };
    }
  }
  private loadDataWithoutAddingRows(asg: AssignmentItem[]): void { this.rebuildSerialIndex(asg); }

  doReloadAssignedWithoutAddingRows(): void {
    const v = this.validateContextForAssignments();
    if (!v.ok) { this.alertError = v.reason || 'Context invalid.'; return; }

    this.loading = true;
    this.api.getAssignedMeterList(
      this.device_status, this.currentUserId, this.currentLabId,
      this.device_testing_purpose, this.device_type
    ).subscribe({
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        this.loadDataWithoutAddingRows(asg);

        const first = asg.find(a => a.device);
        if (first?.device) {
          this.batch.header.location_code = first.device.location_code ?? '';
          this.batch.header.location_name = first.device.location_name ?? '';
          this.batch.header.testing_bench = first.testing_bench?.bench_name ?? '';
          this.batch.header.testing_user = first.user_assigned?.name || first.user_assigned?.username || '';
          this.batch.header.approving_user = first.assigned_by_user?.name || first.assigned_by_user?.username || '';
        }
        if (!this.batch.header.phase) {
          const uniq = new Set(asg.map(a => (a.device?.phase || '').toUpperCase()).filter(Boolean));
          this.batch.header.phase = uniq.size === 1 ? [...uniq][0] : '';
        }

        this.loading = false;
        this.alertSuccess = `Total (${asg.length}) assigned devices loaded for Contested Testing.`;
      },
      error: () => { this.loading = false; this.alertError = 'No assigned devices found for Contested Testing.'; }
    });
  }

  // ===== picker
  openPicker(): void {
    const v = this.validateContextForAssignments();
    if (!v.ok) { this.alertError = v.reason || 'Context invalid.'; return; }

    this.picking = true;
    this.pickerLoading = true;
    this.pickerSelected = {};
    this.pickerAssignments = [];
    this.pickerFilter = '';

    this.api.getAssignedMeterList(
      this.device_status, this.currentUserId, this.currentLabId,
      this.device_testing_purpose, this.device_type
    ).subscribe({
      next: (data: any) => {
        const list: AssignmentItem[] = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
        this.pickerAssignments = list;
        this.pickerLoading = false;

        const first = list.find(a => a.device);
        if (first?.device) {
          this.batch.header.location_code = first.device.location_code ?? '';
          this.batch.header.location_name = first.device.location_name ?? '';
          this.batch.header.testing_bench = first.testing_bench?.bench_name ?? '';
          this.batch.header.testing_user = first.user_assigned?.name || first.user_assigned?.username || '';
          this.batch.header.approving_user = first.assigned_by_user?.name || first.assigned_by_user?.username || '';
        }

        this.rebuildSerialIndex(list);
      },
      error: () => { this.pickerLoading = false; this.alertError = 'Could not load assigned devices.'; }
    });
  }
  closePicker(): void { this.picking = false; }

  get pickerFiltered(): AssignmentItem[] {
    const q = (this.pickerFilter || '').trim().toLowerCase();
    const base = (this.pickerAssignments || []).filter(a => {
      const d = a.device;
      if (!d) return false;
      if (!q) return true;
      return (
        (d.serial_number || '').toLowerCase().includes(q) ||
        (d.make || '').toLowerCase().includes(q) ||
        (d.capacity || '').toLowerCase().includes(q)
      );
    });
    return base.sort((x, y) => {
      const mx = (x.device?.make || '').toLowerCase();
      const my = (y.device?.make || '').toLowerCase();
      if (mx < my) return -1;
      if (mx > my) return 1;
      const sx = (x.device?.serial_number || '').toLowerCase();
      const sy = (y.device?.serial_number || '').toLowerCase();
      return sx.localeCompare(sy);
    });
  }
  get allPicked(): boolean {
    const list = this.pickerFiltered;
    return list.length > 0 && list.every(a => !!this.pickerSelected[a.id]);
  }
  togglePickAll(checked: boolean): void {
    this.pickerFiltered.forEach(a => this.pickerSelected[a.id] = checked);
  }

  addPickedToRows(): void {
    const chosen = this.pickerFiltered.filter(a => this.pickerSelected[a.id]);
    const existing = new Set(this.batch.rows.map(r => (r.serial || '').toUpperCase().trim()));

    let added = 0;
    chosen.forEach(a => {
      const d = a.device || ({} as MeterDevice);
      const serial = (d.serial_number || '').trim();
      if (!serial || existing.has(serial.toUpperCase())) return;

      this.batch.rows.push(this.emptyRow({
        serial,
        make: d.make || '',
        capacity: d.capacity || '',
        device_id: d.id ?? a.device_id ?? 0,
        assignment_id: a.id ?? 0,
        notFound: false
      }));
      existing.add(serial.toUpperCase());
      added++;
    });

    if (!this.batch.rows.length) this.addBatchRow();
    this.picking = false;

    if (added) {
      this.alertSuccess = `${added} device(s) added to the batch.`;
      this.alertError = null;
    } else {
      this.alertError = 'No new devices were added (duplicates or none selected).';
      this.alertSuccess = null;
    }
  }

  trackAssignment(_: number, a: AssignmentItem) { return a.id; }

  // ===== rows
  private emptyRow(seed?: Partial<DeviceRow>): DeviceRow {
    return {
      serial: '', make: '', capacity: '', remark: '', test_result: undefined,
      device_id: 0, assignment_id: 0, notFound: false,

      form_no: '', form_date: '',
      consumer_name: '', account_no_ivrs: '', address: '',
      contested_by: '', payment_particulars: '',
      receipt_no: '', receipt_date: '', condition_at_removal: '', removal_reading: undefined,

      testing_date: '',
      physical_condition_of_device: '', seal_status: '', meter_glass_cover: '',
      terminal_block: '', meter_body: '', other: '', is_burned: false,

      view_mode: 'BOTH',
      shunt_reading_before_test: null,
      shunt_reading_after_test: null,
      shunt_ref_start_reading: null,
      shunt_ref_end_reading: null,
      shunt_current_test: null,
      shunt_creep_test: null,
      shunt_dail_test: null,
      shunt_error_percentage: null,

      nutral_reading_before_test: null,
      nutral_reading_after_test: null,
      nutral_ref_start_reading: null,
      nutral_ref_end_reading: null,
      nutral_current_test: null,
      nutral_creep_test: null,
      nutral_dail_test: null,
      nutral_error_percentage: null,

      error_from_mode: null,
      error_percentage_import: null,

      _open: false,
      ...seed
    };
  }
  addBatchRow(){ this.batch.rows.push(this.emptyRow()); }
  removeRow(i: number){ this.batch.rows.splice(i,1); if (!this.batch.rows.length) this.addBatchRow(); }

  onSerialChanged(i: number, serial: string){
    const key = (serial || '').toUpperCase().trim();
    const row = this.batch.rows[i]; const hit = this.serialIndex[key];
    if (hit){
      row.make = hit.make || ''; row.capacity = hit.capacity || '';
      row.device_id = hit.device_id || 0; row.assignment_id = hit.assignment_id || 0; row.notFound = false;
      if (!this.batch.header.phase && hit.phase){ this.batch.header.phase = (hit.phase || '').toUpperCase(); }
    } else {
      row.make=''; row.capacity=''; row.device_id=0; row.assignment_id=0; row.notFound = key.length>0;
    }
  }

  displayRows(): DeviceRow[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.batch.rows;
    return this.batch.rows.filter(r =>
      (r.serial || '').toLowerCase().includes(q) ||
      (r.make || '').toLowerCase().includes(q) ||
      (r.capacity || '').toLowerCase().includes(q) ||
      (r.remark || '').toLowerCase().includes(q) ||
      ((r.test_result || '').toString().toLowerCase().includes(q))
    );
  }
  trackRow(i:number, r:DeviceRow){ return `${r.assignment_id||0}_${r.device_id||0}_${r.serial||''}_${i}`; }

  // ===== utils & calcs
  private toYMD(d: Date){ const dt = new Date(d.getTime() - d.getTimezoneOffset()*60000); return dt.toISOString().slice(0,10); }
  private isoOn(dateStr?: string){
    const d = dateStr? new Date(dateStr+'T10:00:00') : new Date();
    return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString();
  }
  private numOrNull(v: any): number | null { const n = Number(v); return (isFinite(n) && v !== '' && v !== null && v !== undefined) ? n : null; }

  private computeError(before?: number | null, after?: number | null, refStart?: number | null, refEnd?: number | null): number | null {
    const b = Number(before);
    const a = Number(after);
    const s = Number(refStart);
    const e = Number(refEnd);
    if (!Number.isFinite(b) || !Number.isFinite(a) || !Number.isFinite(s) || !Number.isFinite(e)) return null;
    const refDiff = e - s;
    if (!refDiff) return null;
    const pct = ((a - b) - refDiff) / refDiff * 100;
    return Math.round(pct * 100) / 100;
  }

  calcShunt(i: number) {
    const r = this.batch.rows[i];
    r.shunt_error_percentage = this.computeError(
      r.shunt_reading_before_test, r.shunt_reading_after_test,
      r.shunt_ref_start_reading, r.shunt_ref_end_reading
    );
    if (r.error_from_mode === 'SHUNT') {
      r.error_percentage_import = r.shunt_error_percentage ?? null;
    }
  }
  calcNutral(i: number) {
    const r = this.batch.rows[i];
    r.nutral_error_percentage = this.computeError(
      r.nutral_reading_before_test, r.nutral_reading_after_test,
      r.nutral_ref_start_reading, r.nutral_ref_end_reading
    );
    if (r.error_from_mode === 'NUTRAL') {
      r.error_percentage_import = r.nutral_error_percentage ?? null;
    }
  }
  calculateErrorPct(i: number) {
    const r = this.batch.rows[i];
    if (r.error_from_mode === 'SHUNT') {
      if (r.shunt_error_percentage == null) this.calcShunt(i);
      r.error_percentage_import = r.shunt_error_percentage ?? null;
    } else if (r.error_from_mode === 'NUTRAL') {
      if (r.nutral_error_percentage == null) this.calcNutral(i);
      r.error_percentage_import = r.nutral_error_percentage ?? null;
    } else if (r.error_from_mode === 'BOTH') {
      this.calcNutral(i);
      this.calcShunt(i);
      const sh = r.shunt_error_percentage;
      const nu = r.nutral_error_percentage;
      r.error_percentage_import = (sh != null && nu != null)
        ? Math.round(((sh + nu) / 2) * 100) / 100
        : null;
    } else {
      r.error_percentage_import = null;
    }
  }

  // ===== payload
  private buildPayload(): any[] {
    const whenISO = this.isoOn(this.batch.header.date);

    return (this.batch.rows || [])
      .filter(r => (r.serial || '').trim())
      .map(r => {
        return {
          assignment_id: r.assignment_id ?? 0,
          device_id: r.device_id ?? 0,
          report_type: this.report_type || 'CONTESTED',
          start_datetime: whenISO,
          end_datetime: whenISO,

          // device condition
          physical_condition_of_device: r.physical_condition_of_device || null,
          seal_status: r.seal_status || null,
          meter_glass_cover: r.meter_glass_cover || null,
          terminal_block: r.terminal_block || null,
          meter_body: r.meter_body || null,
          other: r.other || null,
          is_burned: !!r.is_burned,

          // SHUNT readings
          shunt_reading_before_test: this.numOrNull(r.shunt_reading_before_test),
          shunt_reading_after_test:  this.numOrNull(r.shunt_reading_after_test),
          shunt_ref_start_reading:   this.numOrNull(r.shunt_ref_start_reading),
          shunt_ref_end_reading:     this.numOrNull(r.shunt_ref_end_reading),
          shunt_current_test:        (r.shunt_current_test || null),
          shunt_creep_test:          (r.shunt_creep_test || null),
          shunt_dail_test:           (r.shunt_dail_test || null),
          shunt_error_percentage:    this.numOrNull(r.shunt_error_percentage),

          // NUTRAL readings
          nutral_reading_before_test: this.numOrNull(r.nutral_reading_before_test),
          nutral_reading_after_test:  this.numOrNull(r.nutral_reading_after_test),
          nutral_ref_start_reading:   this.numOrNull(r.nutral_ref_start_reading),
          nutral_ref_end_reading:     this.numOrNull(r.nutral_ref_end_reading),
          nutral_current_test:        (r.nutral_current_test || null),
          nutral_creep_test:          (r.nutral_creep_test || null),
          nutral_dail_test:           (r.nutral_dail_test || null),
          nutral_error_percentage:    this.numOrNull(r.nutral_error_percentage),

          // combined error
          error_percentage_import: this.numOrNull(r.error_percentage_import),

          // results/meta
          details: r.remark || null,
          final_remarks: r.final_remarks || null,
          test_result: (r.test_result as string) || null,
          test_method: this.testMethod || null,
          test_status: this.testStatus || null,

          // contested extras mapped
          consumer_name: r.consumer_name || null,
          consumer_address: r.address || null,
          testing_fees: this.parseAmount(r.payment_particulars),
          fees_mr_no: r.receipt_no || null,
          fees_mr_date: r.receipt_date || null,
          ref_no: r.account_no_ivrs || null,

          test_requester_name: r.contested_by || null,
          meter_removaltime_reading: this.numOrNull(r.removal_reading),
          any_other_remarkny_zone: r.condition_at_removal || null,
          p4_metercodition: r.condition_at_removal || null,

          approver_id: this.approverId ?? null,

          // audit
          created_by: String(this.currentUserId || ''),
          updated_by: String(this.currentUserId || '')
        };
      });
  }

  // ===== submit + PDF
  private async generatePdfNow(): Promise<void> {
    const header: ContestedReportHeader = {
      date: this.batch.header.date || this.toYMD(new Date()),
      phase: this.batch.header.phase || '',
      location_code: this.batch.header.location_code || '',
      location_name: this.batch.header.location_name || '',
      zone: this.joinNonEmpty([this.batch.header.location_code, this.batch.header.location_name], ' - '),

      testerName: this.batch.header.testing_user || '',
      testing_bench: this.batch.header.testing_bench || '-',
      testing_user: this.batch.header.testing_user || '',
      approving_user: this.batch.header.approving_user || '-',

      lab_name: this.labInfo?.lab_name,
      lab_address: this.labInfo?.address,
      lab_email: this.labInfo?.email,
      lab_phone: this.labInfo?.phone,

      leftLogoUrl: '/assets/icons/wzlogo.png',
      rightLogoUrl: '/assets/icons/wzlogo.png'
    };

    const rows: ContestedReportRow[] = (this.batch.rows || [])
      .filter(r => (r.serial || '').trim())
      .map(r => ({
        serial: r.serial,
        make: r.make,
        capacity: r.capacity,
        removal_reading: this.numOrNull(r.removal_reading) ?? undefined,
        consumer_name: r.consumer_name,
        account_no_ivrs: r.account_no_ivrs,
        address: r.address,
        contested_by: r.contested_by,
        payment_particulars: r.payment_particulars,
        receipt_no: r.receipt_no,
        receipt_date: r.receipt_date,
        testing_date: r.testing_date || this.batch.header.date,
        physical_condition_of_device: r.physical_condition_of_device,
        is_burned: !!r.is_burned,
        seal_status: r.seal_status,
        meter_glass_cover: r.meter_glass_cover,
        terminal_block: r.terminal_block,
        meter_body: r.meter_body,
        other: r.other,

        // present SHUNT/NUTRAL & combined percentages if available
        shunt_reading_before_test: this.numOrNull(r.shunt_reading_before_test) ?? undefined,
        shunt_reading_after_test: this.numOrNull(r.shunt_reading_after_test) ?? undefined,
        shunt_ref_start_reading: this.numOrNull(r.shunt_ref_start_reading) ?? undefined,
        shunt_ref_end_reading: this.numOrNull(r.shunt_ref_end_reading) ?? undefined,
        shunt_current_test: r.shunt_current_test || undefined,
        shunt_creep_test: r.shunt_creep_test || undefined,
        shunt_dail_test: r.shunt_dail_test || undefined,
        nutral_reading_before_test: this.numOrNull(r.nutral_reading_before_test) ?? undefined,
        nutral_reading_after_test: this.numOrNull(r.nutral_reading_after_test) ?? undefined,
        nutral_ref_start_reading: this.numOrNull(r.nutral_ref_start_reading) ?? undefined,
        nutral_ref_end_reading: this.numOrNull(r.nutral_ref_end_reading) ?? undefined,
        nutral_current_test: r.nutral_current_test || undefined,
        nutral_creep_test: r.nutral_creep_test || undefined,
        nutral_dail_test: r.nutral_dail_test || undefined,
        shunt_error_percentage: this.numOrNull(r.shunt_error_percentage) ?? undefined,
        nutral_error_percentage: this.numOrNull(r.nutral_error_percentage) ?? undefined,
        error_percentage_import: this.numOrNull(r.error_percentage_import) ?? undefined,

        remark: r.remark || undefined
      }));

    await this.reportPdf.downloadFromBatch(header, rows, { fileName: `CONTESTED_${header.date}.pdf` });
  }

  private doSubmitBatch(): void {
    const v = this.validateBeforeSubmit();
    if (!v.ok) { this.alertError = v.reason || 'Validation failed.'; this.alertSuccess = null; return; }

    this.payload = this.buildPayload();
    this.submitting = true; this.alertSuccess=null; this.alertError=null;

    this.api.postTestReports(this.payload).subscribe({
      next: async () => {
        this.submitting = false;

        try {
          await this.generatePdfNow();
          this.alertSuccess = 'Batch Report submitted and PDF downloaded successfully!';
        } catch {
          this.alertSuccess = 'Batch Report submitted successfully!';
          this.alertError = 'PDF generation failed.';
        }

        this.batch.rows = [this.emptyRow()];
        setTimeout(()=>this.closeModal(), 600);
      },
      error: (e) => {
        this.submitting=false; this.alertSuccess=null; this.alertError='Error submitting report.'; console.error(e);
      }
    });
  }

  // ===== modal
  openConfirm(action: ModalState['action']){
    if (action!=='submit'){ this.alertSuccess=null; this.alertError=null; }

    if (action === 'submit') {
      const v = this.validateBeforeSubmit();
      if (!v.ok) {
        this.alertError = v.reason || 'Validation failed.';
        this.modal = { open: true, title: 'Validation Errors', message: v.reason || '', action: null };
        return;
      }
    }

    switch(action){
      case 'clear':
        this.modal = { open: true, title:'Clear All Rows', message:'Clear all rows and leave one empty row?', action:'clear' };
        break;
      case 'submit':
        this.modal = { open: true, title:'Submit Batch Report — Preview', message:'', action:'submit' };
        break;
      default:
        this.modal = { open:false, title:'', message:'', action:null };
    }
  }
  closeModal(){ this.modal.open=false; this.modal.action=null; this.modal.payload=undefined; }
  confirmModal(){
    const a=this.modal.action;
    if(a==='clear'){ this.batch.rows = []; this.addBatchRow(); this.closeModal(); return; }
    if(a==='submit'){ this.doSubmitBatch(); }
  }

  // helpers
  private joinNonEmpty(parts: Array<string | undefined | null>, sep = ' - ') {
    return parts.filter(Boolean).join(sep);
  }
  private parseAmount(val?: string): number | null {
    if (!val) return null;
    const m = val.replace(/,/g,'').match(/(\d+(\.\d+)?)/);
    return m ? Number(m[1]) : null;
  }
}
