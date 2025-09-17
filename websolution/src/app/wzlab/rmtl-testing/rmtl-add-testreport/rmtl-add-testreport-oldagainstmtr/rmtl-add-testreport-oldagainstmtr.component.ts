// src/app/.../rmtl-add-testreport-oldagainstmtr.component.ts
import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import {
  OldAgainstMeterReportPdfService,
  OldLabInfo
} from 'src/app/shared/oldagainstmeter-report-pdf.service';

interface MeterDevice {
  id: number;
  serial_number: string;
  make?: string;
  capacity?: string;
  phase?: string;
  location_code?: string | null;
  location_name?: string | null;
}
interface AssignmentItem {
  id: number;          // assignment_id
  device_id: number;
  device?: MeterDevice | null;
  testing_bench?: { bench_name?: string } | null;
  user_assigned?: { name?: string; username?: string } | null;
  assigned_by_user?: { name?: string; username?: string } | null;
}
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

  _open?: boolean;
}
interface ModalState {
  open: boolean;
  title: string;
  message: string;
  action: 'clear' | 'submit' | null;
  payload?: any;
}

@Component({
  selector: 'app-rmtl-add-testreport-oldagainstmtr',
  templateUrl: './rmtl-add-testreport-oldagainstmtr.component.html',
  styleUrls: ['./rmtl-add-testreport-oldagainstmtr.component.css']
})
export class RmtlAddTestreportOldagainstmtrComponent implements OnInit {

  // Enums / options
  device_status: 'ASSIGNED' = 'ASSIGNED';
  comment_bytester: string[] = [];
  test_methods: string[] = [];
  test_statuses: string[] = [];
  physical_conditions: string[] = [];
  seal_statuses: string[] = [];
  glass_covers: string[] = [];
  terminal_blocks: string[] = [];
  meter_bodies: string[] = [];
  makes: string[] = [];
  capacities: string[] = [];
  test_results: string[] = [];
  report_type: string = 'AGAINST OLD METER';

  // Header + rows
  batch = {
    header: {
      zone: '',
      phase: '',
      date: '',
      location_code: '',
      location_name: '',
      testing_bench: '',
      testing_user: '',
      approving_user: '',
    },
    rows: [] as DeviceRow[]
  };

  // IDs / context
  currentUserId = 0;
  currentLabId = 0;
  device_testing_purpose: any | null = null;
  device_type: any | null = null;

  // UI state
  filterText = '';
  loading = false;
  submitting = false;
  modal: ModalState = { open: false, title: '', message: '', action: null };
  alertSuccess: string | null = null;
  alertError: string | null = null;

  payload: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;
  approverId: number | null = null; // kept for API payload compatibility

  // Serial index
  private serialIndex: Record<string, {
    make?: string;
    capacity?: string;
    device_id: number;
    assignment_id: number;
    phase?: string;
  }> = {};

  // Lab info + benches
  labInfo: OldLabInfo | null = null;
  benches: string[] = [];

  // Picker state
  picking = false;
  pickerLoading = false;
  pickerAssignments: AssignmentItem[] = [];
  pickerSelected: Record<number, boolean> = {};
  pickerFilter = '';

  constructor(
    private api: ApiServicesService,
    private pdfSvc: OldAgainstMeterReportPdfService
  ) {}

  // ===================== Lifecycle =====================
  ngOnInit(): void {
    this.batch.header.date = this.toYMD(new Date());

    // IDs from storage
    this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    this.currentLabId  = Number(localStorage.getItem('currentLabId') || 0);

    // Enums
    this.api.getEnums().subscribe({
      next: (data) => {
        this.device_status = (data?.device_status as 'ASSIGNED') ?? 'ASSIGNED';
        this.comment_bytester = data?.commentby_testers || [];
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
        this.report_type = data?.test_report_types?.AGAINST_OLD_METER ?? 'AGAINST_OLD_METER';
        this.device_testing_purpose = data?.device_testing_purpose?.AGAINST_OLD_METER  ?? 'AGAINST_OLD_METER';
        this.device_type = data?.device_types?.METER ?? 'METER';

        if (!this.batch.rows.length) this.addBatchRow();

        // assigned cache (guarded)Missing Device Type/Testing Purpose. Please reload configuration.
        this.doReloadAssignedWithoutAddingRows();
      },
      error: () => this.alertError = 'Failed to load configuration (enums). Please reload.'
    });

    // Lab info (for PDF/header)
    if (this.currentLabId) {
      this.api.getLabInfo(this.currentLabId).subscribe({
        next: (info: any) => {
          this.labInfo = {
            lab_name: info?.lab_pdfheader_name || info?.lab_name,
            address_line: info?.address || info?.address_line,
            email: info?.email,
            phone: info?.phone
          };
          this.benches = Array.isArray(info?.benches) ? info.benches : [];
        }
      });
    }
  }

  // ===================== Guards & Validation =====================
  private validateContextForAssignments(): { ok: boolean; reason?: string } {
    if (!this.currentUserId || !this.currentLabId) {
      return { ok: false, reason: 'Missing User/Lab context. Ensure you are logged in and a lab is selected.' };
    }
    if (!this.device_type || !this.device_testing_purpose) {
      return { ok: false, reason: 'Missing Device Type/Testing Purpose. Please reload configuration.' };
    }
    return { ok: true };
  }

  private validateBeforeSubmit(): { ok: boolean; reason?: string } {
    const ctx = this.validateContextForAssignments();
    if (!ctx.ok) return ctx;

    if (!this.batch.header.location_code || !this.batch.header.location_name) {
      return { ok: false, reason: 'Zone/DC data not available. Load assignments first.' };
    }
    if (!this.batch.header.date) return { ok: false, reason: 'Testing Date is required.' };
    if (!this.testMethod) return { ok: false, reason: 'Select a Test Method.' };
    if (!this.testStatus) return { ok: false, reason: 'Select a Test Status.' };

    const clean = (this.batch.rows || []).filter(r => (r.serial || '').trim());
    if (!clean.length) return { ok: false, reason: 'Enter at least one serial number.' };

    for (let i = 0; i < clean.length; i++) {
      const r = clean[i];
      if (r.notFound) return { ok: false, reason: `Row #${i + 1}: Serial not in assigned list.` };
      if (!r.assignment_id || !r.device_id) return { ok: false, reason: `Row #${i + 1}: Missing assignment/device mapping.` };
      if (!r.test_result) return { ok: false, reason: `Row #${i + 1}: Choose Test Result.` };
    }
    return { ok: true };
  }

  // ===================== Derived counts =====================
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

  private loadHeaderFromAssignments(assignments: AssignmentItem[]) {
    const first = assignments.find(a => a.device);
    if (first) {
      this.batch.header.location_code = first.device?.location_code ?? '';
      this.batch.header.location_name = first.device?.location_name ?? '';
      this.batch.header.testing_bench = first.testing_bench?.bench_name ?? '';
      this.batch.header.testing_user =
        first.user_assigned?.name || first.user_assigned?.username || this.batch.header.testing_user || (localStorage.getItem('currentUserName') || '');
      this.batch.header.approving_user =
        first.assigned_by_user?.name || first.assigned_by_user?.username || this.batch.header.approving_user || '-';
    }

    if (!this.batch.header.phase) {
      const uniq = new Set(assignments.map(a => (a.device?.phase || '').toUpperCase()).filter(Boolean));
      this.batch.header.phase = uniq.size === 1 ? [...uniq][0] : this.batch.header.phase || '';
    }
  }

  private loadDataWithoutAddingRows(assignments: AssignmentItem[]): void {
    this.rebuildSerialIndex(assignments);
    this.loadHeaderFromAssignments(assignments);
  }

  doReloadAssignedWithoutAddingRows(): void {
    const v = this.validateContextForAssignments();
    if (!v.ok) { this.alertError = v.reason || 'Context invalid.'; return; }

    this.loading = true;
    this.api.getAssignedMeterList(
      this.device_status, this.currentUserId, this.currentLabId,
      this.device_testing_purpose, this.device_type
    ).subscribe({
      next: (data: any) => {
        const assignments: AssignmentItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.results) ? data.results : [];
        this.loadDataWithoutAddingRows(assignments);
        this.loading = false;
        this.alertSuccess = `Assigned devices loaded (${assignments.length}).`;
      },
      error: () => { this.loading = false; this.alertError = 'Assigned list load failed.'; }
    });
  }

  // ===================== Picker (search + sort) =====================
  openPicker(): void {
    const v = this.validateContextForAssignments();
    if (!v.ok) { this.alertError = v.reason || 'Context invalid.'; return; }

    this.picking = true;
    this.pickerLoading = true;
    this.pickerAssignments = [];
    this.pickerSelected = {};
    this.pickerFilter = '';

    this.api.getAssignedMeterList(
      this.device_status, this.currentUserId, this.currentLabId,
      this.device_testing_purpose, this.device_type
    ).subscribe({
      next: (data: any) => {
        const list: AssignmentItem[] = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
        this.pickerAssignments = list;
        this.pickerLoading = false;

        this.loadHeaderFromAssignments(list);
        this.rebuildSerialIndex(list);
      },
      error: () => { this.pickerLoading = false; this.alertError = 'Could not load assigned devices.'; }
    });
  }
  closePicker(): void { this.picking = false; }

  get pickerFiltered(): AssignmentItem[] {
    const q = (this.pickerFilter || '').trim().toLowerCase();
    const base = (this.pickerAssignments || []).filter(a => {
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

  get allPicked(): boolean {
    const list = this.pickerFiltered;
    return list.length > 0 && list.every(a => !!this.pickerSelected[a.id]);
  }
  togglePickAll(checked: boolean): void {
    this.pickerFiltered.forEach(a => this.pickerSelected[a.id] = checked);
  }
  trackAssignment(_: number, a: AssignmentItem) { return a.id; }

  addPickedToRows(): void {
    const chosen = this.pickerFiltered.filter(a => this.pickerSelected[a.id]);
    const existingSerials = new Set(this.batch.rows.map(r => (r.serial || '').toUpperCase().trim()));

    let added = 0;
    chosen.forEach((a) => {
      const d = a.device || ({} as MeterDevice);
      const serial = (d.serial_number || '').trim();
      if (!serial || existingSerials.has(serial.toUpperCase())) return;

      this.batch.rows.push(this.emptyRow({
        serial,
        make: d.make || '',
        capacity: d.capacity || '',
        device_id: d.id ?? a.device_id ?? 0,
        assignment_id: a.id ?? 0,
        notFound: false
      }));
      existingSerials.add(serial.toUpperCase());
      added++;
    });

    if (!this.batch.rows.length) this.addBatchRow();
    this.closePicker();

    this.alertSuccess = added ? `${added} device(s) added to the batch.` : 'No new devices were added (duplicates or none selected).';
  }

  // ===================== Row ops + autofill =====================
  private emptyRow(seed?: Partial<DeviceRow>): DeviceRow {
    return {
      serial: '',
      make: '',
      capacity: '',
      remark: '',
      test_result: undefined,
      test_method: 'MANUAL',
      device_id: 0,
      assignment_id: 0,
      notFound: false,

      physical_condition_of_device: '',
      seal_status: '',
      meter_glass_cover: '',
      terminal_block: '',
      meter_body: '',
      other: '',
      is_burned: false,

      reading_before_test: 0,
      reading_after_test: 0,
      ref_start_reading: 0,
      ref_end_reading: 0,
      error_percentage: 0,

      _open: false,
      ...seed
    };
  }

  addBatchRow(): void { this.batch.rows.push(this.emptyRow()); }

  removeRow(index: number): void {
    this.batch.rows.splice(index, 1);
    if (!this.batch.rows.length) this.addBatchRow();
  }

  doClearRows(): void { this.batch.rows = [this.emptyRow()]; }

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
      (r.remark || '').toLowerCase().includes(q) ||
      ((r.test_result || '').toString().toLowerCase().includes(q))
    );
  }

  trackRow(index: number, r: DeviceRow): string {
    return `${r.assignment_id || 0}_${r.device_id || 0}_${r.serial || ''}_${index}`;
  }

  // ===================== Submit helpers =====================
  errorpercentage_calculate(i: number) {
    const row = this.batch.rows[i];
    const rb = Number(row.reading_before_test) || 0;
    const ra = Number(row.reading_after_test) || 0;
    const rs = Number(row.ref_start_reading) || 0;
    const re = Number(row.ref_end_reading) || 0;
    const refDiff = re - rs;
    row.error_percentage = refDiff
      ? Math.round((((ra - rb) - refDiff) / refDiff) * 100)
      : 0;
    return 0;
  }

  private toYMD(d: Date): string {
    const dt = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return dt.toISOString().slice(0, 10);
  }
  private isoOn(dateStr?: string): string {
    const d = dateStr ? new Date(dateStr + 'T10:00:00') : new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  }

  private buildPayloadForPreview(): any[] {
    const when = this.isoOn(this.batch.header.date);

    return (this.batch.rows || [])
      .filter(r => (r.serial || '').trim())
      .map(r => ({
        device_id: r.device_id ?? 0,
        assignment_id: r.assignment_id ?? 0,
        start_datetime: when,
        end_datetime: when,

        physical_condition_of_device: r.physical_condition_of_device || '-',
        seal_status: r.seal_status || '-',
        meter_glass_cover: r.meter_glass_cover || '-',
        terminal_block: r.terminal_block || '-',
        meter_body: r.meter_body || '-',
        other: r.other || '-',  // keep hyphen fallback
        is_burned: !!r.is_burned,

        reading_before_test: Number(r.reading_before_test) || 0,
        reading_after_test: Number(r.reading_after_test) || 0,
        ref_start_reading: Number(r.ref_start_reading) || 0,
        ref_end_reading: Number(r.ref_end_reading) || 0,
        error_percentage: Number(r.error_percentage) || 0,

        details: r.remark || null,
        test_result: (r.test_result as string) || null,
        test_method: this.testMethod,
        test_status: this.testStatus,
        approver_id: this.approverId ?? null,
        report_type: this.report_type ?? null
      }));
  }

  private buildPrintableSnapshot(): {
    rows: Array<{serial:string;make:string;capacity:string;remark:string;test_result:string}>, meta: any
  } {
    const rows = (this.batch.rows || [])
      .filter(r => (r.serial || '').trim())
      .map(r => ({
        serial: r.serial?.trim() || '-',
        make: r.make || '',
        capacity: r.capacity || '',
        remark: r.remark || r.other || '',
        test_result: r.test_result || ''
      }));

    const meta = {
      zone: (this.batch.header.location_code ? this.batch.header.location_code + ' - ' : '') + (this.batch.header.location_name || '') || '',
      phase: this.batch.header.phase || '',
      date: this.batch.header.date || this.toYMD(new Date()),
      testMethod: this.testMethod || '-',
      testStatus: this.testStatus || '-',
      testing_bench: this.batch.header.testing_bench || '-',
      testing_user: this.batch.header.testing_user || (localStorage.getItem('currentUserName') || '').toString(),
      approving_user: this.batch.header.approving_user || '-',
      lab: this.labInfo || undefined
    };

    return { rows, meta };
  }

  private async downloadPdfFromBatch(): Promise<void> {
    const snap = this.buildPrintableSnapshot();
    await this.pdfSvc.download(snap.rows, snap.meta, {
      leftLogoUrl: '/assets/icons/wzlogo.png',
      rightLogoUrl: '/assets/icons/wzlogo.png'
    });
  }

  // ===================== Confirm modal (submit / clear only) =====================
  openConfirm(action: ModalState['action']): void {
    if (action !== 'submit') { this.alertSuccess = null; this.alertError = null; }

    if (action === 'submit') {
      const v = this.validateBeforeSubmit();
      if (!v.ok) {
        this.alertError = v.reason || 'Validation failed.';
        this.modal = { open: true, title: 'Validation Errors', message: v.reason || '', action: null };
        return;
      }
    }

    switch (action) {
      case 'clear':
        this.modal = { open: true, title: 'Clear All Rows', message: 'Clear all rows and leave one empty row?', action: 'clear' };
        break;
      case 'submit':
        this.payload = this.buildPayloadForPreview();
        this.modal = { open: true, title: 'Submit Batch Report — Preview', message: '', action: 'submit' };
        break;
      default:
        this.modal = { open: false, title: '', message: '', action: null };
    }
  }

  closeModal(): void {
    this.modal.open = false;
    this.modal.action = null;
  }

  confirmModal(): void {
    const a = this.modal.action;
    if (a !== 'submit') this.closeModal();
    if (a === 'clear') this.doClearRows();
    if (a === 'submit') this.doSubmitBatch();
  }

  // ===================== Submit (API + PDF) =====================
  private doSubmitBatch(): void {
    const v = this.validateBeforeSubmit();
    if (!v.ok) { this.alertError = v.reason || 'Validation failed.'; this.alertSuccess = null; return; }

    this.payload = this.buildPayloadForPreview();

    const missing = this.payload.findIndex(p => !p.test_result);
    if (missing !== -1) {
      this.alertError = `Row #${missing + 1} is missing Test Result (PASS/FAIL).`;
      this.alertSuccess = null;
      return;
    }

    this.submitting = true;
    this.alertSuccess = null;
    this.alertError = null;

    this.api.postTestReports(this.payload).subscribe({
      next: async () => {
        this.submitting = false;
        try {
          await this.downloadPdfFromBatch();
          this.alertSuccess = 'Batch Report submitted and PDF downloaded successfully!';
        } catch (e) {
          console.error('PDF generation failed:', e);
          this.alertSuccess = 'Batch Report submitted successfully!';
          this.alertError = 'PDF generation failed.';
        }
        this.batch.rows = [this.emptyRow()];
        setTimeout(() => this.closeModal(), 1000);
      },
      error: () => {
        this.submitting = false;
        this.alertSuccess = null;
        this.alertError = 'Error submitting report. Please verify rows and try again.';
      }
    });
  }
}
