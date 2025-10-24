import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth.service';
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
  user_assigned?: { name?: string , username?: string} | null;
  assigned_by_user?: { name?: string , username?: string} | null;
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

  testing_fees?: number | null;
  mr_no?: string | null;
  mr_date?: string | null;
  ref_no?: string | null;

  // SHUNT fields
  shunt_reading_before_test?: number | null;
  shunt_reading_after_test?: number | null;
  shunt_ref_start_reading?: number | null;
  shunt_ref_end_reading?: number | null;
  _shunt_delta_meter?: number | null;
  _shunt_delta_ref?: number | null;
  shunt_error_percentage?: number | null;

  // NUTRAL fields
  nutral_reading_before_test?: number | null;
  nutral_reading_after_test?: number | null;
  nutral_ref_start_reading?: number | null;
  nutral_ref_end_reading?: number | null;
  _nutral_delta_meter?: number | null;
  _nutral_delta_ref?: number | null;
  nutral_error_percentage?: number | null;

  // qualitative tests
  starting_current_test?: string | null;
  creep_test?: string | null;
  dial_test?: string | null;

  remark?: string | null;
  test_result?: string | null;
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
  // ===== inline banner
  banner: { show: boolean; type: 'success'|'error'|'warning'|'info'; message: string; _t?: any } = {
    show: false, type: 'info', message: ''
  };

  // ===== header on form
  header = { location_code: '', location_name: '' };
  test_methods: any[] = [];
  test_statuses: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;

  // bench/user/approver
  testing_bench: string = '-';
  testing_user: string = '-';
  approver_user: string = '-';

  // logos (optional)
  leftLogoUrl: string = '';
  rightLogoUrl: string = '';

  // assignment context
  device_status: 'ASSIGNED' = 'ASSIGNED';
  currentUserId:any;
  currentLabId :any;
  loading = false;

  // enums
  office_types: any;
  commentby_testers: any;
  test_results: any;

  // mechanism selector
  channelView: 'SHUNT' | 'NUTRAL' | 'BOTH' = 'BOTH';

  // device meta
  device_testing_purpose: any;
  device_type: any;

  // table
  filterText = '';
  rows: CertRow[] = [ this.emptyRow() ];
  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: number; assignment_id: number; }> = {};

  // modal + submit state
  modal: ModalState = { open: false, title: '', message: '', action: null };
  submitting = false;
  alertSuccess: string | null = null;
  alertError: string | null = null;

  // source (optional)
  selectedSourceType: any;
  selectedSourceName: string = '';
  filteredSources: any;

  // Assigned-device picker
  asgPicker = {
    open: false,
    list: [] as AssignmentItem[],
    filter: '',
    selected: {} as Record<number, boolean>,
    replaceExisting: true
  };

  // lab info
  labInfo: {
    lab_name?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    left_logo_url?: string | null;
    right_logo_url?: string | null;
  } | null = null;

  fees_mtr_cts: any;
  test_dail_current_cheaps: any;

  constructor(
    private api: ApiServicesService,
    private pdfSvc: SolarGenMeterCertificatePdfService,
    private authService: AuthService
  ) {}

  // ---------- lifecycle ----------
  ngOnInit(): void {
    this.device_type= 'METER';
    this.device_testing_purpose = 'SOLAR_GENERATION_METER';
    this.currentUserId = this.authService.getuseridfromtoken();
    this.currentLabId = this.authService.getlabidfromtoken();
    const userNameFromLS = this.authService.getUserNameFromToken() || '';

    if (userNameFromLS) {
      this.testing_user = userNameFromLS;
      this.approver_user = userNameFromLS; // default approver to current user
    }

    this.api.getEnums().subscribe({
      next: (d) => {
        this.test_methods  = d?.test_methods || [];
        this.test_statuses = d?.test_statuses || [];
        this.office_types  = d?.office_types || [];
        this.commentby_testers = d?.commentby_testers || [];
        this.test_results = d?.test_results || [];
        this.fees_mtr_cts= d?.fees_mtr_cts || [];
        this.test_dail_current_cheaps = d?.test_dail_current_cheaps || [];

        this.device_testing_purpose =
          d?.test_report_types?.SOLAR_GENERATION_METER || 'SOLAR_GENERATION_METER';
        this.device_type = d?.device_types?.METER || 'METER';
      }
    });

    if (this.currentLabId) {
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
    }

    // Warm assigned (don’t replace table)
    this.reloadAssigned(false);
  }

  // ---------- validation ----------
  private validateContext(): { ok: boolean; msg?: string } {
    if (!this.currentUserId) return { ok:false, msg:'Missing user_id — please re-login.' };
    if (!this.currentLabId)  return { ok:false, msg:'Missing lab_id — select a lab.' };
    if (!this.device_type)   return { ok:false, msg:'Missing device_type.' };
    if (!this.device_testing_purpose) return { ok:false, msg:'Missing device_testing_purpose.' };
    return { ok:true };
  }

  private validate(): { ok: boolean; msg?: string } {
    const ctx = this.validateContext();
    if (!ctx.ok) return ctx;

    if (!this.testMethod || !this.testStatus) {
      return { ok:false, msg:'Select Test Method and Test Status.' };
    }

    const withSerial = (this.rows||[]).filter(r => (r.meter_sr_no||'').trim());
    if (!withSerial.length) return { ok:false, msg:'Add at least one valid row.' };

    const missingDateIdx = withSerial.findIndex(r => !r.date_of_testing);
    if (missingDateIdx !== -1) {
      return { ok:false, msg:`Row #${missingDateIdx+1}: Date of Testing is required.` };
    }

    this.testing_bench = this.testing_bench?.trim() || '-';
    this.testing_user  = this.testing_user?.trim()  || '-';
    this.approver_user = this.approver_user?.trim() || '-';

    return { ok:true };
  }

  // ---------- (optional) source fetch ----------
  fetchButtonData(): void {
    if (!this.selectedSourceType || !this.selectedSourceName) {
      this.showBanner('warning', 'Missing Input — Select a source type and enter code.');
      return;
    }
    this.api.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
      next: (data) => {
        this.filteredSources = data;
        this.header.location_name = this.filteredSources?.name ?? '';
        this.header.location_code = this.filteredSources?.code ?? '';
      },
      error: () => this.showBanner('error', 'Lookup failed — Check the code and try again.')
    });
  }
  onSourceTypeChange(): void { this.selectedSourceName = ''; this.filteredSources = []; }

  // ======= helpers =======
  private emptyRow(seed?: Partial<CertRow>): CertRow {
    return {
      _open: false,
      consumer_name: '',
      address: '',
      meter_make: '',
      meter_sr_no: '',
      meter_capacity: '',
      testing_fees: null,
      mr_no: null,
      mr_date: null,
      ref_no: null,

      // SHUNT defaults
      shunt_reading_before_test: null,
      shunt_reading_after_test: null,
      shunt_ref_start_reading: null,
      shunt_ref_end_reading: null,
      _shunt_delta_meter: null,
      _shunt_delta_ref: null,
      shunt_error_percentage: null,

      // NUTRAL defaults
      nutral_reading_before_test: null,
      nutral_reading_after_test: null,
      nutral_ref_start_reading: null,
      nutral_ref_end_reading: null,
      _nutral_delta_meter: null,
      _nutral_delta_ref: null,
      nutral_error_percentage: null,

      starting_current_test: null,
      creep_test: null,
      dial_test: null,
      remark: null,
      test_result: null,
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

  // ---------- assigned loading ----------
  reloadAssigned(replaceRows: boolean = true) {
    const v = this.validateContext();
    if (!v.ok) { this.showBanner('warning','Context error — ' + v.msg!); return; }

    this.loading = true;
    this.api.getAssignedMeterList(
      this.device_status, this.currentUserId, this.currentLabId, this.device_testing_purpose, this.device_type
    ).subscribe({
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        asg.sort((a,b)=>{
          const ma=(a.device?.make||'').toLowerCase(), mb=(b.device?.make||'').toLowerCase();
          if (ma!==mb) return ma.localeCompare(mb);
          return (a.device?.serial_number||'').localeCompare(b.device?.serial_number||'');
        });

        this.rebuildSerialIndex(asg);

        const first = asg.find(a => a.device);
        if (first?.device){
          this.header.location_code = this.header.location_code || (first.device.location_code ?? '');
          this.header.location_name = this.header.location_name || (first.device.location_name ?? '');
          this.testing_bench = (this.testing_bench && this.testing_bench !== '-') ? this.testing_bench : (first.testing_bench?.bench_name ?? '-');
          this.testing_user  = (this.testing_user  && this.testing_user  !== '-') ? this.testing_user  : (first.user_assigned?.name || first.user_assigned?.username || '-');
          this.approver_user = (this.approver_user && this.approver_user !== '-') ? this.approver_user : (first.assigned_by_user?.name || first.assigned_by_user?.username || '-');
        }

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

        this.asgPicker.list = asg;
        this.loading = false;
      },
      error: () => { this.loading = false; this.showBanner('error','Reload failed — Could not fetch assigned meters.'); }
    });
  }

  // ---------- Assigned picker ----------
  openAssignedPicker() {
    const v = this.validateContext();
    if (!v.ok) { this.showBanner('warning','Context error — ' + v.msg!); return; }
    if (!this.asgPicker.list.length) this.reloadAssigned(false);
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
    for (const a of this.filteredAssigned) this.asgPicker.selected[a.id] = checked;
  }
  confirmAssignedSelection() {
    const chosen = this.asgPicker.list.filter(a => this.asgPicker.selected[a.id]);
    if (!chosen.length){
      this.showBanner('warning', 'No selection — Select at least one device.');
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
        _open: false,
        notFound: false
      });
    });

    if (this.asgPicker.replaceExisting) {
      this.rows = newRows.length ? newRows : [this.emptyRow()];
    } else {
      const existing = new Set(this.rows.map(r => (r.meter_sr_no||'').toUpperCase()));
      newRows.forEach(r => {
        if (!existing.has((r.meter_sr_no||'').toUpperCase())) this.rows.push(r);
      });
    }

    this.closeAssignedPicker();
    this.showBanner('success', `${newRows.length} device(s) added.`);
  }

  // ---------- row + compute ----------
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
      this.showBanner('success', `Row #${i+1} removed.`);
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

  // Compute deltas and error% for SHUNT/NUTRAL
  recomputeChannel(i: number) {
    const r = this.rows[i];

    // SHUNT
    const sh_m_start = this.numOrNull(r.shunt_reading_before_test);
    const sh_m_final = this.numOrNull(r.shunt_reading_after_test);
    const sh_r_start = this.numOrNull(r.shunt_ref_start_reading);
    const sh_r_final = this.numOrNull(r.shunt_ref_end_reading);

    const sh_m_delta = (sh_m_start!=null && sh_m_final!=null) ? this.round4(sh_m_final - sh_m_start) : null;
    const sh_r_delta = (sh_r_start!=null && sh_r_final!=null) ? this.round4(sh_r_final - sh_r_start) : null;
    r._shunt_delta_meter = sh_m_delta;
    r._shunt_delta_ref = sh_r_delta;

    if (sh_m_delta!=null && sh_r_delta!=null && sh_r_delta!==0) {
      r.shunt_error_percentage = this.round2(((sh_m_delta - sh_r_delta) / sh_r_delta) * 100);
    } else {
      r.shunt_error_percentage = null;
    }

    // NUTRAL
    const nu_m_start = this.numOrNull(r.nutral_reading_before_test);
    const nu_m_final = this.numOrNull(r.nutral_reading_after_test);
    const nu_r_start = this.numOrNull(r.nutral_ref_start_reading);
    const nu_r_final = this.numOrNull(r.nutral_ref_end_reading);

    const nu_m_delta = (nu_m_start!=null && nu_m_final!=null) ? this.round4(nu_m_final - nu_m_start) : null;
    const nu_r_delta = (nu_r_start!=null && nu_r_final!=null) ? this.round4(nu_r_final - nu_r_start) : null;
    r._nutral_delta_meter = nu_m_delta;
    r._nutral_delta_ref = nu_r_delta;

    if (nu_m_delta!=null && nu_r_delta!=null && nu_r_delta!==0) {
      r.nutral_error_percentage = this.round2(((nu_m_delta - nu_r_delta) / nu_r_delta) * 100);
    } else {
      r.nutral_error_percentage = null;
    }
  }

  // ---------- numbers ----------
  private numOrNull(v:any){ const n = Number(v); return isFinite(n) ? n : null; }
  private round4(v:number){ return +v.toFixed(4); }
  private round2(v:number){ return +v.toFixed(2); }
  private isoOn(dateStr?: string){ const d = dateStr? new Date(dateStr+'T10:00:00') : new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString(); }

  private inferredTestResult(r: CertRow): string | undefined {
    const vals = [r.starting_current_test, r.creep_test, r.dial_test].map(v => (v || '').toString().toLowerCase());
    if (!vals.some(v => v)) return r.test_result || undefined;
    if (vals.some(v => v.includes('fail'))) return 'FAIL';
    return r.test_result || 'PASS';
  }

  // Build API payload (SHUNT/NUTRAL only)
  private buildPayload(): any[] {
    const requester = this.header.location_name || this.filteredSources?.name || null;

    return (this.rows || [])
      .filter(r => (r.meter_sr_no || '').trim())
      .map(r => ({
        device_id: r.device_id ?? 0,
        assignment_id: r.assignment_id ?? 0,

        start_datetime: this.isoOn(r.date_of_testing),
        end_datetime:   this.isoOn(r.date_of_testing),

        // No legacy scalar readings
        reading_before_test: null,
        reading_after_test:  null,
        ref_start_reading:   null,
        ref_end_reading:     null,
        error_percentage:    null,

        // SHUNT/NUTRAL payload
        shunt_reading_before_test: this.numOrNull(r.shunt_reading_before_test),
        shunt_reading_after_test:  this.numOrNull(r.shunt_reading_after_test),
        shunt_ref_start_reading:   this.numOrNull(r.shunt_ref_start_reading),
        shunt_ref_end_reading:     this.numOrNull(r.shunt_ref_end_reading),
        shunt_error_percentage:    this.numOrNull(r.shunt_error_percentage),

        nutral_reading_before_test: this.numOrNull(r.nutral_reading_before_test),
        nutral_reading_after_test:  this.numOrNull(r.nutral_reading_after_test),
        nutral_ref_start_reading:   this.numOrNull(r.nutral_ref_start_reading),
        nutral_ref_end_reading:     this.numOrNull(r.nutral_ref_end_reading),
        nutral_error_percentage:    this.numOrNull(r.nutral_error_percentage),

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

        test_requester_name: requester,

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
      const v = this.validate();
      if (!v.ok) { this.showBanner('warning','Validation error — ' + v.msg!); return; }
      this.modal.title = 'Submit Batch — Preview';
      this.modal.message = '';
      this.modal.open = true;
    }
  }
  closeModal(){ this.modal.open=false; this.modal.action=null; this.modal.payload=undefined; }
  confirmModal(){ if (this.modal.action === 'submit') this.doSubmitBatch(); }

  private doSubmitBatch(){
    const v = this.validate();
    if (!v.ok) { this.showBanner('warning','Validation error — ' + v.msg!); return; }

    const payload = this.buildPayload();

    this.submitting = true;
    this.alertSuccess = null;
    this.alertError = null;

    this.api.postTestReports(payload).subscribe({
      next: async () => {
        this.submitting = false;

        // PDF header
        const hdr: GenHeader = {
          location_code: this.header.location_code,
          location_name: this.header.location_name,
          testMethod: this.testMethod,
          testStatus: this.testStatus,
          testing_bench: this.testing_bench || '-',
          testing_user: this.testing_user || '-',
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

            // Include SHUNT/NUTRAL for PDF (service may choose what to render)
            shunt_reading_before_test: this.numOrNull(r.shunt_reading_before_test) ?? undefined,
            shunt_reading_after_test:  this.numOrNull(r.shunt_reading_after_test) ?? undefined,
            shunt_ref_start_reading:   this.numOrNull(r.shunt_ref_start_reading) ?? undefined,
            shunt_ref_end_reading:     this.numOrNull(r.shunt_ref_end_reading) ?? undefined,
            shunt_error_percentage:    this.numOrNull(r.shunt_error_percentage) ?? undefined,

            nutral_reading_before_test: this.numOrNull(r.nutral_reading_before_test) ?? undefined,
            nutral_reading_after_test:  this.numOrNull(r.nutral_reading_after_test) ?? undefined,
            nutral_ref_start_reading:   this.numOrNull(r.nutral_ref_start_reading) ?? undefined,
            nutral_ref_end_reading:     this.numOrNull(r.nutral_ref_end_reading) ?? undefined,
            nutral_error_percentage:    this.numOrNull(r.nutral_error_percentage) ?? undefined,

            starting_current_test: r.starting_current_test || null,
            creep_test: r.creep_test || null,
            dial_test: r.dial_test || null,
            test_result: r.test_result || this.inferredTestResult(r) || null,
            remark: r.remark || null
          }));

        try {
          await this.pdfSvc.download(hdr, rows, `SOLAR_GENERATIONMETER_CERTIFICATES_${hdr.date}.pdf`);
          this.showBanner('success', 'Certificates generated and downloaded.');
        } catch {
          this.showBanner('warning', 'Saved, but PDF could not be generated.');
        }

        this.alertSuccess = 'Batch submitted successfully!';
        this.rows = [ this.emptyRow() ];
        setTimeout(()=> this.closeModal(), 800);
      },
      error: (err) => {
        this.submitting = false;
        this.alertError = 'Error submitting certificate. Please verify fields and try again.';
        this.showBanner('error','Submission failed — Something went wrong while submitting the batch.');
        console.error(err);
      }
    });
  }

  // ---------- banner helpers ----------
  showBanner(type: 'success'|'error'|'warning'|'info', message: string, autoCloseMs: number = 4000) {
    if (this.banner._t) { clearTimeout(this.banner._t); this.banner._t = null; }
    this.banner.type = type;
    this.banner.message = message;
    this.banner.show = true;
    if (autoCloseMs && autoCloseMs > 0) {
      this.banner._t = setTimeout(() => this.clearBanner(), autoCloseMs);
    }
  }
  clearBanner(){
    if (this.banner._t) { clearTimeout(this.banner._t); this.banner._t = null; }
    this.banner.show = false;
    this.banner.message = '';
  }
}
