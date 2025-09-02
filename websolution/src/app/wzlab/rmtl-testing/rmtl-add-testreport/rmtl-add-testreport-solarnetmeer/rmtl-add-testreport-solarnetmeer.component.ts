import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { SolarNetMeterCertificatePdfService, SolarHeader, SolarRow } from 'src/app/shared/solarnetmeter-certificate-pdf.service';

interface MeterDevice {
  id: number;
  serial_number: string;
  make?: string;
  capacity?: string;
  location_code?: string | null;
  location_name?: string | null;
}
interface AssignmentItem { id: number; device_id: number; device?: MeterDevice | null; }

interface CertRow {
  _open?: boolean;
  assignment_id?: number;
  device_id?: number;
  notFound?: boolean;

  consumer_name: string;
  address: string;
  meter_make: string;
  meter_sr_no: string;
  meter_capacity: string;

  certificate_no?: string;
  date_of_testing?: string;

  testing_fees?: number;
  mr_no?: string;
  mr_date?: string;
  ref_no?: string;

  starting_reading?: number;
  final_reading_r?: number;
  final_reading_e?: number;
  difference?: number;

  starting_current_test?: string;
  creep_test?: string;
  dial_test?: string;

  remark?: string;
  test_result?: string;
}

type ModalAction = 'submit' | 'removeRow' | 'reload' | null;

interface ModalState {
  open: boolean;
  title: string;
  action: ModalAction;
  payload?: any;
  message?: string;
}

@Component({
  selector: 'app-rmtl-add-testreport-solarnetmeer',
  templateUrl: './rmtl-add-testreport-solarnetmeer.component.html',
  styleUrls: ['./rmtl-add-testreport-solarnetmeer.component.css']
})
export class RmtlAddTestreportSolarnetmeerComponent implements OnInit {

  header = { location_code: '', location_name: '' };
  test_methods: any[] = [];
  test_statuses: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;

  device_status: 'ASSIGNED' = 'ASSIGNED';
  currentUserId = 0;
  currentLabId  = 0;
  loading = false;

  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: number; assignment_id: number; }> = {};

  filterText = '';
  rows: CertRow[] = [ this.emptyRow() ];

  submitting = false;
  modal: ModalState = { open: false, title: '', action: null };
  alertSuccess: string | null = null;
  alertError: string | null = null;

  office_types: any;
  commentby_testers: any;
  test_results: any;

  selectedSourceType: any;
  selectedSourceName: string = '';
  filteredSources: any;

  // small alert modal state
  alert = {
    open: false,
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
    autoCloseMs: 0 as number | 0,
    _t: 0 as any
  };

  constructor(
    private api: ApiServicesService,
    private pdfSvc: SolarNetMeterCertificatePdfService
  ) {}

  ngOnInit(): void {
    this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    this.currentLabId  = Number(localStorage.getItem('currentLabId') || 0);

    this.api.getEnums().subscribe({
      next: (d) => {
        this.test_methods  = d?.test_methods || [];
        this.test_statuses = d?.test_statuses || [];
        this.office_types  = d?.office_types || [];
        this.commentby_testers = d?.commentby_testers || [];
        this.test_results = d?.test_results || [];
      }
    });

    this.reloadAssigned(false);
  }

  // ---------- Source fetch ----------
  fetchButtonData(): void {
    if (!this.selectedSourceType || !this.selectedSourceName) {
      this.openAlert('warning', 'Missing Input', 'Select a source type and enter code.');
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

  get matchedCount(){ return (this.rows ?? []).filter(r => !!r.meter_sr_no && !r.notFound).length; }
  get unknownCount(){ return (this.rows ?? []).filter(r => !!r.notFound).length; }

  private emptyRow(seed?: Partial<CertRow>): CertRow {
    return {
      _open: true,
      consumer_name: '',
      address: '',
      meter_make: '',
      meter_sr_no: '',
      meter_capacity: '',
      test_result: '',
      ...seed
    };
  }

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

  reloadAssigned(replaceRows: boolean = true) {
    this.loading = true;
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        this.rebuildSerialIndex(asg);

        if (replaceRows) {
          this.rows = asg.map(a => {
            const d = a.device || ({} as MeterDevice);
            return this.emptyRow({
              meter_sr_no: d.serial_number || '',
              meter_make: d.make || '',
              meter_capacity: d.capacity || '',
              assignment_id: a.id ?? 0,
              device_id: d.id ?? a.device_id ?? 0,
              _open: false,
              notFound: false,
            });
          });
          if (!this.rows.length) this.rows.push(this.emptyRow());
        }
        this.loading = false;
      },
      error: () => { this.loading = false; this.openAlert('error', 'Reload failed', 'Could not fetch assigned meters.'); }
    });
  }

  onSerialChanged(i: number, serial: string) {
    const key = (serial || '').toUpperCase().trim();
    const row = this.rows[i];
    const hit = this.serialIndex[key];

    if (hit) {
      row.meter_make = hit.make || '';
      row.meter_capacity = hit.capacity || '';
      row.device_id = hit.device_id || 0;
      row.assignment_id = hit.assignment_id || 0;
      row.notFound = false;
    } else {
      row.meter_make = '';
      row.meter_capacity = '';
      row.device_id = 0;
      row.assignment_id = 0;
      row.notFound = key.length > 0;
    }
  }

  addRow() { this.rows.push(this.emptyRow()); }
  private doRemoveRow(i: number) { if (i>=0 && i<this.rows.length){ this.rows.splice(i,1); if (!this.rows.length) this.rows.push(this.emptyRow()); } }
  trackByRow(i: number, r: CertRow) { return `${r.assignment_id || 0}_${r.device_id || 0}_${r.meter_sr_no || ''}_${i}`; }

  displayRows(): CertRow[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter(r =>
      (r.meter_sr_no || '').toLowerCase().includes(q) ||
      (r.meter_make || '').toLowerCase().includes(q) ||
      (r.consumer_name || '').toLowerCase().includes(q));
  }

  recompute(i: number) {
    const r = this.rows[i];
    const a = Number(r.final_reading_r ?? 0);
    const b = Number(r.starting_reading ?? 0);
    const v = isFinite(a) && isFinite(b) ? +(a - b).toFixed(4) : undefined;
    r.difference = v;
  }

  // ---------- Numbers / time helpers ----------
  private numOrNull(v:any){ const n = Number(v); return isFinite(n) ? n : null; }
  private isoOn(dateStr?: string){
    const d = dateStr? new Date(dateStr+'T10:00:00') : new Date();
    return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString();
  }

  /** Fully map to the Testing model columns (where available on this screen). */
  private buildPayload(): any[] {
    const requester = this.header.location_name || this.filteredSources?.name || null;

    return (this.rows || [])
      .filter(r => (r.meter_sr_no || '').trim())
      .map(r => ({
        device_id: r.device_id ?? 0,
        assignment_id: r.assignment_id ?? 0,

        start_datetime: this.isoOn(r.date_of_testing),
        end_datetime:   this.isoOn(r.date_of_testing),

        physical_condition_of_device: null,
        seal_status: null,
        meter_glass_cover: null,
        terminal_block: null,
        meter_body: null,
        other: null,
        is_burned: false,

        // map starting/final readings to model equivalents
        reading_before_test: this.numOrNull(r.starting_reading),
        reading_after_test:  this.numOrNull(r.final_reading_r),
        ref_start_reading: null,
        ref_end_reading: null,
        error_percentage: null,

        // results/meta
        details: r.remark || null,
        test_result: r.test_result || null,
        test_method: this.testMethod || null,
        test_status: this.testStatus || null,

        // new columns — certificates
        consumer_name: r.consumer_name || null,
        consumer_address: r.address || null,
        certificate_number: r.certificate_no || null,
        testing_fees: this.numOrNull(r.testing_fees),
        fees_mr_no: r.mr_no || null,
        fees_mr_date: r.mr_date || null,
        ref_no: r.ref_no || null,

        start_reading: this.numOrNull(r.starting_reading),
        final_reading: this.numOrNull(r.final_reading_r),
        final_reading_export: this.numOrNull(r.final_reading_e),
        difference: this.numOrNull(r.difference),

        test_requester_name: requester,
        meter_removaltime_reading: null,
        meter_removaltime_metercondition: null,
        any_other_remarkny_zone: null,

        dail_test_kwh_rsm: null,
        recorderedbymeter_kwh: null,
        starting_current_test: null, // UI uses string OK/FAIL — keep null unless backend supports string
        creep_test: null,            // same
        dail_test: null,
        final_remarks: r.remark || null,

        p4_division: null,
        p4_no: null,
        p4_date: null,
        p4_metercodition: null,

        approver_id: null,
        approver_remark: null,

        report_id: null,
        report_type: 'SOLAR_NETMETER',

        created_by: String(this.currentUserId || ''),
      }));
  }

  // ---------- Confirm & Alert ----------
  openConfirm(action: ModalAction, payload?: any){
    this.alertSuccess = null;
    this.alertError = null;
    this.modal.action = action;
    this.modal.payload = payload;

    if (action === 'submit') {
      this.modal.title = 'Submit Batch — Preview';
      this.modal.message = '';
    } else if (action === 'removeRow') {
      const i = (payload?.index ?? 0) + 1;
      this.modal.title = 'Remove Row';
      this.modal.message = `Are you sure you want to remove row #${i}?`;
    } else if (action === 'reload') {
      this.modal.title = 'Reload Assigned Devices';
      this.modal.message = 'This will replace current rows with the latest assigned devices. Continue?';
    } else {
      this.modal.title = ''; this.modal.message = '';
    }
    this.modal.open = true;
  }

  closeModal(){
    this.modal.open = false;
    this.modal.action = null;
    this.modal.payload = undefined;
  }

  confirmModal(){
    if (this.modal.action === 'submit') { this.doSubmit(); return; }
    if (this.modal.action === 'removeRow') {
      const idx = this.modal.payload?.index ?? -1;
      this.doRemoveRow(idx);
      this.closeModal();
      this.openAlert('success', 'Row removed', 'The row has been removed.', 1200);
      return;
    }
    if (this.modal.action === 'reload') {
      this.closeModal();
      this.reloadAssigned(true);
      this.openAlert('info', 'Reload started', 'Fetching the latest assigned devices…', 1200);
    }
  }

  private doSubmit(){
    const payload = this.buildPayload();
    if (!payload.length){
      this.alertError = 'No valid rows to submit.';
      this.openAlert('warning', 'Nothing to submit', 'Please add at least one valid row.');
      return;
    }
    const missingDt = payload.findIndex(p => !p.start_datetime || !p.end_datetime);
    if (missingDt !== -1){
      this.alertError = `Row #${missingDt+1} is missing Date of Testing.`;
      this.openAlert('warning', 'Validation error', this.alertError);
      return;
    }

    this.submitting = true;
    this.alertSuccess = null;
    this.alertError = null;

    this.api.postTestReports(payload).subscribe({
      next: () => {
        this.submitting = false;

        // PDF after successful save (via service)
        const hdr: SolarHeader = {
          location_code: this.header.location_code,
          location_name: this.header.location_name,
          testMethod: this.testMethod,
          testStatus: this.testStatus
        };
        const rows: SolarRow[] = (this.rows || []).filter(r => (r.meter_sr_no||'').trim()).map(r => ({
          certificate_no: r.certificate_no,
          consumer_name: r.consumer_name,
          address: r.address,
          meter_make: r.meter_make,
          meter_sr_no: r.meter_sr_no,
          meter_capacity: r.meter_capacity,
          date_of_testing: r.date_of_testing || null,
          testing_fees: this.numOrNull(r.testing_fees),
          mr_no: r.mr_no || null,
          mr_date: r.mr_date || null,
          ref_no: r.ref_no || null,
          starting_reading: this.numOrNull(r.starting_reading),
          final_reading_r: this.numOrNull(r.final_reading_r),
          final_reading_e: this.numOrNull(r.final_reading_e),
          difference: this.numOrNull(r.difference),
          starting_current_test: r.starting_current_test || null,
          creep_test: r.creep_test || null,
          dial_test: r.dial_test || null,
          test_result: r.test_result || null,
          remark: r.remark || null
        }));
        this.pdfSvc.download(hdr, rows);

        this.alertSuccess = 'Batch submitted successfully!';
        this.openAlert('success', 'Submitted', 'Batch submitted successfully!');
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

  // small alert modal helpers
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
