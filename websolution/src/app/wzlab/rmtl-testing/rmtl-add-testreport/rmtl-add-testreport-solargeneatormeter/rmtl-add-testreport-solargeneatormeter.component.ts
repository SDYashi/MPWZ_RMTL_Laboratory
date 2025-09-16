import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { SolarGenMeterCertificatePdfService, GenHeader, GenRow } from 'src/app/shared/solargenmeter-certificate-pdf.service';

interface MeterDevice {
  id: number;
  serial_number: string;
  make?: string;
  capacity?: string;
  location_code?: string | null;
  location_name?: string | null;
}
interface AssignmentItem {
  id: number;           // assignment_id
  device_id: number;
  device?: MeterDevice | null;
  testing_bench?: { bench_name?: string } | null;
  user_assigned?: { name?: string } | null;
  assigned_by_user?: { name?: string } | null;
}

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

type ModalAction = 'submit' | null;
interface ModalState {
  open: boolean;
  title: string;
  message: string;
  action: ModalAction;
  payload?: any;
}

@Component({
  selector: 'app-rmtl-add-testreport-solargeneatormeter',
  templateUrl: './rmtl-add-testreport-solargeneatormeter.component.html',
  styleUrls: ['./rmtl-add-testreport-solargeneatormeter.component.css']
})
export class RmtlAddTestreportSolargeneatormeterComponent implements OnInit {
  alert = { open: false, type: 'success', title: 'Success', message: '', autoCloseMs: 0, _t: 0 };
  // ===== header on form =====
  header = { location_code: '', location_name: '' };
  test_methods: any[] = [];
  test_statuses: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;

  // Testing bench/user + logos
  testing_bench: string = '';
  testing_user: string = '';
  leftLogoUrl: string = '';
  rightLogoUrl: string = '';

  // ===== assignment =====
  device_status: 'ASSIGNED' = 'ASSIGNED';
  currentUserId = 0;
  currentLabId  = 0;
  loading = false;

  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: number; assignment_id: number; }> = {};

  filterText = '';
  rows: CertRow[] = [ this.emptyRow() ];

  // modal + submit state
  modal: ModalState = { open: false, title: '', message: '', action: null };
  submitting = false;
  alertSuccess: string | null = null;
  alertError: string | null = null;

  // enums
  office_types: any;
  commentby_testers: any;
  test_results: any;

  // source (for DC/Zone lookup)
  selectedSourceType: any;
  selectedSourceName: string = '';
  filteredSources: any;

  // Assigned-device picker modal state
  asgPicker = {
    open: false,
    list: [] as AssignmentItem[],
    filter: '',
    selected: {} as Record<number, boolean>, // key: assignment_id
    replaceExisting: true
  };

  // lab info fetched from server
  labInfo: {
    lab_name?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    left_logo_url?: string | null;
    right_logo_url?: string | null;
  } | null = null;
  device_testing_purpose: any;
  device_type: any;

  constructor(
    private api: ApiServicesService,
    private pdfSvc: SolarGenMeterCertificatePdfService
  ) {}

  ngOnInit(): void {
    this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    this.currentLabId  = Number(localStorage.getItem('currentLabId') || 0);
    const userNameFromLS = localStorage.getItem('currentUserName') || '';
    if (userNameFromLS) this.testing_user = userNameFromLS;

    this.api.getEnums().subscribe({
      next: (d) => {
        this.test_methods  = d?.test_methods || [];
        this.test_statuses = d?.test_statuses || [];
        this.office_types  = d?.office_types || [];
        this.commentby_testers = d?.commentby_testers || [];
        this.test_results = d?.test_results || [];
        this.device_testing_purpose = d?.test_report_types?.SOLAR_GENERATOR;
        this.device_type = d.device_types?.METER;
      }
    });

    // Fetch LAB info (for PDF header + logos)
    this.api.getLabInfo(this.currentLabId).subscribe({
      next: (info: any) => {
        this.labInfo = {
          lab_name: info?.lab_pdfheader_name || info?.lab_name || null,
          address:  info?.address || info?.address_line || null,
          email:    info?.email || null,
          phone:    info?.phone || null,
          left_logo_url:  info?.left_logo_url || null,
          right_logo_url: info?.right_logo_url || null
        };
        if (this.labInfo.left_logo_url)  this.leftLogoUrl  = this.labInfo.left_logo_url!;
        if (this.labInfo.right_logo_url) this.rightLogoUrl = this.labInfo.right_logo_url!;
      },
      error: () => {}
    });

    // Warm assigned (don’t replace table)
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

  // ======= Computed chips =======
  get matchedCount(){ return (this.rows ?? []).filter(r => !!r.meter_sr_no && !r.notFound).length; }
  get unknownCount(){ return (this.rows ?? []).filter(r => !!r.notFound).length; }

  // ======= Helpers =======
  private emptyRow(seed?: Partial<CertRow>): CertRow {
    return {
      _open: true,
      consumer_name: '',
      address: '',
      meter_make: '',
      meter_sr_no: '',
      meter_capacity: '',
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
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId, this.device_type, this.device_testing_purpose).subscribe({
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        this.rebuildSerialIndex(asg);

        // set form header fields from first device/bench/user (if present)
        const first = asg.find(a => a.device);
        if (first?.device){
          this.header.location_code = this.header.location_code || (first.device.location_code ?? '');
          this.header.location_name = this.header.location_name || (first.device.location_name ?? '');
          this.testing_bench = this.testing_bench || (first.testing_bench?.bench_name ?? '');
          this.testing_user  = this.testing_user || (first.user_assigned?.name ?? this.testing_user);
        }

        if (replaceRows) {
          // rarely used (we normally use the picker)
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

        // cache list for picker
        this.asgPicker.list = asg;

        this.loading = false;
      },
      error: () => { this.loading = false; this.openAlert('error','Reload failed','Could not fetch assigned meters.'); }
    });
  }

  // Assigned picker
  openAssignedPicker() {
    this.reloadAssigned(false);
    this.asgPicker.selected = {};
    this.asgPicker.filter = '';
    this.asgPicker.replaceExisting = true;
    this.asgPicker.open = true;
  }
  closeAssignedPicker(){ this.asgPicker.open = false; }
  get filteredAssigned(): AssignmentItem[] {
    const q = this.asgPicker.filter.trim().toLowerCase();
    let list = this.asgPicker.list || [];
    if (!q) return list;
    return list.filter(a => {
      const d = a.device || ({} as MeterDevice);
      return (d.serial_number || '').toLowerCase().includes(q)
          || (d.make || '').toLowerCase().includes(q)
          || (d.capacity || '').toLowerCase().includes(q);
    });
  }
  toggleSelectAllVisible(checked: boolean) {
    for (const a of this.filteredAssigned) {
      this.asgPicker.selected[a.id] = checked;
    }
  }
  confirmAssignedSelection() {
    const chosen = this.asgPicker.list.filter(a => this.asgPicker.selected[a.id]);
    if (!chosen.length){
      this.openAlert('warning', 'No selection', 'Select at least one device.');
      return;
    }
    const newRows = chosen.map(a => {
      const d = a.device || ({} as MeterDevice);
      return this.emptyRow({
        meter_sr_no: d.serial_number || '',
        meter_make: d.make || '',
        meter_capacity: d.capacity || '',
        assignment_id: a.id ?? 0,
        device_id: d.id ?? a.device_id ?? 0,
        _open: true,
        notFound: false
      });
    });

    if (this.asgPicker.replaceExisting) {
      this.rows = newRows.length ? newRows : [this.emptyRow()];
    } else {
      this.rows.push(...newRows);
    }

    this.closeAssignedPicker();
    this.openAlert('info', 'Devices added', `${newRows.length} device(s) added.`, 1500);
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
  removeRow(i: number) {
    if (i>=0 && i<this.rows.length){
      this.rows.splice(i,1);
      if (!this.rows.length) this.rows.push(this.emptyRow());
      this.openAlert('success', 'Row removed', `Row #${i+1} removed.`, 1200);
    }
  }

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

  // ========= helpers =========
  private numOrNull(v:any){ const n = Number(v); return isFinite(n) ? n : null; }
  private isoOn(dateStr?: string){ const d = dateStr? new Date(dateStr+'T10:00:00') : new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString(); }

  private inferredTestResult(r: CertRow): string | undefined {
    const vals = [r.starting_current_test, r.creep_test, r.dial_test].map(v => (v || '').toString().toLowerCase());
    if (!vals.some(v => v)) return r.test_result || undefined;
    if (vals.some(v => v.includes('fail'))) return 'FAIL';
    return r.test_result || 'PASS';
  }

  // Build API payload
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

        reading_before_test: this.numOrNull(r.starting_reading),
        reading_after_test:  this.numOrNull(r.final_reading_r),
        ref_start_reading: null,
        ref_end_reading: null,
        error_percentage: null,

        details: r.remark || null,
        test_result: this.inferredTestResult(r) || null,
        test_method: this.testMethod || null,
        test_status: this.testStatus || null,

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
        starting_current_test: null,
        creep_test: null,
        dail_test: null,
        final_remarks: r.remark || null,

        p4_division: null,
        p4_no: null,
        p4_date: null,
        p4_metercodition: null,

        approver_id: null,
        approver_remark: null,

        report_id: null,
        report_type: 'SOLAR_GENERATION_METER',

        created_by: String(this.currentUserId || ''),
      }));
  }

  // ========= submit =========
  openConfirm(action: ModalAction){
    this.alertSuccess = null; this.alertError = null;
    this.modal.action = action;
    if (action === 'submit') {
      this.modal.title = 'Submit Batch — Preview';
      this.modal.message = '';
      this.modal.open = true;
    }
  }
  closeModal(){ this.modal.open=false; this.modal.action=null; this.modal.payload=undefined; }

  confirmModal(){
    if (this.modal.action === 'submit') this.doSubmitBatch();
  }

  private doSubmitBatch(){
    const payload = this.buildPayload();
    if (!payload.length){
      this.alertError = 'No valid rows to submit.';
      this.openAlert('warning', 'Nothing to submit', 'Please add at least one valid row.');
      return;
    }
    const missingDt = payload.findIndex(p => !p.start_datetime);
    if (missingDt !== -1){
      this.alertError = `Row #${missingDt+1} is missing Date of Testing.`;
      this.openAlert('warning', 'Validation error', this.alertError);
      return;
    }

    this.submitting = true;
    this.alertSuccess = null;
    this.alertError = null;

    this.api.postTestReports(payload).subscribe({
      next: async () => {
        this.submitting = false;

        // Build PDF header from labInfo + form
        const hdr: GenHeader = {
          location_code: this.header.location_code,
          location_name: this.header.location_name,
          testMethod: this.testMethod,
          testStatus: this.testStatus,
          testing_bench: this.testing_bench,
          testing_user: this.testing_user,
          date: new Date().toLocaleDateString(),

          lab_name:    this.labInfo?.lab_name || null,
          lab_address: this.labInfo?.address   || null,
          lab_email:   this.labInfo?.email     || null,
          lab_phone:   this.labInfo?.phone     || null,
          leftLogoUrl:  this.labInfo?.left_logo_url  || this.leftLogoUrl || '/assets/icons/wzlogo.png',
          rightLogoUrl: this.labInfo?.right_logo_url || this.rightLogoUrl || '/assets/icons/wzlogo.png'
        };

        const rows: GenRow[] = (this.rows || [])
          .filter(r => (r.meter_sr_no||'').trim())
          .map(r => ({
            certificate_no: r.certificate_no || null,
            consumer_name: r.consumer_name || null,
            address: r.address || null,
            meter_make: r.meter_make || null,
            meter_sr_no: r.meter_sr_no || null,
            meter_capacity: r.meter_capacity || null,
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
            test_result: r.test_result || this.inferredTestResult(r) || null,
            remark: r.remark || null
          }));

        try {
          await this.pdfSvc.download(hdr, rows, 'SOLAR_GENERATIONMETER_CERTIFICATES.pdf');
          this.openAlert('success', 'PDF downloaded', 'Certificates generated and downloaded.', 1500);
        } catch {
          this.openAlert('warning', 'PDF error', 'Saved, but PDF could not be generated.');
        }

        this.alertSuccess = 'Batch submitted successfully!';
        this.rows = [ this.emptyRow() ];
        setTimeout(()=> this.closeModal(), 800);
      },
      error: (err) => {
        this.submitting = false;
        this.alertError = 'Error submitting certificate. Please verify fields and try again.';
        this.openAlert('error','Submission failed','Something went wrong while submitting the batch.');
        console.error(err);
      }
    });
  }

  // alerts
openAlert(
  type: 'success' | 'error' | 'warning' | 'info',
  title: string,
  message: string,
  autoCloseMs: number = 0
) {
  if (this.alert._t) { clearTimeout(this.alert._t); }
  this.alert = { ...this.alert, open: true, type, title, message, autoCloseMs, _t: 0 };
  if (autoCloseMs > 0) {
    this.alert._t = setTimeout(() => this.closeAlert(), autoCloseMs) as any;
  }
}

closeAlert() {
  if (this.alert._t) { clearTimeout(this.alert._t); }
  this.alert.open = false;
}

}
