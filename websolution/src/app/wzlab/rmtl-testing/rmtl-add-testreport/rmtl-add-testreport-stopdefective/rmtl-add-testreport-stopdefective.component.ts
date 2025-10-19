// src/app/wzlab/rmtl-testing/rmtl-add-testreport/rmtl-add-testreport-stopdefective/rmtl-add-testreport-stopdefective.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';

import {
  StopDefectiveReportPdfService,
  StopDefRow,
  StopDefMeta,
  PdfLogos
} from 'src/app/shared/stopdefective-report-pdf.service';

type Id = number;

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

  // The API provides these — we access them safely
  testing_bench?: { bench_name?: string } | null;
  user_assigned?: { name?: string; username?: string } | null;
  assigned_by_user?: { name?: string; username?: string } | null;
}

interface Row {
  // visible (match template)
  meter_sr_no: string;
  meter_make: string;
  meter_capacity: string;
  remark: string;
  test_result?: string;
  consumer_name?: string;

  // extended (template expects these keys)
  physical_condition_of_device?: string;
  seal_status?: string;
  meter_glass_cover?: string;
  terminal_block?: string;
  meter_body?: string;
  is_burned?: boolean;

  reading_before_test?: number;
  reading_after_test?: number;
  ref_start_reading?: number;
  ref_end_reading?: number;
  error_percentage?: number;

  // optional cert/meta (used in preview)
  certificate_no?: string;
  date_of_testing?: string;
  address?: string;
  testing_fees?: number;
  mr_no?: string;
  mr_date?: string;
  ref_no?: string;

  // small tests
  starting_current_test?: string;
  creep_test?: string;
  dial_test?: string;

  // linking
  device_id?: Id;
  assignment_id?: Id;

  // ui
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

interface AlertState {
  open: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

@Component({
  selector: 'app-rmtl-add-testreport-stopdefective',
  templateUrl: './rmtl-add-testreport-stopdefective.component.html',
  styleUrls: ['./rmtl-add-testreport-stopdefective.component.css']
})
export class RmtlAddTestreportStopdefectiveComponent implements OnInit {
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

  // type/purpose (must be valid before API)
  device_type = '';
  device_testing_purpose = '';
  report_type = '';

  // ids
  currentUserId: any;
  currentLabId: any;
  // currentUserId = 0;
  // currentLabId  = 0;
  //
  approverId:  any;

  // header/date + ui
  header: Header = {
    location_code: '',
    location_name: '',
    phase: '',
    testing_bench: '',
    testing_user: '',
    approving_user: ''
  };
  batchDate = this.toYMD(new Date()); // replaces batch.header.date
  filterText = '';
  loading = false;
  submitting = false;

  // rows
  rows: Row[] = [this.emptyRow()];

  // expose a batch adapter for template compatibility (batch.header.*, batch.rows)
  batch = { header: this.header, rows: this.rows };

  // preview modal
  modal: ModalState = { open: false, title: '', message: '' };
  alertSuccess: string | null = null;
  alertError: string | null = null;

  // picker modal
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

  // readiness flags
  private enumsReady = false;
  private idsReady = false;

  // quick serial index
  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: Id; assignment_id: Id; phase?: string; }> = {};

  // alerts
  alert: AlertState = { open: false, type: 'info', title: '', message: '' };

  // outgoing payload (debug/inspection)
  payload: any[] = [];
  ternal_testing_types: any;
  fees_mtr_cts: any;
  test_dail_current_cheaps: any;

  constructor(
    private api: ApiServicesService,
    private stopDefPdf: StopDefectiveReportPdfService,
    private authService: AuthService
  ) {}

  // ===== lifecycle
  ngOnInit(): void {
    // IDs first (sync)
    // this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    // this.currentLabId  = Number(localStorage.getItem('currentLabId')  || 0);
    this.currentUserId = this.authService.getuseridfromtoken();
    this.currentLabId = this.authService.getlabidfromtoken();
    this.idsReady = !!this.currentUserId && !!this.currentLabId;

    // enums
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
        this.ternal_testing_types = data?.device_testing_purpose || [];
        this.fees_mtr_cts= data?.fees_mtr_cts || [];
        this.test_dail_current_cheaps = data?.test_dail_current_cheaps || [];

        // normalize STOP_DEFECTIVE vs STOPDEFECTIVE
        const stopDef =
          data?.test_report_types?.STOP_DEFECTIVE ??
          data?.test_report_types?.STOPDEFECTIVE ??
          'STOP_DEFECTIVE';
        this.report_type = stopDef;
        this.device_testing_purpose = stopDef;

        // device type for this screen
        this.device_type = data?.device_types?.METER ?? 'METER';

        this.enumsReady = true;
        this.tryInitialLoad();

        // activity alert
        // this.raise('success', 'Configuration Ready', 'Enums loaded successfully.');
      },
      error: () => this.raise('error', 'Enums Load Failed', 'Unable to load configuration (enums). Please reload.')
    });
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

          // Fill header from first device + bench/users
          const first = list.find(a => a.device);
          this.fillHeaderFromAssignment(first);

          this.loading = false;
          // this.raise('success', 'Assigned Devices Loaded', `${list.length} item(s) available for selection.`);
        },
        error: () => {
          this.loading = false;
          this.raise('error', 'Load Failed', 'Could not load assigned devices.');
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
      _open: false,
      ...seed
    };
  }
  addRow() { this.rows.push(this.emptyRow()); }
  addBatchRow() { this.addRow(); } // alias for template compatibility
  removeRow(i: number) {
    this.rows.splice(i, 1);
    if (!this.rows.length) this.addRow();
  }
  get totalCount(): number { return this.rows.length; }

  trackByRow = (_: number, r: Row) =>
    `${r.assignment_id || 0}_${r.device_id || 0}_${r.meter_sr_no || ''}`;

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

  errorpercentage_calculate(i: number) {
    const r = this.rows[i];
    const before = Number(r.reading_before_test) || 0;
    const after  = Number(r.reading_after_test) || 0;
    const refS   = Number(r.ref_start_reading) || 0;
    const refE   = Number(r.ref_end_reading) || 0;
    const refDiff = refE - refS;
    if (refDiff !== 0) {
      r.error_percentage = Math.round(((after - before) - refDiff) / refDiff * 100);
    } else {
      r.error_percentage = 0;
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
        this.alertError = v.reason || 'Invalid data.';
        this.modal = { open: true, title: 'Validation Errors', message: v.reason || '', action: undefined };
        return;
      }
      this.alertError = null;
      this.modal = { open: true, title: 'Submit Batch Report — Preview', message: '', action: 'submit' };
    }
  }

  closeModal() { this.modal.open = false; }
  confirmModal() {
    if (this.modal.action === 'clear') {
      this.rows = [this.emptyRow()];
      this.batch.rows = this.rows; // keep adapter in sync
      this.closeModal();
      return;
    }
    if (this.modal.action === 'submit') {
      this.confirmSubmitFromModal();
    }
  }

  confirmSubmitFromModal() {
    const v = this.validateBeforeSubmit();
    if (!v.ok) { this.alertError = v.reason || 'Invalid data.'; return; }

    const whenISO = new Date(`${this.batchDate}T10:00:00`);
    const iso = new Date(whenISO.getTime() - whenISO.getTimezoneOffset() * 60000).toISOString();

    this.payload = this.rows
      .filter(r => (r.meter_sr_no || '').trim())
      .map(r => ({
        assignment_id: r.assignment_id!,
        device_id: r.device_id!,
        report_type: this.report_type,
        device_testing_purpose: this.device_testing_purpose,
        device_type: this.device_type,
        start_datetime: iso,
        end_datetime: iso,
        test_method: this.testMethod!,
        test_status: this.testStatus!,
        remark: r.remark || '-',
        test_result: r.test_result!,
        consumer_name: r.consumer_name || null,
        meta: {
          certificate_no: r.certificate_no || null,
          date_of_testing: r.date_of_testing || this.batchDate || null,
          address: r.address || null,
          testing_fees: r.testing_fees ?? null,
          mr_no: r.mr_no || null,
          mr_date: r.mr_date || null,
          ref_no: r.ref_no || null,
          reading: {
            before: r.reading_before_test ?? null,
            after: r.reading_after_test ?? null,
            ref_start: r.ref_start_reading ?? null,
            ref_end: r.ref_end_reading ?? null,
            error_pct: r.error_percentage ?? null
          }
        }
      }));

    this.submitting = true;
    this.api.postTestReports(this.payload).subscribe({
      next: async () => {
        this.submitting = false;
        this.alertSuccess = 'Batch Report submitted successfully!';

        // Immediate PDF
        await this.generatePdfAndNotify();

        // reset rows
        this.rows = [this.emptyRow()];
        this.batch.rows = this.rows;
        this.closeModal();

        this.raise('success', 'Submitted', 'Batch Report submitted successfully.');
      },
      error: (e) => {
        this.submitting = false;
        this.alertSuccess = null;
        this.alertError = 'Error submitting report. Please verify rows and try again.';
        console.error(e);
        this.raise('error', 'Submit Failed', 'Could not submit the batch report.');
      }
    });
  }

  // ===== picker
  openAssignedPicker() {
    const p = this.getAssignedParams();
    if (!p) { this.raise('warning', 'Missing Inputs', 'Please ensure Lab/User/Device Type/Purpose are ready.'); return; }

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

          // this.raise('info', 'Picker Ready', `${list.length} item(s) loaded. Use search or Select All.`);
        },
        error: () => { this.raise('error', 'Load Failed', 'Could not load assigned devices.'); }
      });
  }
  // alias to match old template call
  openPicker() { this.openAssignedPicker(); }

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

    // ALWAYS sort by make (A→Z); tie-break by serial
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
      const sr = d.serial_number.trim();
      if (!sr || existing.has(sr.toUpperCase())) continue;
      newRows.push({
        meter_sr_no: sr,
        meter_make: d.make || '',
        meter_capacity: d.capacity || '',
        remark: '',
        assignment_id: a.id,
        device_id: d.id || a.device_id,
        _open: false,
        notFound: false
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

    this.raise('success', 'Selection Added', `${newRows.length} row(s) added to the batch.`);
  }

  // ===== misc
  recompute(i: number) {
    const r = this.rows[i];
    const s = Number(r.reading_before_test) || 0;
    const f = Number(r.reading_after_test) || 0;
    r.error_percentage = +(f - s).toFixed(2);
  }

  raise(type: AlertState['type'], title: string, message: string) {
    this.alert = { open: true, type, title, message };
  }
  closeAlert() { this.alert.open = false; }

  // ===== PDF helpers (NEW)
  private buildPdfInputs(): { rows: StopDefRow[]; meta: StopDefMeta; logos?: PdfLogos } {
    const rows: StopDefRow[] = this.rows
      .filter(r => (r.meter_sr_no || '').trim())
      .map(r => ({
        serial: r.meter_sr_no,
        make: r.meter_make || '-',
        capacity: r.meter_capacity || '-',
        remark: r.remark || '-',
        test_result: r.test_result || '-' // service merges with remark
      }));

    const meta: StopDefMeta = {
      zone: `${this.header.location_code || ''} ${this.header.location_name || ''}`.trim() || '-',
      phase: this.header.phase || '-',
      date: this.batchDate,
      testMethod: this.testMethod || undefined,
      testStatus: this.testStatus || undefined,
      testing_bench: this.header.testing_bench || undefined,
      testing_user: this.header.testing_user || undefined,
      approving_user: this.header.approving_user || undefined,
      lab: {
        lab_name: 'REMOTE METERING TESTING LABORATORY INDORE',
        address_line: 'MPPKVVCL, Polo Ground, Indore (MP) 452003',
        email: 'testinglabwzind@gmail.com',
        phone: '0731-2997802'
      }
    };

    const logos: PdfLogos | undefined = {
      leftLogoUrl: '/assets/icons/wzlogo.png',
      rightLogoUrl: '/assets/icons/mpkvvcl.png'
    };

    return { rows, meta, logos };
  }

  private async generatePdfAndNotify() {
    try {
      const { rows, meta, logos } = this.buildPdfInputs();
      await this.stopDefPdf.download(rows, meta, logos);
      this.raise('success', 'PDF Generated', `Stop-Defective report downloaded for ${meta.date}.`);
    } catch (e) {
      console.error(e);
      this.raise('error', 'PDF Failed', 'Could not generate the PDF. Please try again.');
    }
  }

  // ===== util
  private toYMD(d: Date): string {
    const dt = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return dt.toISOString().slice(0, 10);
  }

  // ===== header population from API item (NEW)
  private fillHeaderFromAssignment(first?: AssignmentItem) {
    if (!first?.device) return;
    const d = first.device;

    this.header.location_code = d.location_code ?? '';
    this.header.location_name = d.location_name ?? '';
    if (!this.header.phase && d.phase) this.header.phase = (d.phase || '').toUpperCase();

    // bench / users from API payload
    const benchName = first?.testing_bench?.bench_name || '';
    this.header.testing_bench = benchName;

    const testerName = first?.user_assigned?.name || first?.user_assigned?.username || '';
    this.header.testing_user = testerName;

    const approverName = first?.assigned_by_user?.name || first?.assigned_by_user?.username || '';
    this.header.approving_user = approverName;
  }
}
