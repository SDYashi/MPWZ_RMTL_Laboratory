// src/app/.../rmtl-add-testreport-smartagainstmtr.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { SmartLabInfo } from 'src/app/shared/smartagainstmeter-report-pdf.service';
import {
  SmartAgainstMeterReportPdfService,
  SmartRow,
  SmartMeta,
  PdfLogos
} from 'src/app/shared/smartagainstmeter-report-pdf.service';

type Id = number;
type ErrorFromMode = 'SHUNT' | 'NUTRAL' | 'BOTH' | null;
type ViewMode = 'SHUNT' | 'NUTRAL' | 'BOTH';

interface AssignmentDevice {
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
  device?: AssignmentDevice | null;

  testing_bench?: { bench_name?: string } | null;
  user_assigned?: { name?: string; username?: string } | null;
  assigned_by_user?: { name?: string; username?: string } | null;
}

interface Row {
  meter_sr_no: string;
  meter_make: string;
  meter_capacity: string;

  remark?: string; // UI comment -> maps to details/final_remarks
  test_result?: string; // enum
  consumer_name?: string;
  consumer_address?: string;

  // Fees
  testing_fees?: string | null;
  fees_mr_no?: string | null;
  fees_mr_date?: string | null; // yyyy-mm-dd
  ref_no?: string | null;

  // SHUNT (required)
  shunt_reading_before_test?: number | null;
  shunt_reading_after_test?: number | null;
  shunt_ref_start_reading?: number | null;
  shunt_ref_end_reading?: number | null;
  shunt_current_test?: string | null;
  shunt_creep_test?: string | null;
  shunt_dail_test?: string | null;
  shunt_error_percentage?: number | null;

  // NUTRAL (required)
  nutral_reading_before_test?: number | null;
  nutral_reading_after_test?: number | null;
  nutral_ref_start_reading?: number | null;
  nutral_ref_end_reading?: number | null;
  nutral_current_test?: string | null;
  nutral_creep_test?: string | null;
  nutral_dail_test?: string | null;
  nutral_error_percentage?: number | null;

  // Optional combined error -> stored in error_percentage_import
  error_from_mode: ErrorFromMode;
  error_percentage_import?: number | null;

  // Device condition
  physical_condition_of_device?: string | null;
  seal_status?: string | null;
  meter_glass_cover?: string | null;
  terminal_block?: string | null;
  meter_body?: string | null;
  is_burned?: boolean;
  certificate_number?: string | null;
  final_remarks?: string | null;

  device_id?: Id;
  assignment_id?: Id;

  // UI only
  view_mode?: ViewMode;

  _open?: boolean;
  notFound?: boolean;
}

interface Header {
  location_code: string;
  location_name: string;
  phase: string;
  testing_bench: string;
  testing_user: string;
  approving_user: string;
}

interface ModalState {
  open: boolean;
  title: string;
  message: string;
  action?: 'submit' | 'clear';
}

@Component({
  selector: 'app-rmtl-add-testreport-smartagainstmtr',
  templateUrl: './rmtl-add-testreport-smartagainstmtr.component.html',
  styleUrls: ['./rmtl-add-testreport-smartagainstmtr.component.css']
})
export class RmtlAddTestreportSmartagainstmtrComponent implements OnInit {
  // ===== enums/options
  commentby_testers: string[] = [];
  test_results: string[] = [];
  test_methods: string[] = [];
  test_statuses: string[] = [];
  physical_conditions: string[] = [];
  seal_statuses: string[] = [];
  glass_covers: string[] = [];
  terminal_blocks: string[] = [];
  meter_bodies: string[] = [];
  makes: string[] = [];
  capacities: string[] = [];
  device_status: 'ASSIGNED' = 'ASSIGNED';

  device_type = '';
  device_testing_purpose = '';
  report_type = '';

  // ids
  currentUserId: any;
  currentLabId: any;
  approverId: any;

  // header/date + ui
  header: Header = {
    location_code: '',
    location_name: '',
    phase: '',
    testing_bench: '',
    testing_user: '',
    approving_user: ''
  };
  batchDate = this.toYMD(new Date());
  filterText = '';
  loading = false;
  submitting = false;

  inlineInfo: string | null = null;
  inlineError: string | null = null;

  rows: Row[] = [this.emptyRow()];
  batch = { header: this.header, rows: this.rows };

  modal: ModalState = { open: false, title: '', message: '' };
  success = { open: false, message: '' };

  // picker
  asgPicker = {
    open: false,
    filter: '',
    selected: {} as Record<Id, boolean>,
    list: [] as AssignmentItem[],
    replaceExisting: true
  };

  // selected method/status
  testMethod: string | null = null;
  testStatus: string | null = null;

  // Global view mode (toolbar)
  globalViewMode: ViewMode = 'BOTH';

  private enumsReady = false;
  private idsReady = false;

  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: Id; assignment_id: Id; phase?: string; }> = {};
  // Lab info + benches
  labInfo: SmartLabInfo | null = null;
  benches: string[] = [];
  payload: any[] = [];
  ternal_testing_types: string[] = [];
  fees_mtr_cts: (string | number)[] = [];
  test_dail_current_cheaps: string[] = [];

  constructor(
    private api: ApiServicesService,
    private smartPdf: SmartAgainstMeterReportPdfService, 
    private authService: AuthService
  ) {}

  // ===== lifecycle
  ngOnInit(): void {
    this.currentUserId = this.authService.getuseridfromtoken();
    this.currentLabId = this.authService.getlabidfromtoken();
    this.idsReady = !!this.currentUserId && !!this.currentLabId;

    this.api.getEnums().subscribe({
      next: (data) => {
        this.device_status = (data?.device_status as 'ASSIGNED') ?? 'ASSIGNED';

        this.commentby_testers = data?.commentby_testers || [];
        this.test_results = data?.test_results || [];
        this.test_methods = data?.test_methods || [];
        this.test_statuses = data?.test_statuses || [];
        this.physical_conditions = data?.physical_conditions || [];
        this.seal_statuses = data?.seal_statuses || [];
        this.glass_covers = data?.glass_covers || [];
        this.terminal_blocks = data?.terminal_blocks || [];
        this.meter_bodies = data?.meter_bodies || [];
        this.makes = data?.makes || [];
        this.capacities = data?.capacities || [];

        // ← the only difference vs Stop/Defective
        const smart =
          data?.test_report_types?.SMART_AGAINST_METER ??
          data?.test_report_types?.SMARTAGAINSTMETER ?? 'SMART_AGAINST_METER';
        this.report_type = smart;
        this.device_testing_purpose = smart;
        this.device_type = data?.device_types?.METER ?? 'METER';

        this.ternal_testing_types = data?.ternal_testing_types || ['SHUNT', 'NUTRAL', 'BOTH'];
        this.fees_mtr_cts = data?.fees_mtr_cts || [];
        this.test_dail_current_cheaps = data?.test_dail_current_cheaps || [];

        this.enumsReady = true;
        this.tryInitialLoad();
      },
      error: () => {
        this.inlineError = 'Unable to load configuration (enums). Please reload.';
      }
    });

    // Lab info (for PDF header)
    if (this.currentLabId) {
      this.api.getLabInfo(this.currentLabId).subscribe({
        next: (info: any) => {
          this.labInfo = {
            lab_name: String(info?.lab_pdfheader_name || info?.lab_name || '').trim(),
            address_line: String(info?.address || info?.address_line || '').trim(),
            email: String(info?.email || info?.contact_email || info?.lab_email || info?.support_email || '').trim(),
            phone: String(info?.phone || info?.phone_no || info?.contact_phone || info?.mobile || info?.tel || '').trim()
          };
          this.benches = Array.isArray(info?.benches) ? info.benches : [];
        }
      });
    }
  }

  // ===== guards + load
  private getAssignedParams() {
    const purpose = this.device_testing_purpose?.trim();
    const dtype = this.device_type?.trim();
    const uid = Number(this.currentUserId) || 0;
    const lid = Number(this.currentLabId) || 0;
    if (!purpose || !dtype || !uid || !lid) return null;
    return { status: this.device_status, user_id: uid, lab_id: lid, device_testing_purpose: purpose, device_type: dtype };
  }

  private tryInitialLoad() {
    if (!this.enumsReady || !this.idsReady) return;
    this.reloadAssignedIndex();
  }

  private reloadAssignedIndex() {
    const p = this.getAssignedParams();
    if (!p) return;

    this.loading = true;
    this.api.getAssignedMeterList(p.status, p.user_id, p.lab_id, p.device_testing_purpose, p.device_type)
      .subscribe({
        next: (data: any) => {
          const list: AssignmentItem[] = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
          this.asgPicker.list = list;
          this.rebuildSerialIndex(list);

          const first = list.find(a => a.device);
          this.fillHeaderFromAssignment(first);

          this.loading = false;
          this.inlineInfo =  `Total ${list.length} assigned device(s) loaded for Smart Against Meter.`;
        },
        error: () => {
          this.loading = false;
          this.inlineError = 'No assigned devices found for Smart Against Meter.';
        }
      });
  }

  private rebuildSerialIndex(assignments: AssignmentItem[]) {
    this.serialIndex = {};
    for (const a of assignments) {
      const d = a.device;
      const serial = (d?.serial_number || '').toUpperCase().trim();
      if (!serial) continue;
      this.serialIndex[serial] = {
        make: d?.make || '',
        capacity: d?.capacity || '',
        device_id: d?.id ?? a.device_id,
        assignment_id: a.id,
        phase: d?.phase || ''
      };
    }
  }

  // ===== rows helpers
  private emptyRow(seed: Partial<Row> = {}): Row {
    return {
      meter_sr_no: '',
      meter_make: '',
      meter_capacity: '',
      remark: '',
      view_mode: 'BOTH',
      error_from_mode: null,
      _open: false,
      ...seed
    };
  }
  addRow() { this.rows.push(this.emptyRow()); }
  addBatchRow() { this.addRow(); }
  removeRow(i: number) {
    this.rows.splice(i, 1);
    if (!this.rows.length) this.addRow();
  }
  get totalCount(): number { return this.rows.length; }

  applyViewModeToAll() {
    for (const r of this.rows) r.view_mode = this.globalViewMode;
  }

  trackByRow = (_: number, r: Row) =>
    `${r.assignment_id || 0}_${r.device_id || 0}_${(r.meter_sr_no || '').toUpperCase()}`;

  onSerialChanged(i: number, sr: string) {
    const key = (sr || '').toUpperCase().trim();
    const row = this.rows[i];
    const hit = this.serialIndex[key];

    if (hit) {
      row.meter_make = hit.make || '';
      row.meter_capacity = hit.capacity || '';
      row.device_id = hit.device_id;
      row.assignment_id = hit.assignment_id;
      row.notFound = false;

      if (!this.header.phase && hit.phase) this.header.phase = (hit.phase || '').toUpperCase();
    } else {
      row.meter_make = '';
      row.meter_capacity = '';
      row.device_id = undefined;
      row.assignment_id = undefined;
      row.notFound = !!key;
    }
  }

  displayRows(): Row[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter(r =>
      (r.meter_sr_no || '').toLowerCase().includes(q) ||
      (r.meter_make || '').toLowerCase().includes(q) ||
      (r.meter_capacity || '').toLowerCase().includes(q) ||
      (r.remark || '').toLowerCase().includes(q) ||
      (r.consumer_name || '').toLowerCase().includes(q)
    );
  }

  get matchedCount(): number { return this.rows.filter(r => !!r.meter_sr_no && !r.notFound).length; }
  get unknownCount(): number { return this.rows.filter(r => !!r.notFound).length; }

  // ===== numbers + calc
  private toNumOrNull(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private computeError(before?: number | null, after?: number | null, refStart?: number | null, refEnd?: number | null): number | null {
    const b = Number(before);
    const a = Number(after);
    const s = Number(refStart);
    const e = Number(refEnd);
    if (!Number.isFinite(b) || !Number.isFinite(a) || !Number.isFinite(s) || !Number.isFinite(e)) return null;
    const refDiff = e - s;
    if (!refDiff) return 0;
    const pct = ((a - b) - refDiff) / refDiff * 100;
    return Math.round(pct * 100) / 100;
  }

  calcShunt(i: number) {
    const r = this.rows[i];
    r.shunt_error_percentage = this.computeError(r.shunt_reading_before_test, r.shunt_reading_after_test, r.shunt_ref_start_reading, r.shunt_ref_end_reading);
    if (r.error_from_mode === 'SHUNT') {
      r.error_percentage_import = r.shunt_error_percentage ?? null;
    }
  }

  calcNutral(i: number) {
    const r = this.rows[i];
    r.nutral_error_percentage = this.computeError(r.nutral_reading_before_test, r.nutral_reading_after_test, r.nutral_ref_start_reading, r.nutral_ref_end_reading);
    if (r.error_from_mode === 'NUTRAL') {
      r.error_percentage_import = r.nutral_error_percentage ?? null;
    }
  }

  // Combined error chooser
  calculateErrorPct(i: number) {
    const r = this.rows[i];
    if (r.error_from_mode === 'SHUNT') {
      if (r.shunt_error_percentage == null) this.calcShunt(i);
      r.error_percentage_import = r.shunt_error_percentage ?? null;
    } else if (r.error_from_mode === 'NUTRAL') {
      if (r.nutral_error_percentage == null) this.calcNutral(i);
      r.error_percentage_import = r.nutral_error_percentage ?? null;
    } else if (r.error_from_mode === 'BOTH') {
      this.calcNutral(i);
      this.calcShunt(i);
      const shuntErr = r.shunt_error_percentage;
      const nutralErr = r.nutral_error_percentage;
      r.error_percentage_import =
        (shuntErr != null && nutralErr != null) ? Math.round(((shuntErr + nutralErr) / 2) * 100) / 100 : null;
    } else {
      r.error_percentage_import = null;
    }
  }

  // ===== validation
  private validateBeforeSubmit(): { ok: boolean; reason?: string } {
    const p = this.getAssignedParams();
    if (!p) return { ok: false, reason: 'Missing required data: Lab/User/Device Type/Purpose.' };

    if (!this.header.location_code || !this.header.location_name) {
      return { ok: false, reason: 'Zone/DC Code & Name are required (auto-filled from assignment).' };
    }
    if (!this.testMethod) return { ok: false, reason: 'Select a Test Method.' };
    if (!this.testStatus) return { ok: false, reason: 'Select a Test Status.' };

    const clean = this.rows.filter(r => (r.meter_sr_no || '').trim());
    if (!clean.length) return { ok: false, reason: 'Enter at least one serial number.' };

    for (let i = 0; i < clean.length; i++) {
      const r = clean[i];
      if (r.notFound) return { ok: false, reason: `Row #${i + 1}: Serial not in assigned list.` };
      if (!r.assignment_id || !r.device_id) return { ok: false, reason: `Row #${i + 1}: Missing assignment/device mapping.` };
      if (!r.test_result) return { ok: false, reason: `Row #${i + 1}: Choose Test Result.` };
    }
    return { ok: true };
  }

  // ===== confirm + submit
  openConfirm(action: 'submit' | 'clear') {
    if (action === 'clear') {
      this.modal = { open: true, title: 'Clear All Rows', message: 'Clear all rows and leave one empty row?', action: 'clear' };
      return;
    }
    if (action === 'submit') {
      const v = this.validateBeforeSubmit();
      if (!v.ok) {
        this.inlineError = v.reason || 'Invalid data.';
        this.modal = { open: false, title: '', message: '', action: undefined };
        return;
      }
      this.inlineError = null;
      this.modal = { open: true, title: 'Submit Batch Report — Preview', message: '', action: 'submit' };
    }
  }

  closeModal() { this.modal.open = false; }
  confirmModal() {
    if (this.modal.action === 'clear') {
      this.rows = [this.emptyRow()];
      this.batch.rows = this.rows;
      this.closeModal();
      return;
    }
    if (this.modal.action === 'submit') {
      this.confirmSubmitFromModal();
    }
  }

  async confirmSubmitFromModal() {
    const v = this.validateBeforeSubmit();
    if (!v.ok) { this.inlineError = v.reason || 'Invalid data.'; return; }

    const whenISO = new Date(`${this.batchDate}T10:00:00`);
    const iso = new Date(whenISO.getTime() - whenISO.getTimezoneOffset() * 60000).toISOString();

    this.payload = this.rows
      .filter(r => (r.meter_sr_no || '').trim())
      .map(r => {
        const body: any = {
          assignment_id: r.assignment_id!,
          device_id: r.device_id!,
          report_type: this.report_type,
          start_datetime: iso,
          end_datetime: iso,
          test_method: this.testMethod!,
          test_status: this.testStatus!,
          test_result: r.test_result!,

          // remarks mapping
          details: r.remark ?? r.final_remarks ?? null,
          final_remarks: r.final_remarks ?? r.remark ?? null,

          // identity & address
          consumer_name: r.consumer_name ?? null,
          consumer_address: r.consumer_address ?? null,

          // receipts & refs
          certificate_number: r.certificate_number ?? null,
          testing_fees: r.testing_fees,
          fees_mr_no: r.fees_mr_no ?? null,
          fees_mr_date: r.fees_mr_date ?? null,
          ref_no: r.ref_no ?? null,

          // device condition
          physical_condition_of_device: r.physical_condition_of_device ?? null,
          seal_status: r.seal_status ?? null,
          meter_glass_cover: r.meter_glass_cover ?? null,
          terminal_block: r.terminal_block ?? null,
          meter_body: r.meter_body ?? null,
          is_burned: !!r.is_burned,

          // combined error (optional)
          error_percentage_import: this.toNumOrNull(r.error_percentage_import),

          // audit
          created_by: String(this.currentUserId || ''),
          updated_by: String(this.currentUserId || '')
        };

        // SHUNT readings (required)
        body.shunt_reading_before_test = this.toNumOrNull(r.shunt_reading_before_test);
        body.shunt_reading_after_test  = this.toNumOrNull(r.shunt_reading_after_test);
        body.shunt_ref_start_reading   = this.toNumOrNull(r.shunt_ref_start_reading);
        body.shunt_ref_end_reading     = this.toNumOrNull(r.shunt_ref_end_reading);
        body.shunt_current_test        = r.shunt_current_test? String(r.shunt_current_test).trim() : null;
        body.shunt_creep_test          = r.shunt_creep_test? String(r.shunt_creep_test).trim() : null;
        body.shunt_dail_test           = r.shunt_dail_test? String(r.shunt_dail_test).trim() : null;
        body.shunt_error_percentage    = this.toNumOrNull(r.shunt_error_percentage);

        // NUTRAL readings (required)
        body.nutral_reading_before_test = this.toNumOrNull(r.nutral_reading_before_test);
        body.nutral_reading_after_test  = this.toNumOrNull(r.nutral_reading_after_test);
        body.nutral_ref_start_reading   = this.toNumOrNull(r.nutral_ref_start_reading);
        body.nutral_ref_end_reading     = this.toNumOrNull(r.nutral_ref_end_reading);
        body.nutral_current_test        = r.nutral_current_test? String(r.nutral_current_test).trim() : null;
        body.nutral_creep_test          = r.nutral_creep_test? String(r.nutral_creep_test).trim() : null;
        body.nutral_dail_test           = r.nutral_dail_test? String(r.nutral_dail_test).trim() : null;
        body.nutral_error_percentage    = this.toNumOrNull(r.nutral_error_percentage);

        return body;
      });

    this.submitting = true;
    this.api.postTestReports(this.payload).subscribe({
      next: async () => {
        this.submitting = false;
        await this.generatePdfAndNotify();
        this.rows = [this.emptyRow()];
        this.batch.rows = this.rows;
        this.closeModal();
        this.inlineInfo = 'Submitted successfully.';
        this.inlineError = null;
      },
      error: (e) => {
        this.submitting = false;
        console.error(e);
        this.inlineError = 'Error submitting report. Please verify rows and try again.';
      }
    });
  }

  // ===== picker (same as Stop/Defective)
  openAssignedPicker() {
    const p = this.getAssignedParams();
    if (!p) { this.inlineError = 'Please ensure Lab/User/Device Type/Purpose are ready.'; return; }

    this.asgPicker.open = true;
    this.asgPicker.selected = {};
    this.api.getAssignedMeterList(p.status, p.user_id, p.lab_id, p.device_testing_purpose, p.device_type)
      .subscribe({
        next: (data: any) => {
          const list: AssignmentItem[] = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
          this.asgPicker.list = list;
          this.rebuildSerialIndex(list);

          const first = list.find(a => a.device);
          this.fillHeaderFromAssignment(first);
        },
        error: () => { this.inlineError = 'Could not load assigned devices.'; }
      });
  }
  closeAssignedPicker() { this.asgPicker.open = false; }

  get filteredAssigned(): AssignmentItem[] {
    const q = this.asgPicker.filter.trim().toLowerCase();
    const base = this.asgPicker.list.filter(a => {
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

  toggleSelectAllVisible(state: boolean) {
    for (const a of this.filteredAssigned) this.asgPicker.selected[a.id] = state;
  }

  confirmAssignedSelection() {
    const chosen = this.asgPicker.list.filter(a => this.asgPicker.selected[a.id] && a.device?.serial_number);
    const existing = new Set(this.rows.map(r => (r.meter_sr_no || '').toUpperCase().trim()));

    const newRows: Row[] = [];
    for (const a of chosen) {
      const d = a.device!;
      const sr = (d.serial_number || '').trim();
      if (!sr || existing.has(sr.toUpperCase())) continue;
      newRows.push({
        meter_sr_no: sr,
        meter_make: d.make || '',
        meter_capacity: d.capacity || '',
        remark: '',
        assignment_id: a.id,
        device_id: d.id || a.device_id,
        _open: false,
        notFound: false,
        error_from_mode: null,
        view_mode: this.globalViewMode
      });
      existing.add(sr.toUpperCase());
    }

    if (this.asgPicker.replaceExisting) {
      this.rows = newRows.length ? newRows : [this.emptyRow()];
      this.batch.rows = this.rows;
    } else {
      this.rows.push(...newRows);
    }
    this.asgPicker.open = false;

    this.inlineInfo = `${newRows.length} row(s) added to the batch.`;
    this.inlineError = null;
  }

  // ===== PDF helpers (reusing Stop/Defective PDF definition)
  private buildPdfInputs(): { rows: SmartRow[]; meta: SmartMeta; logos?: PdfLogos } {
    const rows: SmartRow[] = this.rows
      .filter(r => (r.meter_sr_no || '').trim())
      .map(r => ({
        serial: r.meter_sr_no,
        make: r.meter_make || '-',
        capacity: r.meter_capacity || '-',
        remark: r.remark || '-',
        test_result: r.test_result || '-'
      }));

    const meta: SmartMeta = {
      zone: `${this.header.location_code || ''} ${this.header.location_name || ''}`.trim() || '-',
      phase: this.header.phase || '-',
      date: this.batchDate,
      testMethod: this.testMethod || undefined,
      testStatus: this.testStatus || undefined,
      testing_bench: this.header.testing_bench || undefined,
      testing_user: this.header.testing_user || undefined,
      approving_user: this.header.approving_user || undefined,
      lab: {
        lab_name: this.labInfo?.lab_name || '',
        address_line: this.labInfo?.address_line || '',
        email: this.labInfo?.email || '',
        phone: this.labInfo?.phone || ''
      }
    };

    const logos: PdfLogos | undefined = {
      leftLogoUrl: '/assets/icons/wzlogo.png',
      rightLogoUrl: '/assets/icons/wzlogo.png',
    };

    return { rows, meta, logos };
  }

  async previewPdf() {
    try {
      await this.ensureLabInfo();
      const { rows, meta, logos } = this.buildPdfInputs();
      await this.smartPdf.open(rows, meta, logos);
    } catch (e) {
      console.error(e);
      this.inlineError = 'PDF preview failed. Please try again.';
    }
  }

  private async generatePdfAndNotify() {
    try {
      await this.ensureLabInfo();
      const { rows, meta, logos } = this.buildPdfInputs();
      await this.smartPdf.download(rows, meta, logos);
      this.inlineInfo = 'Batch Report submitted and PDF generated successfully.';
    } catch (e) {
      console.error(e);
      this.inlineError = 'PDF generation failed. Please try again.';
    }
  }

  // ===== util
  private toYMD(d: Date): string {
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private fillHeaderFromAssignment(first?: AssignmentItem) {
    if (!first?.device) return;
    const d = first.device;

    this.header.location_code = d.location_code ?? '';
    this.header.location_name = d.location_name ?? '';
    if (!this.header.phase && d.phase) this.header.phase = (d.phase || '').toUpperCase();

    const benchName = first?.testing_bench?.bench_name || '';
    this.header.testing_bench = benchName;

    const testerName = first?.user_assigned?.name || first?.user_assigned?.username || '';
    this.header.testing_user = testerName;

    const approverName = first?.assigned_by_user?.name || first?.assigned_by_user?.username || '';
    this.header.approving_user = approverName;
  }

  private ensureLabInfo(): Promise<void> {
    if (this.labInfo && (this.labInfo.lab_name || this.labInfo.address_line || this.labInfo.email || this.labInfo.phone)) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const lid = this.currentLabId;
      if (!lid) { resolve(); return; }
      this.api.getLabInfo(lid).subscribe({
        next: (info: any) => {
          this.labInfo = {
            lab_name: String(info?.lab_pdfheader_name || info?.lab_name || '').trim(),
            address_line: String(info?.address || info?.address_line || '').trim(),
            email: String(info?.email || info?.contact_email || info?.lab_email || info?.support_email || '').trim(),
            phone: String(info?.phone || info?.phone_no || info?.contact_phone || info?.mobile || info?.tel || '').trim()
          };
          this.benches = Array.isArray(info?.benches) ? info.benches : [];
          resolve();
        },
        error: () => resolve()
      });
    });
  }
}
