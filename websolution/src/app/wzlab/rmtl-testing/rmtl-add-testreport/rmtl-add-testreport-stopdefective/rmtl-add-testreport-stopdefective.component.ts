import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

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
  currentUserId: Id = 0;
  currentLabId: Id = 0;
  approverId: number | null = null;

  // header/date + ui
  header: Header = { location_code: '', location_name: '', phase: '', testing_bench: '', testing_user: '', approving_user: '' };
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

  constructor(private api: ApiServicesService) {}

  // ===== lifecycle
  ngOnInit(): void {
    // IDs first (sync)
    this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    this.currentLabId  = Number(localStorage.getItem('currentLabId')  || 0);
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

          // fill header from first device
          const first = list.find(a => a.device);
          if (first?.device) {
            this.header.location_code = first.device.location_code ?? '';
            this.header.location_name = first.device.location_name ?? '';
            if (!this.header.phase && first.device.phase) this.header.phase = (first.device.phase || '').toUpperCase();
          }
          this.loading = false;
        },
        error: () => { this.loading = false; }
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
  addBatchRow() { this.addRow(); }                  // alias for template compatibility
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
      next: () => {
        this.submitting = false;
        this.alertSuccess = 'Batch Report submitted successfully!';
        this.rows = [this.emptyRow()];
        this.batch.rows = this.rows;
        this.closeModal();
      },
      error: (e) => {
        this.submitting = false;
        this.alertSuccess = null;
        this.alertError = 'Error submitting report. Please verify rows and try again.';
        console.error(e);
      }
    });
  }
  payload: any[] = [];

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
          if (first?.device) {
            this.header.location_code = first.device.location_code ?? '';
            this.header.location_name = first.device.location_name ?? '';
            if (!this.header.phase && first.device.phase) this.header.phase = (first.device.phase || '').toUpperCase();
          }
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

  toggleSelectAllVisible(state: boolean) { for (const a of this.filteredAssigned) this.asgPicker.selected[a.id] = state; }

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

  // ===== utils
  private toYMD(d: Date): string {
    const dt = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return dt.toISOString().slice(0, 10);
  }
}
