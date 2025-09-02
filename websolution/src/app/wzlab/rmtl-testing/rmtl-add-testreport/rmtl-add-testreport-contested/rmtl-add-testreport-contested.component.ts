import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { ContestedReportPdfService, ContestedReportHeader, ContestedReportRow } from 'src/app/shared/contested-report-pdf.service';

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
interface AssignmentItem { id: number; device_id: number; device?: MeterDevice | null; }

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
  open: boolean; title: string; message: string;
  action: 'clear' | 'reload' | 'removeRow' | 'submit' | null | string[]; payload?: any;
}

@Component({
  selector: 'app-rmtl-add-testreport-contested',
  templateUrl: './rmtl-add-testreport-contested.component.html',
  styleUrls: ['./rmtl-add-testreport-contested.component.css']
})
export class RmtlAddTestreportContestedComponent implements OnInit {
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
  batch = { header: { zone: '', phase: '', date: '', location_code: '', location_name: '' }, rows: [] as DeviceRow[] };

  // ids
  currentUserId = 0; currentLabId = 0;

  // ui state
  filterText = ''; loading = false; submitting = false;
  modal: ModalState = { open: false, title: '', message: '', action: null };
  alertSuccess: string | null = null; alertError: string | null = null;
  payload: any[] = []; testMethod: string | null = null; testStatus: string | null = null;
  approverId: number | null = null;

  report_type = 'CONTESTED';

  // serial index from assigned list
  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: number; assignment_id: number; phase?: string; }> = {};

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

  doReloadAssigned(): void {
    this.loading = true;
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        this.rebuildSerialIndex(asg);

        this.batch.rows = asg.map(a => {
          const d = a.device || ({} as MeterDevice);
          return this.emptyRow({
            serial: d.serial_number || '',
            make: d.make || '',
            capacity: d.capacity || '',
            device_id: d.id ?? a.device_id ?? 0,
            assignment_id: a.id ?? 0,
            notFound: false
          });
        });

        if (!this.batch.rows.length) this.addBatchRow();
        if (!this.batch.header.phase) {
          const uniq = new Set(asg.map(a => (a.device?.phase || '').toUpperCase()).filter(Boolean));
          this.batch.header.phase = uniq.size === 1 ? [...uniq][0] : '';
        }
        const first = asg.find(a => a.device);
        if (first?.device) {
          this.batch.header.location_code = first.device.location_code ?? '';
          this.batch.header.location_name = first.device.location_name ?? '';
        }
        this.loading = false;
      },
      error: () => { this.batch.rows = [this.emptyRow()]; this.loading = false; }
    });
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
  private doRemoveRow(i: number){ this.batch.rows.splice(i,1); }
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
          // required keys
          device_id: r.device_id ?? 0,
          assignment_id: r.assignment_id ?? 0,
          start_datetime: whenISO,
          end_datetime: whenISO,

          // classic testing fields
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

          details: r.remark || null, // free text

          test_result: (r.test_result as string) || null,
          test_method: this.testMethod || null,
          test_status: this.testStatus || null,

          // ---- Newly added columns in Testing model ----
          consumer_name: r.consumer_name || null,
          consumer_address: r.address || null,

          certificate_number: null, // not captured in UI
          testing_fees: this.parseAmount(r.payment_particulars),
          fees_mr_no: r.receipt_no || null,
          fees_mr_date: r.receipt_date || null, // YYYY-MM-DD (date field on backend)
          ref_no: r.account_no_ivrs || null,

          start_reading: this.numOrNull(r.reading_before_test),
          final_reading: this.numOrNull(r.reading_after_test),
          final_reading_export: null,
          difference: diff,

          test_requester_name: r.contested_by || null,
          meter_removaltime_reading: this.numOrNull(r.removal_reading),
          meter_removaltime_metercondition: null, // model expects number; keep null (text mapped below)
          any_other_remarkny_zone: r.condition_at_removal || null,

          dail_test_kwh_rsm: this.numOrNull(r.rsm_kwh),
          recorderedbymeter_kwh: this.numOrNull(r.meter_kwh),
          starting_current_test: null, // model is number; UI gives text, keep null
          creep_test: null,            // model is number; UI gives text, keep null
          dail_test: null,
          final_remarks: r.remark || null,

          p4_division: null,
          p4_no: null,
          p4_date: null,
          p4_metercodition: r.condition_at_removal || null,

          approver_id: this.approverId ?? null,
          approver_remark: null,

          report_id: null,
          report_type: this.report_type || 'CONTESTED',

          created_by: String(this.currentUserId || ''),
          // created_at/updated_at handled by server
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
      next: () => {
        this.submitting = false;

        // Build PDF (service) from current batch rows
        const header: ContestedReportHeader = {
          date: this.batch.header.date || this.toYMD(new Date()),
          phase: this.batch.header.phase || '',
          location_code: this.batch.header.location_code || '',
          location_name: this.batch.header.location_name || '',
          zone: this.joinNonEmpty([this.batch.header.location_code, this.batch.header.location_name], ' - '),
          testerName: localStorage.getItem('currentUserName') || ''
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

        // download PDF
        this.reportPdf.downloadFromBatch(header, rows, { fileName: `CONTESTED_${header.date}.pdf` });

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

  // ---------- Modal ----------
  openConfirm(action: ModalState['action'], payload?: any){
    if (action!=='submit'){ this.alertSuccess=null; this.alertError=null; }
    this.modal.action = action; this.modal.payload = payload;
    switch(action){
      case 'reload': this.modal.title='Reload Assigned Devices'; this.modal.message='Replace with latest assigned devices?'; break;
      case 'removeRow': this.modal.title='Remove Row'; this.modal.message=`Remove row #${(payload?.index ?? 0)+1}?`; break;
      case 'clear': this.modal.title='Clear All Rows'; this.modal.message='Clear all rows and leave one empty row?'; break;
      case 'submit': this.payload=this.buildPayloadForPreview(); this.modal.title='Submit Batch Report — Preview'; this.modal.message=''; break;
      default: this.modal.title=''; this.modal.message='';
    }
    this.modal.open = true;
  }
  closeModal(){ this.modal.open=false; this.modal.action=null; this.modal.payload=undefined; }
  confirmModal(){
    const a=this.modal.action, p=this.modal.payload;
    if(a!=='submit') this.closeModal();
    if(a==='reload') this.doReloadAssigned();
    if(a==='removeRow') this.doRemoveRow(p?.index);
    if(a==='clear') this.doClearRows();
    if(a==='submit') this.doSubmitBatch();
  }

  // small join helper for header.zone
  private joinNonEmpty(parts: Array<string | undefined | null>, sep = ' - ') {
    return parts.filter(Boolean).join(sep);
  }
}
