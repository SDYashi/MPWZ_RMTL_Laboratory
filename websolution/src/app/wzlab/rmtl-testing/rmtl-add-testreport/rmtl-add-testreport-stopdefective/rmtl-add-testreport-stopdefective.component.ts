import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

// === Canonical enums based on your API ===
type ReportUnion =
  | 'stopdefective'
  | 'contested'
  | 'P4_ONM'
  | 'P4_vig'
  | 'Solar netmeter'
  | 'Solar Generation Meter'
  | 'CT Testing';

type TestMethod = 'MANUAL' | 'AUTOMATIC';
type TestStatus = 'COMPLETED' | 'UNTESTABLE';
type TestResult = 'PASS' | 'FAIL';

interface MeterDevice {
  id: number;
  serial_number: string;
  make?: string;
  capacity?: string;
  phase?: string;
}

interface AssignmentItem {
  id: number;           // assignment_id
  device_id: number;
  device?: MeterDevice | null;
}

interface DeviceRow {
  serial: string;
  make: string;
  capacity: string;
  result: string;                 // free text (tester comment)
  device_id: number;
  assignment_id: number;
  notFound?: boolean;
  test_result?: TestResult;       // user-chosen PASS|FAIL
}

type ModalAction = 'reload' | 'fetch' | 'removeRow' | 'clear' | 'submit';

interface ModalState {
  open: boolean;
  title: string;
  message: string;
  action: ModalAction | null;
  payload?: any;
}

@Component({
  selector: 'app-rmtl-add-testreport-stopdefective',
  templateUrl: './rmtl-add-testreport-stopdefective.component.html',
  styleUrls: ['./rmtl-add-testreport-stopdefective.component.css']
})
export class RmtlAddTestreportStopdefectiveComponent implements OnInit {

  // Report tabs
  reportType: ReportUnion = 'stopdefective';
  reportTypes: ReportUnion[] = [
    'stopdefective', 'contested', 'P4_ONM', 'P4_vig', 'Solar netmeter', 'Solar Generation Meter', 'CT Testing'
  ];
  report_printing: ReportUnion | null = null;

  // === Common payload controls (API-aligned) ===
  testMethod: TestMethod = 'AUTOMATIC';    // API uses AUTOMATIC (not AUTOMATED)
  testStatus: TestStatus = 'COMPLETED';    // API uses COMPLETED/UNTESTABLE
  comment_bytester: string[] = ['Stop Defective', 'Display Off', 'Ok Found', 'Phase Mismatch', 'Burned', 'Terminal Melted'];
  testResultOptions: TestResult[] = ['PASS', 'FAIL'];
  approverId: number | null = null;

  // Header + rows
  batch = {
    header: { zone: '', phase: '', date: '' },
    rows: [] as DeviceRow[]
  };

  // Enums (from API)
  device_status: 'ASSIGNED' = 'ASSIGNED';
  test_methods: TestMethod[] = ['MANUAL', 'AUTOMATIC'];
  test_statuses: TestStatus[] = ['COMPLETED', 'UNTESTABLE'];
  phases: string[] = ['1P', '3P'];
  office_types: string[] = [];

  // Optional office block
  selectedSourceType = '';
  selectedSourceName = '';
  filteredSources: any = null;

  // Serial → device index
  private serialIndex: Record<string, {
    make?: string;
    capacity?: string;
    device_id: number;
    assignment_id: number;
    phase?: string;
  }> = {};

  // Misc / state
  currentUserId = 0;
  currentLabId = 0;
  filterText = '';
  loading = false;
  submitting = false;

  // Modal + alerts
  modal: ModalState = { open: false, title: '', message: '', action: null };
  alertSuccess: string | null = null;
  alertError: string | null = null;

  // Prepared payload for POST (for preview if needed)
  payload: any;

  constructor(private api: ApiServicesService) {}

  // ===================== Lifecycle =====================
  ngOnInit(): void {
    this.batch.header.date = this.toYMD(new Date());

    // Load enums for dropdowns — normalize to our canonical enums
    this.api.getEnums().subscribe({
      next: (data) => {
        // Device status
        this.device_status = (data?.device_status as 'ASSIGNED') ?? 'ASSIGNED';

        // Methods: accept MANUAL/AUTOMATIC or MANUAL/AUTOMATED from backend
        const rawMethods: string[] = data?.test_methods ?? ['MANUAL', 'AUTOMATIC'];
        this.test_methods = rawMethods
          .map(m => (m || '').toUpperCase())
          .map(m => (m === 'AUTOMATED' ? 'AUTOMATIC' : m))
          .filter(m => m === 'MANUAL' || m === 'AUTOMATIC') as TestMethod[];
        if (!this.test_methods.includes(this.testMethod)) {
          this.testMethod = this.test_methods[0] ?? 'AUTOMATIC';
        }

        // Statuses: normalize PENDING -> UNTESTABLE if backend ever sends PENDING
        const rawStatuses: string[] = data?.test_statuses ?? ['COMPLETED', 'UNTESTABLE'];
        this.test_statuses = rawStatuses
          .map(s => (s || '').toUpperCase())
          .map(s => (s === 'PENDING' ? 'UNTESTABLE' : s))
          .filter(s => s === 'COMPLETED' || s === 'UNTESTABLE') as TestStatus[];
        if (!this.test_statuses.includes(this.testStatus)) {
          this.testStatus = this.test_statuses[0] ?? 'COMPLETED';
        }

        // Phases
        const rawPhases: string[] = data?.phases ?? ['1P', '3P'];
        this.phases = Array.from(new Set(rawPhases.map(p => (p || '').toUpperCase()).filter(Boolean)));
        this.office_types = Array.isArray(data?.office_types) ? data.office_types : [];
      },
      error: (err) => console.error('Enums error', err)
    });

    // IDs from storage
    this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    this.currentLabId  = Number(localStorage.getItem('currentLabId') || 0);

    // Build index only (no visible rows)
    this.doReloadAssignedWithoutAddingRows();
  }

  // ===================== Derived counters =====================
  get totalCount(): number { return this.batch?.rows?.length ?? 0; }
  get matchedCount(): number { return (this.batch?.rows ?? []).filter(r => !!r.serial && !r.notFound).length; }
  get unknownCount(): number { return (this.batch?.rows ?? []).filter(r => !!r.notFound).length; }

  // ===================== Assigned devices =====================
  private rebuildSerialIndex(assignments: AssignmentItem[]): void {
    this.serialIndex = {};
    for (const a of assignments) {
      const d = a?.device ?? null;
      const serial = (d?.serial_number || '').toUpperCase().trim();
      if (!serial) continue;
      this.serialIndex[serial] = {
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
        this.loading = false;
        const assignments: AssignmentItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.results) ? data.results : [];

        // index for fast lookup by serial
        this.rebuildSerialIndex(assignments);

        // build visible rows from assignments
        this.batch.rows = assignments.map(a => {
          const d = a.device || ({} as MeterDevice);
          return {
            serial: d.serial_number || '',
            make: d.make || '',
            capacity: d.capacity || '',
            result: '',
            device_id: d.id ?? a.device_id ?? 0,
            assignment_id: a.id ?? 0,
            notFound: false,
            test_result: undefined
          } as DeviceRow;
        });

        // keep 1 empty row if nothing
        if (!this.batch.rows.length) this.addBatchRow();

        // guess consistent phase from devices
        if (!this.batch.header.phase) {
          const uniq = new Set(
            assignments
              .map(a => (a.device?.phase || '').toUpperCase())
              .filter(Boolean)
          );
          this.batch.header.phase = uniq.size === 1 ? [...uniq][0] : '';
        }
        this.loading = false;
      },
      error: (e) => {
        console.error('Assigned list error', e);
        this.batch.rows = [{
          serial: '', make: '', capacity: '', result: '',
          device_id: 0, assignment_id: 0, notFound: false, test_result: undefined
        }];
          this.loading = false;
      },
      complete: () => (this.loading = false)
    });
    this.loading = false;
  }

  private loadDataWithoutAddingRows(assignments: AssignmentItem[]): void {
    this.rebuildSerialIndex(assignments);
  }

  doReloadAssignedWithoutAddingRows(): void {
    this.loading = true;
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data: any) => {
        this.loading = false;
        const assignments: AssignmentItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.results) ? data.results : [];
        this.loadDataWithoutAddingRows(assignments);

        // Try to infer phase from assignment set if header empty
        if (!this.batch.header.phase) {
          const uniq = new Set(
            assignments
              .map(a => (a.device?.phase || '').toUpperCase())
              .filter(Boolean)
          );
          this.batch.header.phase = uniq.size === 1 ? [...uniq][0] : '';
          this.loading = false;
        }
      },
      error: (e) => {
        console.error('Assigned list error', e);
        this.loading = false;
      },
      complete: () => (this.loading = false)
    });
  }

  // ===================== Row ops + autofill =====================
  addBatchRow(): void {
    this.batch.rows.push({
      serial: '', make: '', capacity: '', result: '',
      device_id: 0, assignment_id: 0, notFound: false, test_result: undefined
    });
  }

  private doRemoveRow(index: number): void {
    this.batch.rows.splice(index, 1);
  }

  private doClearRows(): void {
    this.batch.rows = [];
    this.addBatchRow();
  }

  onSerialChanged(i: number, serial: string): void {
    const key = (serial || '').toUpperCase().trim();
    const row = this.batch.rows[i];
    const hit = this.serialIndex[key];

    if (hit) {
      row.make = hit.make || '';
      row.capacity = hit.capacity || '';
      row.device_id = hit.device_id || 0;
      row.assignment_id = hit.assignment_id || 0;
      row.notFound = false;

      // If header phase not chosen yet, try to use matched device's phase
      if (!this.batch.header.phase && hit.phase) {
        this.batch.header.phase = (hit.phase || '').toUpperCase();
      }
    } else {
      row.make = '';
      row.capacity = '';
      row.device_id = 0;
      row.assignment_id = 0;
      row.notFound = key.length > 0;
    }
  }

  displayRows(): DeviceRow[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.batch.rows;
    return this.batch.rows.filter(r =>
      (r.serial || '').toLowerCase().includes(q) ||
      (r.make || '').toLowerCase().includes(q) ||
      (r.capacity || '').toLowerCase().includes(q) ||
      (r.result || '').toLowerCase().includes(q) ||
      ((r.test_result || '').toLowerCase().includes(q))
    );
  }

  trackRow(index: number, r: DeviceRow): string {
    // stable key even if user edits serial
    return `${r.assignment_id || 0}_${r.device_id || 0}_${r.serial || ''}_${index}`;
  }

  // ===================== Office lookup =====================
  private doFetchOffice(): void {
    if (!this.selectedSourceType || !this.selectedSourceName) return;
    this.loading = true;
    this.api.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
      next: (data) => (this.filteredSources = data),
      error: (error) => console.error('Fetch source error', error),
      complete: () => (this.loading = false)
    });
  }
  onSourceTypeChange(): void {
    this.selectedSourceName = '';
    this.filteredSources = null;
  }

  // ===================== Submit =====================
  private passFailFromText(txt: string): TestResult {
    return /(^|\W)(ok|pass)(\W|$)/i.test(txt || '') ? 'PASS' : 'FAIL';
  }

  private toYMD(d: Date): string {
    const dt = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return dt.toISOString().slice(0, 10);
  }

  private isoOn(dateStr?: string): string {
    const d = dateStr ? new Date(dateStr + 'T10:00:00') : new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  }

  // Prepare payload without sending (used for preview)
  private buildPayloadForPreview(): any[] {
    if (!this.testMethod && this.test_methods.length) this.testMethod = this.test_methods[0];
    if (!this.testStatus && this.test_statuses.length) this.testStatus = this.test_statuses[0];
    const when = this.isoOn(this.batch.header.date);

    return (this.batch.rows || [])
      .filter(r => (r.serial || '').trim())
      .map(r => ({
        device_id: r.device_id ?? 0,
        assignment_id: r.assignment_id ?? 0,

        start_datetime: when,
        end_datetime: when,

        // Physical checks (defaults)
        physical_condition_of_device: '-',
        seal_status: '-',
        meter_glass_cover: '-',
        terminal_block: '-',
        meter_body: '-',

        // Notes & flags
        other: r.result || '-',
        is_burned: /burn/i.test(r.result || ''),

        // Readings (defaults)
        reading_before_test: 0,
        reading_after_test: 0,
        ref_start_reading: 0,
        ref_end_reading: 0,
        error_percentage: 0,

        // Details
        details: `Zone:${this.batch.header.zone || ''} Phase:${this.batch.header.phase || ''}`,

        // Outcome
        test_result: (r.test_result ?? this.passFailFromText(r.result)) as TestResult,
        test_method: this.testMethod,
        test_status: this.testStatus,

        // Approver (optional)
        approver_id: this.approverId ?? null
      }));
  }

  private doSubmitBatch(): void {
    // Ensure defaults exist (post-enum load)
    if (!this.testMethod && this.test_methods.length) this.testMethod = this.test_methods[0];
    if (!this.testStatus && this.test_statuses.length) this.testStatus = this.test_statuses[0];

    // Build payload (also used for preview)
    this.payload = this.buildPayloadForPreview();

    if (!this.payload.length) {
      this.alertError = 'No valid rows to submit.';
      this.alertSuccess = null;
      this.openConfirm('submit'); // show error in the same modal
      return;
    }

    this.submitting = true;
    this.alertSuccess = null;
    this.alertError = null;

    this.api.postTestReports(this.payload).subscribe({
      next: (resp) => {
        this.loading = false;
        this.submitting = false;
        this.alertSuccess = 'Batch Report submitted successfully!';
        this.alertError = null;
        // this.report_printing = this.reportType;
        // Keep modal open to show success; user can close or print
        // Optionally clear: this.doClearRows();
        // Optionally: auto-close after delay—commented for tester-driven flow
        // setTimeout(() => this.closeModal(), 1200);
      },
      error: (error) => {
        this.submitting = false;
        this.alertSuccess = null;
        this.alertError = 'Error submitting report. Please verify rows and try again.';
        console.error('Submit batch error', error);
      }
    });
  }

  // ===================== Confirm modal wiring =====================
  openConfirm(action: ModalAction, payload?: any): void {
    // Reset alerts unless it is a re-open after submit
    if (action !== 'submit') {
      this.alertSuccess = null;
      this.alertError = null;
    }

    this.modal.action = action;
    this.modal.payload = payload;

    switch (action) {
      case 'reload':
        this.modal.title = 'Reload Assigned Devices';
        this.modal.message = 'Replace the table with the latest assigned devices for this user?';
        break;
      case 'fetch':
        this.modal.title = 'Fetch Source Details';
        this.modal.message = `Fetch details for "${this.selectedSourceType}" / "${this.selectedSourceName}"?`;
        break;
      case 'removeRow':
        this.modal.title = 'Remove Row';
        this.modal.message = `Remove row #${(payload?.index ?? 0) + 1}?`;
        break;
      case 'clear':
        this.modal.title = 'Clear All Rows';
        this.modal.message = 'Clear all rows and leave one empty row?';
        break;
      case 'submit':
        // When opening preview, build the payload to reflect current selections
        this.payload = this.buildPayloadForPreview();
        this.modal.title = 'Submit Batch Report — Preview';
        this.modal.message = `Preview and confirm submission of ${this.matchedCount} matched row(s) and ${this.unknownCount} unknown row(s).`;
        break;
    }

    this.modal.open = true;
  }

  closeModal(): void {
    this.modal.open = false;
    this.modal.action = null;
    this.modal.payload = undefined;
  }

  confirmModal(): void {
    const a = this.modal.action;
    const p = this.modal.payload;
    // For submit, keep modal open to show success/error alerts after API; for others, close first
    if (a !== 'submit') this.closeModal();

    if (a === 'reload') this.doReloadAssigned();
    if (a === 'fetch') this.doFetchOffice();
    if (a === 'removeRow') this.doRemoveRow(p?.index);
    if (a === 'clear') this.doClearRows();
    if (a === 'submit') this.doSubmitBatch();
  }

  // ===================== Print =====================
  print(): void {
    window.print();
  }
}
