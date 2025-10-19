import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { P4onmReportPdfService, P4ONMReportHeader, P4ONMReportRow } from 'src/app/shared/p4onm-report-pdf.service';

type TDocumentDefinitions = any;

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
  serial: string;
  make: string;
  capacity: string;
  remark: string;
  test_result?: string;
  test_method: 'MANUAL' | 'AUTOMATED';
  test_status?: string;
  device_id: number;
  assignment_id: number;
  notFound?: boolean;

  form_no?: string;
  form_date?: string;
  consumer_name?: string;
  account_no_ivrs?: string;
  address?: string;
  p4onm_by?: string;
  payment_particulars?: string;
  receipt_no?: string;
  receipt_date?: string;
  condition_at_removal?: string;
  removal_reading?: number;

  testing_date?: string;
  physical_condition_of_device: string;
  seal_status: string;
  meter_glass_cover: string;
  terminal_block: string;
  meter_body: string;
  other: string;
  is_burned: boolean;

  reading_before_test: number;
  reading_after_test: number;
  ref_start_reading: number;
  ref_end_reading: number;
  error_percentage: number;

  rsm_kwh?: number;
  meter_kwh?: number;
  starting_current_test?: string;
  creep_test?: string;
  dial_testby?: string;

  _open?: boolean;
}
interface ModalState {
  open: boolean; title: string; message: string;
  action: 'clear' | 'submit' | 'pick' | null | string[];
  payload?: any;
}

@Component({
  selector: 'app-rmtl-add-testreport-p4onm',
  templateUrl: './rmtl-add-testreport-p4onm.component.html',
  styleUrls: ['./rmtl-add-testreport-p4onm.component.css']
})
export class RmtlAddTestreportP4onmComponent implements OnInit {
  // enums/options
  device_status: 'ASSIGNED' = 'ASSIGNED';
  comment_bytester: any[] = [];
  test_methods: any[] = [];
  test_statuses: any[] = [];
  test_results: any[] = [];
  physical_conditions: any[] = []; seal_statuses: any[] = []; glass_covers: any[] = [];
  terminal_blocks: any[] = []; meter_bodies: any[] = []; makes: any[] = []; capacities: any[] = [];
  phases: any;

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

  // source
  office_types: string[] = [];
  selectedSourceType: string = '';
  selectedSourceName: string = '';
  filteredSources: any;

  // ids / context
  currentUserId:any;
  currentLabId :any;
  device_testing_purpose: any | null = null;
  device_type: any | null = null;

  // ui
  filterText = ''; loading = false; submitting = false;
  modal: ModalState = { open: false, title: '', message: '', action: null };
  alertSuccess: string | null = null; alertError: string | null = null;
  payload: any[] = []; testMethod: string | null = null; testStatus: string | null = null;
  approverId: number | null = null;
  report_type = 'ONM_CHECKING';

  // serial index
  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: number; assignment_id: number; phase?: string; }> = {};

  // picker state
  picking = false;
  pickerLoading = false;
  pickerAssignments: AssignmentItem[] = [];
  pickerSelected: Record<number, boolean> = {};
  pickerFilter = '';
  ternal_testing_types: any;
  fees_mtr_cts: any;
  test_dail_current_cheaps: any;

  constructor(private api: ApiServicesService, 
    private pdfSvc: P4onmReportPdfService,
    private authService: AuthService
  ) {}

  // -------------------- lifecycle --------------------
  ngOnInit(): void {
    this.batch.header.date = this.toYMD(new Date());

    // ids from storage
    // this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    // this.currentLabId  = Number(localStorage.getItem('currentLabId') || 0);
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
        this.office_types = d?.office_types || [];
        this.report_type = d?.test_report_types?.ONM_CHECKING ?? 'ONM_CHECKING';
        this.phases = d?.phases || [];

        // ✅ critical context defaults
        this.device_testing_purpose = d?.test_report_types?.ONM_CHECKING ?? 'ONM_CHECKING';
        this.device_type = d?.device_types?.METER ?? 'METER';
        this.ternal_testing_types = d?.ternal_testing_types || [];
        this.fees_mtr_cts= d?.fees_mtr_cts || [];
        this.test_dail_current_cheaps = d?.test_dail_current_cheaps || [];


        this.doReloadAssignedWithoutAddingRows();
      },
      error: () => {
        this.alertError = 'Failed to load configuration (enums). Please reload.';
      }
    });

    // lab info
    if (this.currentLabId) {
      this.api.getLabInfo(this.currentLabId).subscribe({
        next: (info: any) => {
          this.labInfo = {
            lab_name: info?.lab_pdfheader_name || info?.lab_name,
            address: info?.address || info?.address_line,
            email: info?.email,
            phone: info?.phone,
            logo_left_url: info?.logo_left_url,
            logo_right_url: info?.logo_right_url
          };
        }
      });
    }
  }

  // ---------- Source fetch ----------
  fetchButtonData(): void {
    if (!this.selectedSourceType || !this.selectedSourceName) {
      this.modal = { open: true, title: 'Missing Input', message: 'Please select Source Type and enter Location/Store/Vendor Code.', action: null };
      return;
    }
    this.api.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
      next: (data) => (this.filteredSources = data),
      error: () => this.modal = { open: true, title: 'Error', message: 'Failed to fetch source details. Check the code and try again.', action: null }
    });
  }

  onSourceTypeChange(): void {
    this.selectedSourceName = '';
    this.filteredSources = null;
  }

  // -------------------- validation/guards --------------------
  private validateContextForAssignments(): { ok: boolean; reason?: string } {
    if (!this.currentUserId || !this.currentLabId) {
      return { ok: false, reason: 'Missing User/Lab context. Make sure you are logged in and a lab is selected.' };
    }
    if (!this.device_type || !this.device_testing_purpose) {
      return { ok: false, reason: 'Missing Device Type / Testing Purpose. Reload configuration.' };
    }
    return { ok: true };
  }

  private validateBeforeSubmit(): { ok: boolean; reason?: string } {
    const ctx = this.validateContextForAssignments();
    if (!ctx.ok) return ctx;

    if (!this.batch.header.date) return { ok: false, reason: 'Testing Date is required.' };
    if (!this.batch.header.phase) return { ok: false, reason: 'Phase is required.' };
    if (!this.testMethod) return { ok: false, reason: 'Select a Test Method.' };
    if (!this.testStatus) return { ok: false, reason: 'Select a Test Status.' };

    const rows = (this.batch.rows || []).filter(r => (r.serial || '').trim());
    if (!rows.length) return { ok: false, reason: 'Enter at least one serial number.' };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.notFound) return { ok: false, reason: `Row #${i + 1}: Serial not in assigned list.` };
      if (!r.assignment_id || !r.device_id) return { ok: false, reason: `Row #${i + 1}: Missing assignment/device mapping.` };
      if (!r.test_result) return { ok: false, reason: `Row #${i + 1}: Choose Test Result.` };
    }

    // Ensure non-null display values
    this.batch.header.testing_bench = this.batch.header.testing_bench || '-';
    this.batch.header.testing_user = this.batch.header.testing_user || (localStorage.getItem('currentUserName') || '-');
    this.batch.header.approving_user = this.batch.header.approving_user || '-';

    return { ok: true };
  }

  // -------------------- counts --------------------
  get totalCount(){ return this.batch?.rows?.length ?? 0; }
  get matchedCount(){ return (this.batch?.rows ?? []).filter(r => !!r.serial && !r.notFound).length; }
  get unknownCount(){ return (this.batch?.rows ?? []).filter(r => !!r.notFound).length; }

  // -------------------- assigned cache --------------------
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
      // Zone/name might be provided from source; keep header if set, else use assignment-derived
      this.batch.header.location_code = this.batch.header.location_code || first.device.location_code || '';
      this.batch.header.location_name = this.batch.header.location_name || first.device.location_name || '';
      this.batch.header.testing_bench = first.testing_bench?.bench_name || this.batch.header.testing_bench || '-';
      this.batch.header.testing_user =
        first.user_assigned?.name || first.user_assigned?.username || this.batch.header.testing_user || (localStorage.getItem('currentUserName') || '-');
      this.batch.header.approving_user =
        first.assigned_by_user?.name || first.assigned_by_user?.username || this.batch.header.approving_user || '-';
    }
    if (!this.batch.header.phase) {
      const uniq = new Set(asg.map(a => (a.device?.phase || '').toUpperCase()).filter(Boolean));
      this.batch.header.phase = uniq.size === 1 ? [...uniq][0] : this.batch.header.phase || '';
    }
  }

  private loadDataWithoutAddingRows(asg: AssignmentItem[]): void {
    this.rebuildSerialIndex(asg);
    this.loadHeaderFromAssignments(asg);
  }

  doReloadAssignedWithoutAddingRows(): void {
    const v = this.validateContextForAssignments();
    if (!v.ok) { this.alertError = v.reason || 'Context invalid.'; return; }

    this.loading = true;
    this.api.getAssignedMeterList(
      this.device_status, this.currentUserId, this.currentLabId, this.device_testing_purpose, this.device_type
    ).subscribe({
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        this.loadDataWithoutAddingRows(asg);
        this.loading = false;
        this.alertSuccess = `Assigned devices loaded (${asg.length}).`;
      },
      error: () => { this.loading = false; this.alertError = 'Assigned list load failed.'; }
    });
  }

  // -------------------- picker (search + sort) --------------------
  openPicker(): void {
    const v = this.validateContextForAssignments();
    if (!v.ok) { this.alertError = v.reason || 'Context invalid.'; return; }

    this.picking = true;
    this.pickerLoading = true;
    this.pickerSelected = {};
    this.pickerAssignments = [];
    this.pickerFilter = '';

    this.api.getAssignedMeterList(
      this.device_status, this.currentUserId, this.currentLabId, this.device_testing_purpose, this.device_type
    ).subscribe({
      next: (data: any) => {
        const list: AssignmentItem[] = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
        this.pickerAssignments = list;
        this.pickerLoading = false;

        this.loadHeaderFromAssignments(list);
        this.rebuildSerialIndex(list);
        this.modal = { open: true, title: 'Select Assigned Devices', message: '', action: 'pick', payload: null };
      },
      error: () => { this.pickerLoading = false; this.alertError = 'Could not load assigned devices.'; }
    });
  }

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
    this.closeModal();
    this.alertSuccess = added ? `${added} device(s) added to the batch.` : 'No new devices were added (duplicates or none selected).';
  }

  // -------------------- rows --------------------
  private emptyRow(seed?: Partial<DeviceRow>): DeviceRow {
    return {
      serial: '', make: '', capacity: '', remark: '', test_result: undefined, test_method: 'MANUAL',
      device_id: 0, assignment_id: 0, notFound: false,

      form_no: '', form_date: '',
      consumer_name: '', account_no_ivrs: '', address: '', p4onm_by: '', payment_particulars: '',
      receipt_no: '', receipt_date: '', condition_at_removal: '', removal_reading: undefined,

      testing_date: '', physical_condition_of_device: '', seal_status: '', meter_glass_cover: '',
      terminal_block: '', meter_body: '', other: '', is_burned: false,

      reading_before_test: 0, reading_after_test: 0, ref_start_reading: 0, ref_end_reading: 0, error_percentage: 0,
      rsm_kwh: undefined, meter_kwh: undefined, starting_current_test: '', creep_test: '',
      _open: false, ...seed
    };
  }

  addBatchRow(){ this.batch.rows.push(this.emptyRow()); }
  doRemoveRow(i: number){ this.batch.rows.splice(i,1); if (!this.batch.rows.length) this.addBatchRow(); }

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

  // -------------------- utils --------------------
  private toYMD(d: Date){ const dt = new Date(d.getTime() - d.getTimezoneOffset()*60000); return dt.toISOString().slice(0,10); }
  private isoOn(dateStr?: string){ const d = dateStr? new Date(dateStr+'T10:00:00') : new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString(); }
  private numOrNull(v: any): number | null { const n = Number(v); return isFinite(n) ? n : null; }
  private parseAmount(val?: string): number | null {
    if (!val) return null;
    const m = val.replace(/,/g,'').match(/(\d+(\.\d+)?)/);
    return m ? Number(m[1]) : null;
  }
  private joinNonEmpty(parts: Array<string | undefined | null>, sep = ' - ') {
    return parts.filter(Boolean).join(sep);
  }

  // -------------------- payload --------------------
  private buildPayloadForPreview(): any[] {
    const whenISO = this.isoOn(this.batch.header.date);

    return (this.batch.rows || [])
      .filter(r => (r.serial || '').trim())
      .map(r => {
        const start = this.numOrNull(r.reading_before_test);
        const end   = this.numOrNull(r.reading_after_test);
        const diff  = (start != null && end != null) ? (end - start) : null;

        return {
          device_id: r.device_id ?? 0,
          assignment_id: r.assignment_id ?? 0,
          start_datetime: whenISO,
          end_datetime: whenISO,

          physical_condition_of_device: r.physical_condition_of_device || null,
          seal_status: r.seal_status || null,
          meter_glass_cover: r.meter_glass_cover || null,
          terminal_block: r.terminal_block || null,
          meter_body: r.meter_body || null,
          other: r.other || null,
          is_burned: !!r.is_burned,

          reading_before_test: this.numOrNull(r.reading_before_test),
          reading_after_test: this.numOrNull(r.reading_after_test),

          details: r.remark || null,
          test_result: (r.test_result as string) || null,
          test_method: this.testMethod || null,
          ref_start_reading: this.numOrNull(r.ref_start_reading),
          ref_end_reading: this.numOrNull(r.ref_end_reading),
          test_status: this.testStatus || null,
          error_percentage: this.numOrNull(r.error_percentage),

          consumer_name: r.consumer_name || null,
          consumer_address: r.address || null,
          certificate_number: null,

          testing_fees: this.parseAmount(r.payment_particulars),
          fees_mr_no: r.receipt_no || null,
          fees_mr_date: r.receipt_date || null,
          ref_no: r.account_no_ivrs || null,

          start_reading: this.numOrNull(r.reading_before_test),
          final_reading: this.numOrNull(r.reading_after_test),
          final_reading_export: null,
          difference: diff,

          test_requester_name: r.p4onm_by || null,
          meter_removaltime_reading: this.numOrNull(r.removal_reading),
          meter_removaltime_metercondition: null,
          any_other_remarkny_zone: r.condition_at_removal || null,

          dail_test_kwh_rsm: this.numOrNull(r.rsm_kwh),
          recorderedbymeter_kwh: this.numOrNull(r.meter_kwh),
          starting_current_test: null,
          creep_test: null,
          dail_test: null,
          final_remarks: r.remark || null,

          p4_division: null,
          p4_no: null,
          p4_date: null,
          p4_metercodition: r.condition_at_removal || null,

          approver_id: this.approverId ?? null,
          approver_remark: null,

          report_id: null,
          report_type: this.report_type || 'ONM_CHECKING',

          created_by: String(this.currentUserId || '')
        };
      });
  }

  // -------------------- submit & pdf --------------------
  private doSubmitBatch(): void {
    const v = this.validateBeforeSubmit();
    if (!v.ok) { this.alertError = v.reason || 'Validation failed.'; this.alertSuccess = null; return; }

    this.payload = this.buildPayloadForPreview();

    this.submitting = true; this.alertSuccess=null; this.alertError=null;
    this.api.postTestReports(this.payload).subscribe({
      next: async () => {
        this.submitting = false;

        const header: P4ONMReportHeader = {
          date: this.batch.header.date || this.toYMD(new Date()),
          phase: this.batch.header.phase || '-',
          location_code: this.batch.header.location_code || '',
          location_name: this.batch.header.location_name || '',
          zone: this.joinNonEmpty([this.batch.header.location_code, this.batch.header.location_name], ' - '),

          testing_bench: this.batch.header.testing_bench || '-',
          testing_user: this.batch.header.testing_user || (localStorage.getItem('currentUserName') || '-'),
          approving_user: this.batch.header.approving_user || '-',

          lab_name: this.labInfo?.lab_name,
          lab_address: this.labInfo?.address,
          lab_email: this.labInfo?.email,
          lab_phone: this.labInfo?.phone,

          leftLogoUrl: this.labInfo?.logo_left_url || '/assets/icons/wzlogo.png',
          rightLogoUrl: this.labInfo?.logo_right_url || '/assets/icons/wzlogo.png'
        };

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

            testing_date: r.testing_date || this.batch.header.date,
            physical_condition_of_device: r.physical_condition_of_device,
            is_burned: !!r.is_burned,
            seal_status: r.seal_status,
            meter_glass_cover: r.meter_glass_cover,
            terminal_block: r.terminal_block,
            meter_body: r.meter_body,
            other: r.other,

            reading_before_test: this.numOrNull(r.reading_before_test) ?? undefined,
            reading_after_test: this.numOrNull(r.reading_after_test) ?? undefined,

            rsm_kwh: this.numOrNull(r.rsm_kwh) ?? undefined,
            meter_kwh: this.numOrNull(r.meter_kwh) ?? undefined,
            error_percentage: this.numOrNull(r.error_percentage) ?? undefined,

            starting_current_test: r.starting_current_test || undefined,
            creep_test: r.creep_test || undefined,

            remark: r.remark || undefined
          }));

        try {
          await this.pdfSvc.downloadFromBatch(header, rows, { fileName: `P4_ONM_${header.date}.pdf` });
          this.alertSuccess = 'Batch Report submitted and PDF downloaded successfully!';
        } catch {
          this.alertSuccess = 'Batch Report submitted successfully!';
          this.alertError = 'PDF generation failed.';
        }

        this.batch.rows = [this.emptyRow()];
        setTimeout(()=>this.closeModal(), 1000);
      },
      error: (e) => {
        this.submitting=false; this.alertSuccess=null;
        const msg =
          (e?.error && (e.error.detail || e.error.message)) ||
          (typeof e?.error === 'string' ? e.error : '') ||
          e?.statusText || 'Error submitting report.';
        this.alertError = `Submit failed (HTTP ${e?.status || 400}). ${msg}`;
        console.error('HttpErrorResponse', e);
      }
    });
  }

  // -------------------- modal --------------------
  openConfirm(action: ModalState['action'], payload?: any){
    if (action!=='submit'){ this.alertSuccess=null; this.alertError=null; }
    if (action === 'pick') { this.openPicker(); return; }

    if (action === 'submit') {
      const v = this.validateBeforeSubmit();
      if (!v.ok) {
        this.modal = { open: true, title:'Validation Errors', message: v.reason || '', action: null };
        this.alertError = v.reason || 'Validation failed.';
        return;
      }
    }

    switch(action){
      case 'clear':
        this.modal = { open: true, title:'Clear All Rows', message:'Clear all rows and leave one empty row?', action:'clear' };
        break;
      case 'submit':
        this.payload=this.buildPayloadForPreview();
        this.modal = { open: true, title:'Submit Batch Report — Preview', message:'', action:'submit' };
        break;
      default:
        this.modal = { open:false, title:'', message:'', action:null };
    }
  }
  closeModal(){ this.modal.open=false; this.modal.action=null; this.modal.payload=undefined; }
  confirmModal(){
    const a=this.modal.action;
    if(a!=='submit' && a!=='pick') this.closeModal();
    if(a==='clear') { this.batch.rows = []; this.addBatchRow(); this.closeModal(); }
    if(a==='submit') this.doSubmitBatch();
    if(a==='pick') this.addPickedToRows();
  }
}
