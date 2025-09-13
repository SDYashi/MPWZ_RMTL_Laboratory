import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { P4VigReportPdfService, VigHeader, VigRow } from 'src/app/shared/p4vig-report-pdf.service';

interface MeterDevice {
  id: number;
  serial_number: string;
  make?: string;
  capacity?: string;
  location_code?: string | null;
  location_name?: string | null;
}
interface AssignmentItem { id: number; device_id: number; device?: MeterDevice | null; }

interface Row {
  serial: string;
  make: string;
  capacity: string;
  removal_reading?: number;
  test_result?: string;

  consumer_name?: string;
  address?: string;
  account_number?: string;
  division_zone?: string;
  panchanama_no?: string;
  panchanama_date?: string;
  condition_at_removal?: string;

  testing_date?: string;
  is_burned: boolean;
  seal_status: string;
  meter_glass_cover: string;
  terminal_block: string;
  meter_body: string;
  other: string;

  reading_before_test?: number;
  reading_after_test?: number;
  rsm_kwh?: number;
  meter_kwh?: number;
  error_percentage?: number;
  starting_current_test?: string;
  creep_test?: string;

  remark?: string;

  assignment_id?: number;
  device_id?: number;
  notFound?: boolean;

  _open?: boolean;
}

type ModalAction = 'submit' | null;

interface ModalState {
  open: boolean;
  title: string;
  message?: string;
  action: ModalAction;
  payload?: any;
}

@Component({
  selector: 'app-rmtl-add-testreport-p4vig',
  templateUrl: './rmtl-add-testreport-p4vig.component.html',
  styleUrls: ['./rmtl-add-testreport-p4vig.component.css']
})
export class RmtlAddTestreportP4vigComponent implements OnInit {

  // ===== batch header =====
  header = { location_code: '', location_name: '', testing_bench: '', testing_user: '' };
  test_methods: any[] = [];
  test_statuses: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;

  // ===== enums =====
  seal_statuses: any[] = [];
  glass_covers: any[] = [];
  terminal_blocks: any[] = [];
  meter_bodies: any[] = [];

  // ===== assignment / lab =====
  device_status: 'ASSIGNED' = 'ASSIGNED';
  currentUserId = 0;
  currentLabId  = 0;
  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: number; assignment_id: number; }> = {};
  loading = false;

  // lab info for PDF header
  labInfo: {
    lab_name?: string; address?: string; email?: string; phone?: string;
    logo_left_url?: string; logo_right_url?: string;
  } | null = null;

  // ===== table =====
  filterText = '';
  rows: Row[] = [ this.emptyRow() ];

  // ===== source lookup =====
  office_types: any;
  selectedSourceType: any;
  selectedSourceName: string = '';
  filteredSources: any;

  // ===== submit + modal state =====
  submitting = false;
  modal: ModalState = { open: false, title: '', action: null };
  alertSuccess: string | null = null;
  alertError: string | null = null;
  testResults: any;
  commentby_testers: any;

  // ===== alert modal =====
  alert = {
    open: false,
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
    autoCloseMs: 0 as number | 0,
    _t: 0 as any
  };

  // ===== device picker modal =====
  devicePicker = {
    open: false,
    items: [] as AssignmentItem[],
    selected: new Set<number>(),
    loading: false,
    selectAll: false,
  };

  constructor(private api: ApiServicesService, private pdfSvc: P4VigReportPdfService) {}

  ngOnInit(): void {
    this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    this.currentLabId  = Number(localStorage.getItem('currentLabId') || 0);
    this.header.testing_user = localStorage.getItem('currentUserName') || '';

    this.api.getEnums().subscribe({
      next: (d) => {
        this.test_methods   = d?.test_methods || [];
        this.test_statuses  = d?.test_statuses || [];
        this.seal_statuses  = d?.seal_statuses || [];
        this.glass_covers   = d?.glass_covers || [];
        this.terminal_blocks= d?.terminal_blocks || [];
        this.meter_bodies   = d?.meter_bodies || [];
        this.office_types   = d?.office_types || [];
        this.testResults    = d?.test_results || [];
        this.commentby_testers = d?.commentby_testers || [];
      }
    });

    // lab info for header
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

    // build serial index without altering rows
    this.loadAssignedIndexOnly();
  }

  // ---------- Source fetch ----------
  fetchButtonData(): void {
    if (!this.selectedSourceType || !this.selectedSourceName) {
      this.openAlert('warning', 'Missing input', 'Select a source type and enter code.');
      return;
    }
    this.api.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
      next: (data) => {
        this.filteredSources = data;
        this.header.location_name = this.filteredSources?.name ?? '';
        this.header.location_code = this.filteredSources?.code ?? '';
        this.openAlert('success', 'Source loaded', 'Office/Store/Vendor fetched.', 1200);
      },
      error: () => this.openAlert('error', 'Lookup failed', 'Check the code and try again.')
    });
  }

  onSourceTypeChange(): void {
    this.selectedSourceName = '';
    this.filteredSources = [];
  }

  // ===== derived counters =====
  get matchedCount(){ return (this.rows ?? []).filter(r => !!r.serial && !r.notFound).length; }
  get unknownCount(){ return (this.rows ?? []).filter(r => !!r.notFound).length; }

  // ===== helpers =====
  private emptyRow(seed?: Partial<Row>): Row {
    return {
      serial: '', make: '', capacity: '',
      is_burned: false, seal_status: '', meter_glass_cover: '', terminal_block: '', meter_body: '',
      other: '', _open: false, ...seed
    };
  }
  addRow(){ this.rows.push(this.emptyRow({ _open: true })); }
  removeRow(i:number){
    if (i < 0 || i >= this.rows.length) return;
    this.rows.splice(i,1);
    if (!this.rows.length) this.addRow();
  }

  trackByRow(i:number, r:Row){ return `${r.assignment_id || 0}_${r.device_id || 0}_${r.serial || ''}_${i}`; }

  displayRows(): Row[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter(r =>
      (r.serial || '').toLowerCase().includes(q) ||
      (r.make || '').toLowerCase().includes(q) ||
      (r.capacity || '').toLowerCase().includes(q) ||
      (r.consumer_name || '').toLowerCase().includes(q));
  }

  // ===== assignment index only =====
  private rebuildSerialIndex(asg: AssignmentItem[]) {
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
      };
    }
  }

  private loadAssignedIndexOnly() {
    this.loading = true;
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data:any) => {
        const asg:AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        this.rebuildSerialIndex(asg);

        const first = asg.find(a=>a.device);
        if (first?.device){
          // prefill zone/dc if empty
          this.header.location_code = this.header.location_code || (first.device.location_code ?? '');
          this.header.location_name = this.header.location_name || (first.device.location_name ?? '');
        }
        this.loading = false;
      },
      error: ()=>{ this.loading=false; }
    });
  }

  // ===== open device picker (instead of pushing all) =====
  openDevicePicker(){
    this.devicePicker.loading = true;
    this.devicePicker.items = [];
    this.devicePicker.selected.clear();
    this.devicePicker.selectAll = false;

    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data:any) => {
        const asg:AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        this.devicePicker.items = asg;
        // prefill header code/name from the first one (if empty)
        const first = asg.find(a=>a.device);
        if (first?.device){
          if (!this.header.location_code) this.header.location_code = first.device.location_code ?? '';
          if (!this.header.location_name) this.header.location_name = first.device.location_name ?? '';
        }
        this.devicePicker.open = true;
        this.devicePicker.loading = false;
      },
      error: ()=> {
        this.devicePicker.loading = false;
        this.openAlert('error', 'Reload failed', 'Could not fetch assigned meters.');
      }
    });
  }

  toggleSelectAll(){
    this.devicePicker.selectAll = !this.devicePicker.selectAll;
    this.devicePicker.selected.clear();
    if (this.devicePicker.selectAll){
      for (const a of this.devicePicker.items) this.devicePicker.selected.add(a.id);
    }
  }
  toggleSelectOne(id:number){
    if (this.devicePicker.selected.has(id)) this.devicePicker.selected.delete(id);
    else this.devicePicker.selected.add(id);
  }
  closeDevicePicker(){ this.devicePicker.open = false; }

  addSelectedDevices(){
    const chosen = new Set(this.devicePicker.selected);
    if (!chosen.size){ this.closeDevicePicker(); return; }

    const existingSerials = new Set(this.rows.map(r => (r.serial||'').toUpperCase().trim()));
    for (const a of this.devicePicker.items){
      if (!chosen.has(a.id)) continue;
      const d = a.device || ({} as MeterDevice);
      const serial = (d.serial_number || '').toUpperCase().trim();
      if (!serial || existingSerials.has(serial)) continue;

      this.rows.push(this.emptyRow({
        serial: d.serial_number || '',
        make: d.make || '',
        capacity: d.capacity || '',
        assignment_id: a.id ?? 0,
        device_id: d.id ?? a.device_id ?? 0,
        _open: true, notFound:false
      }));
      existingSerials.add(serial);
    }
    if (!this.rows.length) this.addRow();

    this.closeDevicePicker();
    this.openAlert('success', 'Added', 'Selected devices added to the table.', 1400);
  }

  onSerialChanged(i:number, serial:string){
    const key = (serial || '').toUpperCase().trim();
    const row = this.rows[i];
    const hit = this.serialIndex[key];
    if (hit){
      row.make = hit.make || '';
      row.capacity = hit.capacity || '';
      row.device_id = hit.device_id || 0;
      row.assignment_id = hit.assignment_id || 0;
      row.notFound = false;
    } else {
      row.make = ''; row.capacity = ''; row.device_id = 0; row.assignment_id = 0; row.notFound = key.length>0;
    }
  }

  // ===== numbers / dates =====
  private isoOn(dateStr?: string){
    const d = dateStr? new Date(dateStr+'T10:00:00') : new Date();
    return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString();
  }
  private numOrNull(v:any){ const n = Number(v); return isFinite(n) ? n : null; }

  /** Map to backend Testing model, filling all available columns */
  private buildPayload(): any[] {
    return (this.rows||[])
      .filter(r => (r.serial||'').trim())
      .map(r => {
        const start = this.numOrNull(r.reading_before_test);
        const end   = this.numOrNull(r.reading_after_test);
        const diff  = (start != null && end != null) ? (end - start) : null;

        return {
          device_id: r.device_id ?? 0,
          assignment_id: r.assignment_id ?? 0,
          start_datetime: this.isoOn(r.testing_date),
          end_datetime: this.isoOn(r.testing_date),

          physical_condition_of_device: null,
          seal_status: r.seal_status || null,
          meter_glass_cover: r.meter_glass_cover || null,
          terminal_block: r.terminal_block || null,
          meter_body: r.meter_body || null,
          other: r.other || null,
          is_burned: !!r.is_burned,

          reading_before_test: this.numOrNull(r.reading_before_test),
          reading_after_test: this.numOrNull(r.reading_after_test),
          ref_start_reading: null,
          ref_end_reading: null,
          error_percentage: this.numOrNull(r.error_percentage),

          details: r.remark || null,
          test_result: r.test_result || null,
          test_method: this.testMethod || null,
          test_status: this.testStatus || null,

          consumer_name: r.consumer_name || null,
          consumer_address: r.address || null,
          certificate_number: null,
          testing_fees: null,
          fees_mr_no: null,
          fees_mr_date: null,
          ref_no: r.account_number || null,

          start_reading: this.numOrNull(r.reading_before_test),
          final_reading: this.numOrNull(r.reading_after_test),
          final_reading_export: null,
          difference: diff,

          test_requester_name: r.division_zone || null,
          meter_removaltime_reading: this.numOrNull(r.removal_reading),
          meter_removaltime_metercondition: null,
          any_other_remarkny_zone: r.condition_at_removal || null,

          dail_test_kwh_rsm: this.numOrNull(r.rsm_kwh),
          recorderedbymeter_kwh: this.numOrNull(r.meter_kwh),
          starting_current_test: null,
          creep_test: null,
          dail_test: null,
          final_remarks: r.remark || null,

          p4_division: r.division_zone || null,
          p4_no: r.panchanama_no || null,
          p4_date: r.panchanama_date || null,
          p4_metercodition: r.condition_at_removal || null,

          approver_id: null,
          approver_remark: null,

          report_id: null,
          report_type: 'P4_VIG',

          created_by: String(this.currentUserId || ''),
        };
      });
  }

  // ===== submit modal (only for preview/submit) =====
  openConfirmSubmit(){
    this.alertSuccess = null;
    this.alertError = null;
    this.modal.action = 'submit';
    this.modal.title = 'Submit Batch — Preview';
    this.modal.open = true;
  }
  closeModal(){
    this.modal.open = false;
    this.modal.action = null;
    this.modal.payload = undefined;
  }

  confirmModal(){
    if (this.modal.action === 'submit'){
      this.doSubmit();
    }
  }

  // ===== submit =====
  private doSubmit(){
    const payload = this.buildPayload();
    if (!payload.length){
      this.alertError = 'No valid rows to submit.';
      this.openAlert('warning', 'Nothing to submit', 'Please add at least one valid row.');
      return;
    }
    const missingIdx = payload.findIndex(p => !p.test_result);
    if (missingIdx !== -1){
      this.alertError = `Row #${missingIdx+1} is missing Test Result (OK/DEF/PASS/FAIL).`;
      this.openAlert('warning', 'Validation error', this.alertError);
      return;
    }

    this.submitting = true;
    this.alertSuccess = null;
    this.alertError = null;

    this.api.postTestReports(payload).subscribe({
      next: async () => {
        this.submitting = false;

        // PDF header pack
        const header: VigHeader = {
          location_code: this.header.location_code,
          location_name: this.header.location_name,
          testMethod: this.testMethod,
          testStatus: this.testStatus,
          date: new Date().toISOString().slice(0,10),
          testing_bench: this.header.testing_bench || null,
          testing_user: this.header.testing_user || null,

          lab_name: this.labInfo?.lab_name || null,
          lab_address: this.labInfo?.address || null,
          lab_email: this.labInfo?.email || null,
          lab_phone: this.labInfo?.phone || null,
          leftLogoUrl: '/assets/icons/wzlogo.png',
          rightLogoUrl: '/assets/icons/wzlogo.png'
        };

        const rows: VigRow[] = (this.rows || []).filter(r => (r.serial||'').trim()).map(r => ({
          serial: r.serial,
          make: r.make,
          capacity: r.capacity,
          removal_reading: this.numOrNull(r.removal_reading) ?? undefined,
          test_result: r.test_result,

          consumer_name: r.consumer_name,
          address: r.address,
          account_number: r.account_number,
          division_zone: r.division_zone,
          panchanama_no: r.panchanama_no,
          panchanama_date: r.panchanama_date,
          condition_at_removal: r.condition_at_removal,

          testing_date: r.testing_date,
          is_burned: r.is_burned,
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
          starting_current_test: r.starting_current_test,
          creep_test: r.creep_test,

          remark: r.remark
        }));

        // Download PDF via service
        await this.pdfSvc.download(header, rows);

        this.alertSuccess = 'Batch submitted and PDF downloaded successfully!';
        this.openAlert('success', 'Submitted', 'Data saved and PDF downloaded.');
        this.rows = [ this.emptyRow() ];
        setTimeout(()=> this.closeModal(), 1200);
      },
      error: (e) => {
        console.error(e);
        this.submitting = false;
        this.alertError = 'Error submitting batch.';
        this.openAlert('error', 'Submission failed', 'Something went wrong while submitting the batch.');
      }
    });
  }

  // ===== alert helpers =====
  openAlert(type: 'success'|'error'|'warning'|'info', title: string, message: string, autoCloseMs: number = 0){
    if (this.alert._t){ clearTimeout(this.alert._t); }
    this.alert = { open: true, type, title, message, autoCloseMs, _t: 0 };
    if (autoCloseMs > 0){
      this.alert._t = setTimeout(()=> this.closeAlert(), autoCloseMs);
    }
  }
  closeAlert(){
    if (this.alert._t){ clearTimeout(this.alert._t); }
    this.alert.open = false;
  }
}
