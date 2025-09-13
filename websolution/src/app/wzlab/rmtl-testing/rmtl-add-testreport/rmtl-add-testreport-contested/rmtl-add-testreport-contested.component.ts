import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import {
  ContestedReportPdfService,
  ContestedReportHeader,
  ContestedReportRow
} from 'src/app/shared/contested-report-pdf.service';

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

  // NEW (from API for header autofill)
  testing_bench?: { bench_name?: string } | null;
  user_assigned?: { name?: string } | null;
  assigned_by_user?: { name?: string } | null;
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

  // AE/JE Zone sheet
  form_no?: string;
  form_date?: string;
  consumer_name?: string;
  account_no_ivrs?: string;
  address?: string;
  contested_by?: string;
  payment_particulars?: string;
  receipt_no?: string;
  receipt_date?: string;
  condition_at_removal?: string;
  removal_reading?: number;

  // RMTL section
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
  // enums/options
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

  // ids
  currentUserId = 0;
  currentLabId = 0;

  // ui state
  filterText = '';
  loading = false;
  submitting = false;
  modal: ModalState = { open: false, title: '', message: '', action: null };
  alertSuccess: string | null = null;
  alertError: string | null = null;
  payload: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;
  approverId: number | null = null;

  report_type = 'CONTESTED';

  // serial index from assigned list
  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: number; assignment_id: number; phase?: string; }> = {};

  // NEW — lab info for PDF header
  labInfo: { lab_name?: string; address?: string; email?: string; phone?: string } | null = null;

  // NEW — device picker state
  picking = false;
  pickerLoading = false;
  pickerAssignments: AssignmentItem[] = [];
  pickerSelected: Record<number, boolean> = {};

  constructor(private api: ApiServicesService, private reportPdf: ContestedReportPdfService) {}

  ngOnInit(): void {
    this.batch.header.date = this.toYMD(new Date());
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
        this.report_type = d?.test_report_types?.CONTESTED || 'CONTESTED';
        this.phases = d?.phases || [];
      }
    });

    this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    this.currentLabId  = Number(localStorage.getItem('currentLabId') || 0);

    // Lab info for PDF header/bench list
    this.api.getLabInfo(this.currentLabId).subscribe({
      next: (info: any) => {
        this.labInfo = {
          lab_name: info?.lab_pdfheader_name || info?.lab_name,
          address: info?.address || info?.address_line,
          email: info?.email,
          phone: info?.phone
        };
      }
    });

    // Build assigned cache only
    this.doReloadAssignedWithoutAddingRows();
  }

  // ---------- Counts ----------
  get totalCount(){ return this.batch?.rows?.length ?? 0; }
  get matchedCount(){ return (this.batch?.rows ?? []).filter(r => !!r.serial && !r.notFound).length; }
  get unknownCount(){ return (this.batch?.rows ?? []).filter(r => !!r.notFound).length; }

  // ---------- Assigned cache ----------
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
    this.loading = true;
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        this.loadDataWithoutAddingRows(asg);

        const first = asg.find(a => a.device);
        if (first?.device) {
          this.batch.header.location_code = first.device.location_code ?? '';
          this.batch.header.location_name = first.device.location_name ?? '';
          this.batch.header.testing_bench = first.testing_bench?.bench_name ?? '';
          this.batch.header.testing_user = first.user_assigned?.name ?? '';
          this.batch.header.approving_user = first.assigned_by_user?.name ?? '';
        }
        if (!this.batch.header.phase) {
          const uniq = new Set(asg.map(a => (a.device?.phase || '').toUpperCase()).filter(Boolean));
          this.batch.header.phase = uniq.size === 1 ? [...uniq][0] : '';
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  // ---------- Device picker ----------
  openPicker(): void {
    this.picking = true;
    this.pickerLoading = true;
    this.pickerSelected = {};
    this.pickerAssignments = [];

    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data: any) => {
        const list: AssignmentItem[] = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
        this.pickerAssignments = list;
        this.pickerLoading = false;

        const first = list.find(a => a.device);
        if (first?.device) {
          this.batch.header.location_code = first.device.location_code ?? '';
          this.batch.header.location_name = first.device.location_name ?? '';
          this.batch.header.testing_bench = first.testing_bench?.bench_name ?? '';
          this.batch.header.testing_user = first.user_assigned?.name ?? '';
          this.batch.header.approving_user = first.assigned_by_user?.name ?? '';
        }

        this.rebuildSerialIndex(list);
      },
      error: () => { this.pickerLoading = false; }
    });
  }
  closePicker(): void { this.picking = false; }

  get allPicked(): boolean {
    return this.pickerAssignments.length > 0 &&
           this.pickerAssignments.every(a => !!this.pickerSelected[a.id]);
  }
  togglePickAll(checked: boolean): void {
    this.pickerAssignments.forEach(a => this.pickerSelected[a.id] = checked);
  }
  addPickedToRows(): void {
    const chosen = this.pickerAssignments.filter(a => this.pickerSelected[a.id]);
    const existing = new Set(this.batch.rows.map(r => (r.serial || '').toUpperCase().trim()));

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
    });

    if (!this.batch.rows.length) this.addBatchRow();
    this.closePicker();
  }

  trackAssignment(_: number, a: AssignmentItem) { return a.id; }

  // ---------- Rows ----------
  private emptyRow(seed?: Partial<DeviceRow>): DeviceRow {
    return {
      serial: '', make: '', capacity: '', remark: '', test_result: undefined, test_method: 'MANUAL',
      device_id: 0, assignment_id: 0, notFound: false,

      form_no: '', form_date: '',
      consumer_name: '', account_no_ivrs: '', address: '', contested_by: '', payment_particulars: '',
      receipt_no: '', receipt_date: '', condition_at_removal: '', removal_reading: undefined,

      testing_date: '', physical_condition_of_device: '', seal_status: '', meter_glass_cover: '',
      terminal_block: '', meter_body: '', other: '', is_burned: false,

      reading_before_test: 0, reading_after_test: 0, ref_start_reading: 0, ref_end_reading: 0, error_percentage: 0,
      rsm_kwh: undefined, meter_kwh: undefined, starting_current_test: '', creep_test: '',
      _open: false, ...seed
    };
  }

  addBatchRow(){ this.batch.rows.push(this.emptyRow()); }
  removeRow(i: number){ this.batch.rows.splice(i,1); if (!this.batch.rows.length) this.addBatchRow(); } // immediate remove (no modal)
  private doClearRows(){ this.batch.rows = []; this.addBatchRow(); }

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

  // ---------- Utils ----------
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

  // ---------- Payload (map to backend Testing model columns) ----------
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
          ref_start_reading: this.numOrNull(r.ref_start_reading),
          ref_end_reading: this.numOrNull(r.ref_end_reading),
          error_percentage: this.numOrNull(r.error_percentage),

          details: r.remark || null,

          test_result: (r.test_result as string) || null,
          test_method: this.testMethod || null,
          test_status: this.testStatus || null,

          // extra contested fields
          consumer_name: r.consumer_name || null,
          consumer_address: r.address || null,
          testing_fees: this.parseAmount(r.payment_particulars),
          fees_mr_no: r.receipt_no || null,
          fees_mr_date: r.receipt_date || null,
          ref_no: r.account_no_ivrs || null,

          start_reading: this.numOrNull(r.reading_before_test),
          final_reading: this.numOrNull(r.reading_after_test),
          difference: diff,

          test_requester_name: r.contested_by || null,
          meter_removaltime_reading: this.numOrNull(r.removal_reading),
          any_other_remarkny_zone: r.condition_at_removal || null,

          dail_test_kwh_rsm: this.numOrNull(r.rsm_kwh),
          recorderedbymeter_kwh: this.numOrNull(r.meter_kwh),
          final_remarks: r.remark || null,

          p4_metercodition: r.condition_at_removal || null,

          approver_id: this.approverId ?? null,
          report_type: this.report_type || 'CONTESTED',

          created_by: String(this.currentUserId || ''),
        };
      });
  }

  // ---------- Submit & PDF ----------
  private doSubmitBatch(): void {
    this.payload = this.buildPayloadForPreview();
    if (!this.payload.length){
      this.alertError='No valid rows to submit.'; this.alertSuccess=null; return;
    }
    const missing = this.payload.findIndex(p => !p.test_result);
    if (missing!==-1){
      this.alertError = `Row #${missing+1} is missing Test Result (PASS/FAIL).`;
      this.alertSuccess=null; return;
    }

    this.submitting = true; this.alertSuccess=null; this.alertError=null;
    this.api.postTestReports(this.payload).subscribe({
      next: async () => {
        this.submitting = false;

        // Build PDF (service) from current batch rows
        const header: ContestedReportHeader = {
          date: this.batch.header.date || this.toYMD(new Date()),
          phase: this.batch.header.phase || '',
          location_code: this.batch.header.location_code || '',
          location_name: this.batch.header.location_name || '',
          zone: this.joinNonEmpty([this.batch.header.location_code, this.batch.header.location_name], ' - '),
          testerName: localStorage.getItem('currentUserName') || '',
          testing_bench: this.batch.header.testing_bench || '-',
          testing_user: this.batch.header.testing_user || (localStorage.getItem('currentUserName') || ''),
          approving_user: this.batch.header.approving_user || '-',
          lab_name: this.labInfo?.lab_name,
          lab_address: this.labInfo?.address,
          lab_email: this.labInfo?.email,
          lab_phone: this.labInfo?.phone,
          leftLogoUrl: '/assets/icons/wzlogo.png',
          // rightLogoUrl: '/assets/icons/wzlogo.png'
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

            reading_before_test: this.numOrNull(r.reading_before_test) ?? undefined,
            reading_after_test: this.numOrNull(r.reading_after_test) ?? undefined,

            rsm_kwh: this.numOrNull(r.rsm_kwh) ?? undefined,
            meter_kwh: this.numOrNull(r.meter_kwh) ?? undefined,
            error_percentage: this.numOrNull(r.error_percentage) ?? undefined,

            starting_current_test: r.starting_current_test || undefined,
            creep_test: r.creep_test || undefined,

            remark: r.remark || undefined
          }));

        await this.reportPdf.downloadFromBatch(header, rows, { fileName: `CONTESTED_${header.date}.pdf` });

        this.alertSuccess = 'Batch Report submitted successfully!';
        this.alertError = null;
        this.batch.rows = [this.emptyRow()];
        setTimeout(()=>this.closeModal(),1200);
      },
      error: (e) => {
        this.submitting=false; this.alertSuccess=null; this.alertError='Error submitting report.'; console.error(e);
      }
    });
  }

  // ---------- Modal (submit / clear only) ----------
  openConfirm(action: ModalState['action']){
    if (action!=='submit'){ this.alertSuccess=null; this.alertError=null; }
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
    if(a!=='submit') this.closeModal();
    if(a==='clear') this.doClearRows();
    if(a==='submit') this.doSubmitBatch();
  }
}
