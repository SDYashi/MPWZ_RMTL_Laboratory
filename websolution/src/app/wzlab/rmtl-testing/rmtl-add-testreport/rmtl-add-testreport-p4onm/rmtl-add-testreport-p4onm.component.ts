import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { P4onmReportPdfService, P4ONMReportHeader, P4ONMReportRow } from 'src/app/shared/p4onm-report-pdf.service';

type ViewMode = 'SHUNT' | 'NUTRAL' | 'BOTH' | '';
type ErrorFromMode = 'SHUNT' | 'NUTRAL' | '';

interface MeterDevice {
  id: number;
  serial_number: string;
  make?: string;
  capacity?: string;
  phase?: string;
  location_code?: string | null;
  location_name?: string | null;
}
interface AssignmentItem {
  id: number;
  device_id: number;
  device?: MeterDevice | null;
  testing_bench?: { bench_name?: string } | null;
  user_assigned?: { name?: string; username?: string } | null;
  assigned_by_user?: { name?: string; username?: string } | null;
}

interface DeviceRow {
  // identity
  serial: string;
  make: string;
  capacity: string;
  test_result?: string;
  test_method: 'MANUAL' | 'AUTOMATED';
  test_status?: string;
  device_id: number;
  assignment_id: number;
  notFound?: boolean;

  // quick remark
  remark: string;

  // AE/JE Zone slip bits
  consumer_name?: string;
  account_no_ivrs?: string;
  address?: string;
  p4onm_by?: string;
  payment_particulars?: string;
  receipt_no?: string;
  receipt_date?: string;
  condition_at_removal?: string;
  removal_reading?: number;

  // SHUNT set
  shunt_reading_before_test?: number | null;
  shunt_reading_after_test?: number | null;
  shunt_ref_start_reading?: number | null;
  shunt_ref_end_reading?: number | null;
  shunt_current_test?: string | null;
  shunt_creep_test?: string | null;
  shunt_dail_test?: string | null;
  shunt_error_percentage?: number | null;

  // NUTRAL set
  nutral_reading_before_test?: number | null;
  nutral_reading_after_test?: number | null;
  nutral_ref_start_reading?: number | null;
  nutral_ref_end_reading?: number | null;
  nutral_current_test?: string | null;
  nutral_creep_test?: string | null;
  nutral_dail_test?: string | null;
  nutral_error_percentage?: number | null;

  // Combined import error
  error_from_mode: ErrorFromMode;
  error_percentage_import?: number | null;

  // Device condition
  physical_condition_of_device?: string | null;
  seal_status?: string | null;
  meter_glass_cover?: string | null;
  terminal_block?: string | null;
  meter_body?: string | null;
  is_burned?: boolean;

  // Final remarks
  final_remarks?: string | null;

  // UI
  view_mode?: ViewMode;
  _open?: boolean;
}

interface ModalState {
  open: boolean; title: string; message: string;
  action: 'clear' | 'submit' | null;
  payload?: any;
}

@Component({
  selector: 'app-rmtl-add-testreport-p4onm',
  templateUrl: './rmtl-add-testreport-p4onm.component.html',
  styleUrls: ['./rmtl-add-testreport-p4onm.component.css']
})
export class RmtlAddTestreportP4onmComponent implements OnInit {
  // enums / options
  device_status: 'ASSIGNED' = 'ASSIGNED';
  comment_bytester: any[] = [];
  test_methods: any[] = [];
  test_statuses: any[] = [];
  test_results: any[] = [];
  physical_conditions: any[] = []; seal_statuses: any[] = []; glass_covers: any[] = [];
  terminal_blocks: any[] = []; meter_bodies: any[] = []; makes: any[] = []; capacities: any[] = [];
  phases: any[] = [];
  ternal_testing_types: ('SHUNT' | 'NUTRAL' | 'BOTH')[] = ['SHUNT','NUTRAL','BOTH']; // UI labels
  test_dail_current_cheaps: any[] = [];

  // header + rows
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

  // lab info for pdf header
  labInfo: {
    lab_name?: string; address?: string; email?: string; phone?: string;
    logo_left_url?: string; logo_right_url?: string;
  } | null = null;

  // ids / context
  currentUserId: any;
  currentLabId : any;
  device_testing_purpose: any | null = null;
  device_type: any | null = null;

  // ui
  filterText = ''; loading = false; submitting = false;
  modal: ModalState = { open: false, title: '', message: '', action: null };
  inlineInfo: string | null = null; inlineError: string | null = null;

  // picker
  picking = false; pickerLoading = false;
  pickerAssignments: AssignmentItem[] = [];
  pickerSelected: Record<number, boolean> = {};
  pickerFilter = '';

  // derived
  payload: any[] = []; testMethod: string | null = null; testStatus: string | null = null;
  approverId: number | null = null;
  report_type = 'ONM_CHECKING';

  // serial index
  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: number; assignment_id: number; phase?: string; }> = {};
  testing_request_types: any;
  fees_mtr_cts: any;

  constructor(
    private api: ApiServicesService,
    private pdfSvc: P4onmReportPdfService,
    private authService: AuthService
  ) {}

  // -------------------- lifecycle --------------------
  ngOnInit(): void {
    this.batch.header.date = this.toYMD(new Date());
    this.currentUserId = this.authService.getuseridfromtoken();
    this.currentLabId = this.authService.getlabidfromtoken();

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
        this.testing_request_types = d?.testing_request_types || [];
        this.fees_mtr_cts = d?.fees_mtr_cts || [];      
        this.ternal_testing_types = d?.ternal_testing_types || this.ternal_testing_types;
        this.test_dail_current_cheaps = d?.test_dail_current_cheaps || [];

        this.report_type = d?.test_report_types?.ONM_CHECKING ?? 'ONM_CHECKING';
        this.device_testing_purpose = d?.test_report_types?.ONM_CHECKING ?? 'ONM_CHECKING';
        this.device_type = d?.device_types?.METER ?? 'METER';

        this.reloadAssigned();
      },
      error: () => this.inlineError = 'Failed to load configuration (enums). Please reload.'
    });

    if (this.currentLabId) {
      this.api.getLabInfo(this.currentLabId).subscribe({
        next: (info: any) => {
          this.labInfo = {
            lab_name: info?.lab_pdfheader_name || info?.lab_name,
            address: info?.lab_pdfheader_address || info?.lab_location,
            email: info?.lab_pdfheader_email || info?.lab_pdfheader_contact_no,
            phone: info?.lab_pdfheader_contact_no || info?.lab_location,
            logo_left_url: info?.logo_left_url,
            logo_right_url: info?.logo_right_url
          };
        }
      });
    }

    if (!this.batch.rows.length) this.addBatchRow();
  }

  // -------------------- counters for header badges --------------------
  get totalCount(): number {
    return (this.batch.rows || []).filter(r => (r.serial || '').trim()).length;
  }
  get matchedCount(): number {
    return (this.batch.rows || []).filter(r => (r.serial || '').trim() && !r.notFound && r.assignment_id && r.device_id).length;
  }
  get unknownCount(): number {
    return (this.batch.rows || []).filter(r => (r.serial || '').trim() && (r.notFound || !r.assignment_id || !r.device_id)).length;
  }

  // -------------------- assigned cache --------------------
  private validateContext(): { ok: boolean; reason?: string } {
    if (!this.currentUserId || !this.currentLabId) return { ok:false, reason:'Missing User/Lab context.' };
    if (!this.device_type || !this.device_testing_purpose) return { ok:false, reason:'Missing Device Type / Testing Purpose.' };
    return { ok:true };
  }

  private reloadAssigned(): void {
    const v = this.validateContext();
    if (!v.ok) { this.inlineError = v.reason || 'Context invalid.'; return; }
    this.loading = true;
    this.api.getAssignedMeterList(
      this.device_status, this.currentUserId, this.currentLabId, this.device_testing_purpose, this.device_type
    ).subscribe({
      next: (data: any) => {
        const list: AssignmentItem[] = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
        this.rebuildSerialIndex(list);
        this.loadHeaderFromAssignments(list);
        this.loading = false;
        this.inlineInfo = `Total ${list.length} Assigned device(s) found for P4 ONM checking.`;
      },
      error: () => { this.loading=false; this.inlineError = 'No assigned devices found for P4 ONM checking.'; }
    });
  }

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

  private loadHeaderFromAssignments(asg: AssignmentItem[]) {
    const first = asg.find(a => a.device);
    if (first?.device) {
      this.batch.header.location_code = this.batch.header.location_code || first.device.location_code || '';
      this.batch.header.location_name = this.batch.header.location_name || first.device.location_name || '';
      this.batch.header.testing_bench = first.testing_bench?.bench_name || this.batch.header.testing_bench || '-';
      this.batch.header.testing_user =
        this.batch.header.testing_user || first.user_assigned?.name || first.user_assigned?.username || (localStorage.getItem('currentUserName') || '-');
      this.batch.header.approving_user =
        this.batch.header.approving_user || first.assigned_by_user?.name || first.assigned_by_user?.username || '-';
    }
    if (!this.batch.header.phase) {
      const uniq = new Set(asg.map(a => (a.device?.phase || '').toUpperCase()).filter(Boolean));
      this.batch.header.phase = uniq.size === 1 ? [...uniq][0] : this.batch.header.phase || '';
    }
  }

  // -------------------- picker --------------------
  openPicker(): void {
    const v = this.validateContext();
    if (!v.ok) { this.inlineError = v.reason || 'Context invalid.'; return; }
    this.picking = true; this.pickerLoading = true; this.pickerSelected = {}; this.pickerAssignments = []; this.pickerFilter='';

    this.api.getAssignedMeterList(
      this.device_status, this.currentUserId, this.currentLabId, this.device_testing_purpose, this.device_type
    ).subscribe({
      next: (data: any) => {
        const list: AssignmentItem[] = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
        this.pickerAssignments = list;
        this.pickerLoading = false;
        this.loadHeaderFromAssignments(list);
        this.rebuildSerialIndex(list);
      },
      error: () => { this.pickerLoading = false; this.inlineError = 'Could not load assigned devices.'; }
    });
  }
  closePicker(){ this.picking = false; }
  get pickerFiltered(): AssignmentItem[] {
    const q = (this.pickerFilter || '').trim().toLowerCase();
    const base = (this.pickerAssignments || []).filter(a => {
      const d = a.device;
      if (!d) return false; if (!q) return true;
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
    const ids = this.pickerFiltered.map(p => p.id);
    return ids.length>0 && ids.every(id => !!this.pickerSelected[id]);
    }
  togglePickAll(checked: boolean): void {
    this.pickerFiltered.forEach(a => this.pickerSelected[a.id] = checked);
  }
  addPickedToRows(): void {
    const chosen = this.pickerFiltered.filter(a => this.pickerSelected[a.id]);
    const existing = new Set(this.batch.rows.map(r => (r.serial || '').toUpperCase().trim()));
    let added = 0;
    chosen.forEach(a => {
      const d = a.device!;
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
      existing.add(serial.toUpperCase()); added++;
    });
    if (!this.batch.rows.length) this.addBatchRow();
    this.closePicker();
    this.inlineInfo = added ? `${added} device(s) added to the batch.` : 'No new devices were added.';
  }
  trackAssignment(_i:number, a:AssignmentItem){ return a.id; }

  // -------------------- rows --------------------
  private emptyRow(seed?: Partial<DeviceRow>): DeviceRow {
    return {
      serial: '', make: '', capacity: '',
      test_result: undefined, test_method: 'MANUAL',
      test_status: undefined,
      device_id: 0, assignment_id: 0, notFound: false,
      remark: '',

      // slip
      consumer_name:'', account_no_ivrs:'', address:'', p4onm_by:'', payment_particulars:'',
      receipt_no:'', receipt_date:'', condition_at_removal:'', removal_reading: undefined,

      // shunt/nutral
      shunt_reading_before_test:null, shunt_reading_after_test:null, shunt_ref_start_reading:null, shunt_ref_end_reading:null,
      shunt_current_test:null, shunt_creep_test:null, shunt_dail_test:null, shunt_error_percentage:null,

      nutral_reading_before_test:null, nutral_reading_after_test:null, nutral_ref_start_reading:null, nutral_ref_end_reading:null,
      nutral_current_test:null, nutral_creep_test:null, nutral_dail_test:null, nutral_error_percentage:null,

      error_from_mode:'', error_percentage_import:null,

      physical_condition_of_device:'', seal_status:'', meter_glass_cover:'', terminal_block:'', meter_body:'', is_burned:false,
      final_remarks:'',

      view_mode:'BOTH', _open:false,
      ...seed
    };
  }

  addBatchRow(){ this.batch.rows.push(this.emptyRow()); }
  removeRow(i: number){ this.batch.rows.splice(i,1); if (!this.batch.rows.length) this.addBatchRow(); }
  displayRows(): DeviceRow[] {
    const q = this.filterText.trim().toLowerCase(); if (!q) return this.batch.rows;
    return this.batch.rows.filter(r =>
      (r.serial || '').toLowerCase().includes(q) ||
      (r.make || '').toLowerCase().includes(q) ||
      (r.capacity || '').toLowerCase().includes(q) ||
      (r.remark || '').toLowerCase().includes(q) ||
      ((r.test_result || '').toString().toLowerCase().includes(q)) ||
      ((r.final_remarks || '').toLowerCase().includes(q))
    );
  }
  trackRow(_i:number, r:DeviceRow){ return `${r.assignment_id||0}_${r.device_id||0}_${r.serial||''}`; }

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

  // -------------------- utils --------------------
  private toYMD(d: Date){ const dt = new Date(d.getTime() - d.getTimezoneOffset()*60000); return dt.toISOString().slice(0,10); }
  private isoOn(dateStr?: string){ const d = dateStr? new Date(dateStr+'T10:00:00') : new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString(); }
  private numOrNull(v: any): number | null { const n = Number(v); return isFinite(n) ? n : null; }
  private parseAmount(val?: string): number | null {
    if (!val) return null; const m = val.replace(/,/g,'').match(/(\d+(\.\d+)?)/); return m ? Number(m[1]) : null;
  }

  // -------------------- shunt/nutral math --------------------
  private diff(a?: number|null, b?: number|null): number | null {
    if (a==null || b==null) return null; return b - a;
  }
  private pctError(meterDiff: number|null, refDiff: number|null): number | null {
    if (meterDiff==null || refDiff==null) return null;
    if (refDiff === 0) return null;
    return ((meterDiff - refDiff) / refDiff) * 100;
  }

  calcShunt(i: number): void {
    const r = this.batch.rows[i];
    const meter = this.diff(r.shunt_reading_before_test, r.shunt_reading_after_test);
    const ref   = this.diff(r.shunt_ref_start_reading, r.shunt_ref_end_reading);
    r.shunt_error_percentage = this.round2(this.pctError(meter, ref));
    this.calculateErrorPct(i);
  }

  calcNutral(i: number): void {
    const r = this.batch.rows[i];
    const meter = this.diff(r.nutral_reading_before_test, r.nutral_reading_after_test);
    const ref   = this.diff(r.nutral_ref_start_reading, r.nutral_ref_end_reading);
    r.nutral_error_percentage = this.round2(this.pctError(meter, ref));
    this.calculateErrorPct(i);
  }

  onErrorFromModeChanged(i:number){ this.calculateErrorPct(i); }

  calculateErrorPct(i:number): void {
    const r = this.batch.rows[i];
    let source: number | null = null;
    switch(r.error_from_mode){
      case 'SHUNT':  source = r.shunt_error_percentage ?? null; break;
      case 'NUTRAL': source = r.nutral_error_percentage ?? null; break;
      default:
        source = r.shunt_error_percentage ?? r.nutral_error_percentage ?? null;
    }
    r.error_percentage_import = this.round2(source);
  }

  private round2(v: number | null): number | null {
    if (v==null || !isFinite(v)) return null; return Math.round(v*100)/100;
  }

  // -------------------- validation --------------------
  private validateBeforeSubmit(): { ok: boolean; reason?: string } {
    const ctx = this.validateContext(); if (!ctx.ok) return ctx;
    if (!this.batch.header.date) return { ok:false, reason:'Testing Date is required.' };
    if (!this.batch.header.phase) return { ok:false, reason:'Phase is required.' };
    if (!this.testMethod) return { ok:false, reason:'Select a Test Method.' };
    if (!this.testStatus) return { ok:false, reason:'Select a Test Status.' };

    const rows = (this.batch.rows || []).filter(r => (r.serial || '').trim());
    if (!rows.length) return { ok:false, reason:'Enter at least one serial number.' };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.notFound) return { ok:false, reason:`Row #${i+1}: Serial not in assigned list.` };
      if (!r.assignment_id || !r.device_id) return { ok:false, reason:`Row #${i+1}: Missing assignment/device mapping.` };
      if (!r.test_result) return { ok:false, reason:`Row #${i+1}: Choose Test Result.` };
    }

    // Defaults
    this.batch.header.testing_bench = this.batch.header.testing_bench || '-';
    this.batch.header.testing_user = this.batch.header.testing_user || (localStorage.getItem('currentUserName') || '-');
    this.batch.header.approving_user = this.batch.header.approving_user || '-';
    return { ok:true };
  }

  // -------------------- payload --------------------
  private buildPayload(): any[] {
    const whenISO = this.isoOn(this.batch.header.date);
    return (this.batch.rows || [])
      .filter(r => (r.serial || '').trim())
      .map(r => ({
        device_id: r.device_id ?? 0,
        assignment_id: r.assignment_id ?? 0,
        start_datetime: whenISO,
        end_datetime: whenISO,

        physical_condition_of_device: r.physical_condition_of_device || null,
        seal_status: r.seal_status || null,
        meter_glass_cover: r.meter_glass_cover || null,
        terminal_block: r.terminal_block || null,
        meter_body: r.meter_body || null,
        other: null,
        is_burned: !!r.is_burned,

        details: r.remark || null,
        test_result: r.test_result || null,
        test_method: this.testMethod || null,
        test_status: this.testStatus || null,

        // SHUNT readings
        shunt_reading_before_test: this.numOrNull(r.shunt_reading_before_test),
        shunt_reading_after_test:  this.numOrNull(r.shunt_reading_after_test),
        shunt_ref_start_reading:  this.numOrNull(r.shunt_ref_start_reading),
        shunt_ref_end_reading:    this.numOrNull(r.shunt_ref_end_reading),
        shunt_error_percentage:   this.numOrNull(r.shunt_error_percentage),
        shunt_current_test: r.shunt_current_test || null,
        shunt_creep_test:  r.shunt_creep_test || null,
        shunt_dail_test:   r.shunt_dail_test || null,

        // NUTRAL readings
        nutral_reading_before_test: this.numOrNull(r.nutral_reading_before_test),
        nutral_reading_after_test:  this.numOrNull(r.nutral_reading_after_test),
        nutral_ref_start_reading:  this.numOrNull(r.nutral_ref_start_reading),
        nutral_ref_end_reading:    this.numOrNull(r.nutral_ref_end_reading),
        nutral_error_percentage:   this.numOrNull(r.nutral_error_percentage),
        nutral_current_test: r.nutral_current_test || null,
        nutral_creep_test:  r.nutral_creep_test || null,
        nutral_dail_test:   r.nutral_dail_test || null,

        // combined import error
        error_percentage_import: this.numOrNull(r.error_percentage_import),

        // consumer/fees
        consumer_name: r.consumer_name || null,
        consumer_address: r.address || null,
        testing_fees: this.parseAmount(r.payment_particulars),
        fees_mr_no: r.receipt_no || null,
        fees_mr_date: r.receipt_date || null,
        ref_no: r.account_no_ivrs || null,

        // removal info / P4
        meter_removaltime_reading: this.numOrNull(r.removal_reading),
        any_other_remarkny_zone: r.condition_at_removal || null,
        p4_metercodition: r.condition_at_removal || null,

        // Final remarks
        final_remarks: r.final_remarks || r.remark || null,

        approver_id: this.approverId ?? null,
        approver_remark: null,

        report_id: null,
        report_type: this.report_type || 'ONM_CHECKING',
        created_by: String(this.currentUserId || '')
      }));
  }

  // -------------------- submit + pdf --------------------
  openConfirm(action: ModalState['action']){
    this.inlineInfo=null; this.inlineError=null;
    if (action === 'submit') {
      const v = this.validateBeforeSubmit();
      if (!v.ok) { this.modal = { open:true, title:'Validation Errors', message:v.reason || '', action:null }; this.inlineError = v.reason || 'Validation failed.'; return; }
      this.payload = this.buildPayload();
      this.modal = { open:true, title:'Submit Batch Report — Preview', message:'', action:'submit' };
      return;
    }
    if (action === 'clear') {
      this.modal = { open:true, title:'Clear All Rows', message:'Clear all rows and leave one empty row?', action:'clear' };
      return;
    }
  }
  closeModal(){ this.modal.open=false; this.modal.action=null; this.modal.payload=undefined; }
  confirmModal(){
    const a = this.modal.action; if (!a) return;
    if (a==='clear'){ this.batch.rows=[]; this.addBatchRow(); this.closeModal(); return; }
    if (a==='submit'){ this.doSubmit(); }
  }
private doSubmit(): void {
  this.submitting = true;
  this.inlineError = null;
  this.inlineInfo = null;

  this.api.postTestReports(this.payload).subscribe({
    next: async () => {
      this.submitting = false;

      const header: P4ONMReportHeader = {
        date: this.batch.header.date || this.toYMD(new Date()),
        phase: this.batch.header.phase || '-',
        location_code: this.batch.header.location_code || '',
        location_name: this.batch.header.location_name || '',
        zone: `${this.batch.header.location_code || ''}${this.batch.header.location_code ? ' - ' : ''}${this.batch.header.location_name || ''}`,
        testing_bench: this.batch.header.testing_bench || '-',
        testing_user: this.batch.header.testing_user || (localStorage.getItem('currentUserName') || '-'),
        approving_user: this.batch.header.approving_user || '-',
        lab_name: this.labInfo?.lab_name || undefined,
        lab_address: this.labInfo?.address || undefined,
        lab_email: this.labInfo?.email || undefined,
        lab_phone: this.labInfo?.phone || undefined,
        leftLogoUrl: this.labInfo?.logo_left_url || '/assets/icons/wzlogo.png',
        rightLogoUrl: this.labInfo?.logo_right_url || '/assets/icons/wzlogo.png'
      };

      // build full PDF rows, not just slip bits
      const rows: P4ONMReportRow[] = (this.batch.rows || [])
        .filter(r => (r.serial || '').trim())
        .map(r => ({
          serial: r.serial,
          make: r.make,
          capacity: r.capacity,
          removal_reading: this.numOrNull(r.removal_reading) ?? undefined,

          consumer_name: r.consumer_name,
          account_no_ivrs: r.account_no_ivrs,
          address: r.address,
          p4onm_by: r.p4onm_by,
          payment_particulars: r.payment_particulars,
          receipt_no: r.receipt_no,
          receipt_date: r.receipt_date,
          condition_at_removal: r.condition_at_removal,

          testing_date: this.batch.header.date,
          physical_condition_of_device: r.physical_condition_of_device || undefined,
          is_burned: !!r.is_burned,
          seal_status: r.seal_status || undefined,
          meter_glass_cover: r.meter_glass_cover || undefined,
          terminal_block: r.terminal_block || undefined,
          meter_body: r.meter_body || undefined,
          other: undefined,

          // shunt
          shunt_reading_before_test: this.numOrNull(r.shunt_reading_before_test),
          shunt_reading_after_test: this.numOrNull(r.shunt_reading_after_test),
          shunt_ref_start_reading: this.numOrNull(r.shunt_ref_start_reading),
          shunt_ref_end_reading: this.numOrNull(r.shunt_ref_end_reading),
          shunt_current_test: r.shunt_current_test || undefined,
          shunt_creep_test: r.shunt_creep_test || undefined,
          shunt_dail_test: r.shunt_dail_test || undefined,
          shunt_error_percentage: this.numOrNull(r.shunt_error_percentage),

          // neutral
          nutral_reading_before_test: this.numOrNull(r.nutral_reading_before_test),
          nutral_reading_after_test: this.numOrNull(r.nutral_reading_after_test),
          nutral_ref_start_reading: this.numOrNull(r.nutral_ref_start_reading),
          nutral_ref_end_reading: this.numOrNull(r.nutral_ref_end_reading),
          nutral_current_test: r.nutral_current_test || undefined,
          nutral_creep_test: r.nutral_creep_test || undefined,
          nutral_dail_test: r.nutral_dail_test || undefined,
          nutral_error_percentage: this.numOrNull(r.nutral_error_percentage),

          // final / combined error
          error_percentage_import: this.numOrNull(r.error_percentage_import) ?? undefined,

          // legacy fields if present (kept for compatibility)
          reading_before_test: null,
          reading_after_test: null,
          rsm_kwh: null,
          meter_kwh: null,
          error_percentage: null,

          final_remarks: r.final_remarks || r.remark || undefined
        }));

      try {
        await this.pdfSvc.downloadFromBatch(header, rows, {
          fileName: `P4_ONM_${header.date}.pdf`
        });
        this.inlineInfo = 'Batch Report submitted and PDF downloaded successfully!';
      } catch {
        this.inlineInfo = 'Batch Report submitted successfully!';
        this.inlineError = 'PDF generation failed.';
      }

      // reset rows for next batch
      this.batch.rows = [this.emptyRow()];
      this.closeModal();
    },
    error: (e) => {
      this.submitting = false;
      const msg =
        (e?.error && (e.error.detail || e.error.message)) ||
        (typeof e?.error === 'string' ? e.error : '') ||
        e?.statusText ||
        'Error submitting report.';
      this.inlineError = `Submit failed (HTTP ${e?.status || 400}). ${msg}`;
      console.error('HttpErrorResponse', e);
    }
  });
}


}
