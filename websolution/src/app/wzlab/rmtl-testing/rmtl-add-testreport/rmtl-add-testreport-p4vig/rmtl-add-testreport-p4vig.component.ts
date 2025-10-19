import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { P4VigReportPdfService, VigHeader, VigRow } from 'src/app/shared/p4vig-report-pdf.service';

interface MeterDevice { id: number; serial_number: string; make?: string; capacity?: string; location_code?: string | null; location_name?: string | null; }
interface AssignmentItem { id: number; device_id: number; device?: MeterDevice | null; testing_bench?: { bench_name?: string } | null; bench_name?: string; user_assigned?: { username?: string } | null; assigned_by_user?: { username?: string } | null; username?: string; }

interface Row {
  serial: string; make: string; capacity: string; removal_reading?: number; test_result?: string;
  consumer_name?: string; address?: string; account_number?: string; division_zone?: string;
  panchanama_no?: string; panchanama_date?: string; condition_at_removal?: string;
  testing_date?: string; is_burned: boolean; seal_status: string; meter_glass_cover: string; terminal_block: string; meter_body: string; other: string;
  reading_before_test?: number; reading_after_test?: number; rsm_kwh?: number; meter_kwh?: number; error_percentage?: number; starting_current_test?: string; creep_test?: string;
  remark?: string; assignment_id?: number; device_id?: number; notFound?: boolean; dial_testby?: string; _open?: boolean;
}

type ModalAction = 'submit' | null;
interface ModalState { open: boolean; title: string; message?: string; action: ModalAction; payload?: any; }

@Component({
  selector: 'app-rmtl-add-testreport-p4vig',
  templateUrl: './rmtl-add-testreport-p4vig.component.html',
  styleUrls: ['./rmtl-add-testreport-p4vig.component.css']
})
export class RmtlAddTestreportP4vigComponent implements OnInit {

  // ===== batch header (added phase, approving_user to match template) =====
  header: {
    location_code: string;
    location_name: string;
    testing_bench: string;
    testing_user: string;
    phase?: string;
    approving_user?: string;
  } = { location_code: '', location_name: '', testing_bench: '', testing_user: '', phase: '', approving_user: '' };

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
  currentUserId:any;
  currentLabId :any;
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

  // ===== alert modal (kept for preview/submit) =====
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
    search: '' as string, // search by serial
  };

  report_type: any;
  device_testing_purpose: any;
  device_type: any;

  // ===== page-level message (non-modal) =====
  pageMessage: { type: 'success'|'error'|'warning'|'info', text: string } | null = null;
  test_dail_current_cheaps: any;
  fees_mtr_cts: any;
  ternal_testing_types: any;

  constructor(private api: ApiServicesService,
     private pdfSvc: P4VigReportPdfService,
     private authService: AuthService) {}

  private safeNumber(val: any): number {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  ngOnInit(): void {
    this.currentUserId = this.authService.getuseridfromtoken();
    this.currentLabId = this.authService.getlabidfromtoken();
    this.header.testing_user = this.authService.getUserNameFromToken() || '';

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

        this.report_type = d?.test_report_types?.VIGILENCE_CHECKING || 'VIGILENCE_CHECKING';
        this.device_testing_purpose = d?.test_report_types?.VIGILENCE_CHECKING || 'VIGILENCE_CHECKING';
        this.device_type = d?.device_types?.METER || 'METER';    
        this.ternal_testing_types = d?.ternal_testing_types || [];
        this.fees_mtr_cts= d?.fees_mtr_cts || [];
        this.test_dail_current_cheaps = d?.test_dail_current_cheaps || [];

        // build serial index w/o pushing rows
        this.loadAssignedIndexOnly();
      }
    });

    // lab info for header
    this.api.getLabInfo(this.currentLabId || 0).subscribe({
      next: (info: any) => {
        this.labInfo = {
          lab_name: info?.lab_pdfheader_name || info?.lab_name,
          address: info?.address || info?.address_line,
          email: info?.email,
          phone: info?.phone,
          logo_left_url: info?.logo_left_url,
          logo_right_url: info?.logo_right_url
        };
      },
      error: (e) => {
        // show a subtle page message instead of modal alert
        this.setPageMessage('warning', 'Could not fetch lab info.');
        console.error('Labinfo load error', e);
      }
    });
  }

  // ---------- Source fetch ----------
  fetchButtonData(): void {
    if (!this.selectedSourceType || !this.selectedSourceName) {
      this.setPageMessage('warning', 'Select a source type and enter code.');
      return;
    }
    this.api.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
      next: (data) => {
        this.filteredSources = data;
        this.header.location_name = this.filteredSources?.name ?? '';
        this.header.location_code = this.filteredSources?.code ?? '';
        this.setPageMessage('success', 'Source loaded.');
      },
      error: () => {
        this.setPageMessage('error', 'Lookup failed — check the code and try again.');
      }
    });
  }

  onSourceTypeChange(): void {
    this.selectedSourceName = '';
    this.filteredSources = [];
    this.clearPageMessage();
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
    } as Row;
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

  private ensureParamsReady(): boolean {
    if (!this.device_type) this.device_type = 'METER';
    if (!this.device_testing_purpose) this.device_testing_purpose = 'VIGILENCE_CHECKING';
    if (!this.currentUserId || this.currentUserId <= 0) {
      this.setPageMessage('warning', 'Current user is not set. Please re-login or set currentUserId.');
      return false;
    }
    if (!this.currentLabId || this.currentLabId <= 0) {
      this.setPageMessage('warning', 'Current lab is not set. Please select a lab (currentLabId).');
      return false;
    }
    if (!this.header.testing_user) this.header.testing_user ;
    if (!this.header.testing_bench) this.header.testing_bench ;
    if (!this.header.approving_user) this.header.approving_user;
    if (!this.header.phase) this.header.phase = '';
    return true;
  }

  private loadAssignedIndexOnly() {
    if (!this.ensureParamsReady()) return;
    this.loading = true;
    this.api.getAssignedMeterList(
      this.device_status,
      this.currentUserId,
      this.currentLabId,
      this.device_testing_purpose,
      this.device_type
    ).subscribe({
      next: (data:any) => {
        const asg:AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        asg.sort((a, b) => (a.device?.make || '').localeCompare(b.device?.make || ''));
        this.rebuildSerialIndex(asg);

        const first = asg.find(a=>a.device);
        if (first?.device){
          this.header.location_code = this.header.location_code || (first.device.location_code ?? '');
          this.header.location_name = this.header.location_name || (first.device.location_name ?? '');
        }
        this.loading = false;
        // don't show modal alerts here — show subtle page message instead
        this.setPageMessage('info', `Loaded ${asg.length} assigned devices.`);
      },
      error: (err)=>{ this.loading=false; console.error('Assigned load failed', err); this.setPageMessage('error','Could not load assigned devices.'); }
    });
  }

  // ===== open device picker (with search + sort) =====
  openDevicePicker(){
    if (!this.ensureParamsReady()) return;
    this.devicePicker.loading = true;
    this.devicePicker.items = [];
    this.devicePicker.selected.clear();
    this.devicePicker.selectAll = false;
    this.devicePicker.search = '';

    this.api.getAssignedMeterList(
      this.device_status,
      this.currentUserId,
      this.currentLabId,
      this.device_testing_purpose,
      this.device_type
    ).subscribe({
      next: (data:any) => {
        const asg:AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        asg.sort((a, b) => (a.device?.make || '').localeCompare(b.device?.make || ''));
        this.devicePicker.items = asg;

        const first = asg.find(a=>a.device);
        if (first?.device){
          if (!this.header.location_code) this.header.location_code = first.device.location_code ?? '';
          if (!this.header.location_name) this.header.location_name = first.device.location_name ?? '';
          if (!this.header.testing_bench) this.header.testing_bench = first.testing_bench?.bench_name ?? '';
          if (!this.header.testing_user) this.header.testing_user = first.user_assigned?.username ?? '';
          if (!this.header.approving_user) this.header.approving_user ??= first.assigned_by_user?.username ?? '';
        }
        this.devicePicker.open = true;
        this.devicePicker.loading = false;
        this.clearPageMessage();
      },
      error: (err)=> {
        this.devicePicker.loading = false;
        console.error('Picker load failed', err);
        this.setPageMessage('error', 'Could not fetch assigned meters.');
      }
    });
  }

  devicePickerDisplayItems(): AssignmentItem[] {
    const q = (this.devicePicker.search || '').trim().toLowerCase();
    const filtered = !q ? this.devicePicker.items :
      this.devicePicker.items.filter(a =>
        (a.device?.serial_number || '').toLowerCase().includes(q)
      );
    return filtered;
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
    this.setPageMessage('success', 'Selected devices added to the table.');
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
      this.clearPageMessage();
    } else {
      row.make = ''; row.capacity = ''; row.device_id = 0; row.assignment_id = 0; row.notFound = key.length>0;
      if (key.length > 0) this.setPageMessage('warning', `Serial "${serial}" not found in assigned list.`);
    }
  }

  // ===== numbers / dates =====
  private isoOn(dateStr?: string){
    const d = dateStr? new Date(dateStr+'T10:00:00') : new Date();
    return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString();
  }
  private numOrNull(v:any){ const n = Number(v); return isFinite(n) ? n : null; }

  // ===== validation =====
  private validate(): boolean {
    if (!this.ensureParamsReady()) return false;

    if (!this.header.location_code || !this.header.location_name) {
      this.setPageMessage('warning', 'Please fill Zone/DC code and name.');
      return false;
    }
    if (!this.header.approving_user) {
      this.setPageMessage('warning', 'Please enter Approving User.');
      return false;
    }
    if (!this.header.testing_user) {
      this.setPageMessage('warning', 'Please enter Testing User.');
      return false;
    }
    if (!this.header.testing_bench) {
      this.setPageMessage('warning', 'Please enter Testing Bench.');
      return false;
    }

    if (!this.rows.length || !this.rows.some(r => (r.serial || '').trim())) {
      this.setPageMessage('warning', 'Please add at least one meter row.');
      return false;
    }

    const missingResultIdx = this.rows.findIndex(r => (r.serial||'').trim() && (!r.test_result));
    if (missingResultIdx !== -1){
      this.setPageMessage('warning', `Row #${missingResultIdx+1} is missing Test Result (OK/DEF/PASS/FAIL).`);
      return false;
    }

    return true;
  }

  private buildPayload(): any[] {
    if (!this.header.testing_user) this.header.testing_user = 'TestingUser';
    if (!this.header.testing_bench) this.header.testing_bench = 'DefaultBench';
    if (!this.header.approving_user) this.header.approving_user = 'Approver';

    const approverId = this.currentUserId || 0;
    const createdById = this.currentUserId || 0;

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
          approver_id: approverId || null,
          created_by_id: createdById || null,
          report_id: null,
          report_type: 'VIGILENCE_CHECKING',
        };
      });
  }

  // ===== submit modal (only for preview/submit) =====
  openConfirmSubmit(){
    this.alertSuccess = null;
    this.alertError = null;
    if (!this.validate()) return;
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

  // public: template calls this directly as well (if you have a direct button)
  async doSubmit(){
    const payload = this.buildPayload();
    if (!payload.length){
      this.alertError = 'No valid rows to submit.';
      this.openAlert('warning', 'Nothing to submit', 'Please add at least one valid row.');
      return;
    }

    this.submitting = true;
    this.alertSuccess = null;
    this.alertError = null;
    // keep submit alert behaviour (user requested preview+submit alerts)
    this.openAlert('info', 'Submitting…', 'Saving data to server.');

    this.api.postTestReports(payload).subscribe({
      next: async () => {
        this.submitting = false;

        const header: VigHeader = {
          location_code: this.header.location_code || '',
          location_name: this.header.location_name || '',
          testMethod: this.testMethod || '',
          testStatus: this.testStatus || '',
          date: new Date().toISOString().slice(0,10),
          testing_bench: this.header.testing_bench || 'DefaultBench',
          testing_user: this.header.testing_user || 'TestingUser',

          lab_name: this.labInfo?.lab_name || null,
          lab_address: this.labInfo?.address || null,
          lab_email: this.labInfo?.email || null,
          lab_phone: this.labInfo?.phone || null,
          leftLogoUrl: this.labInfo?.logo_left_url || '/assets/icons/wzlogo.png',
          rightLogoUrl: this.labInfo?.logo_right_url || '/assets/icons/wzlogo.png'
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

        // Alert before PDF generation (kept)
        this.openAlert('success', 'Saved', 'Data saved. Generating PDF…', 1200);

        // Download PDF via service (await to ensure completion)
        await this.pdfSvc.download(header, rows);

        // Alert after PDF download (kept)
        this.alertSuccess = 'Batch submitted and PDF downloaded successfully!';
        this.openAlert('success', 'Completed', 'PDF downloaded to your device.', 1600);

        this.rows = [ this.emptyRow() ];
        setTimeout(()=> this.closeModal(), 1000);
      },
      error: (e) => {
        console.error(e);
        this.submitting = false;
        this.alertError = 'Error submitting batch.';
        this.openAlert('error', 'Submission failed', 'Something went wrong while submitting the batch.');
      }
    });
  }

  // ===== alert helpers (modal-based alerts still available for submit/preview) =====
  openAlert(type: 'success'|'error'|'warning'|'info', title: string, message: string, autoCloseMs: number = 0){
    if (this.alert._t){ clearTimeout(this.alert._t as any); }
    this.alert = { open: true, type, title, message, autoCloseMs, _t: 0 };
    if (autoCloseMs > 0){
      this.alert._t = setTimeout(()=> this.closeAlert(), autoCloseMs);
    }
  }
  closeAlert(){
    if (this.alert._t){ clearTimeout(this.alert._t as any); }
    this.alert.open = false;
  }

  // ===== page-level message helpers =====
  setPageMessage(type: 'success'|'error'|'warning'|'info', text: string){
    this.pageMessage = { type, text };
  }
  clearPageMessage(){
    this.pageMessage = null;
  }
}
