import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

type ReportUnion =
  | 'stopdefective'
  | 'contested'
  | 'P4_ONM'
  | 'P4_vig'
  | 'Solar netmeter'
  | 'Solar Generation Meter'
  | 'CT Testing';

interface MeterDevice {
  id: number;
  serial_number: string;
  make?: string;
  capacity?: string;
  phase?: string;
}

interface AssignmentItem {
  id: number;              // assignment_id
  device_id: number;
  device?: MeterDevice | null;
}

interface DeviceRow {
  serial: string;
  make: string;
  capacity: string;
  result: string;
  device_id: number;
  assignment_id: number;
  notFound?: boolean;
}

export interface TestReportPayload {
  id: number;
  device_id: number;
  assignment_id: number;
  start_datetime: string;
  end_datetime: string;
  physical_condition_of_device: string;
  seal_status: string;
  meter_glass_cover: string;
  terminal_block: string;
  meter_body: string;
  other: string;
  is_burned: boolean;
  reading_before_test: number;
  reading_after_test: number;
  details: string;
  test_result: 'PASS' | 'FAIL';
  test_method: 'MANUAL' | 'AUTOMATED';
  ref_start_reading: number;
  ref_end_reading: number;
  test_status: 'COMPLETED' | 'PENDING';
  error_percentage: number;
  approver_id: number;
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
  selector: 'app-rmtl-add-testreport',
  templateUrl: './rmtl-add-testreport.component.html',
  styleUrls: ['./rmtl-add-testreport.component.css']
})
export class RmtlAddTestreportComponent implements OnInit {
  // Report tabs
  reportType: ReportUnion = 'stopdefective';
  reportTypes: ReportUnion[] = [
    'stopdefective','contested','P4_ONM','P4_vig','Solar netmeter','Solar Generation Meter','CT Testing'
  ];

  // Common payload controls
  testMethod: 'MANUAL' | 'AUTOMATED' = 'AUTOMATED';
  testStatus: 'COMPLETED' | 'PENDING' = 'COMPLETED';
  comment_bytester:any=['Stop Defective', 'Display Off', 'Ok Found','Phase Mismatch']; ;
  testresults: 'PASS' | 'FAIL' = 'PASS';
  approverId = 0;

  // Header + rows
  batch = {
    header: { zone: '', phase: '', date: '' },
    rows: [] as DeviceRow[]
  };

  // Enums
  device_status = 'ASSIGNED';
  test_methods: string[] = [];
  test_statuses: string[] = [];
  phases: string[] = [];            // use '1P', '3P' to match backend
  office_types: string[] = [];

  // Optional office block
  selectedSourceType = '';
  selectedSourceName = '';
  filteredSources: any = null;

  // Index for autofill (by serial)
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

  // Reusable confirm modal
  modal: ModalState = { open: false, title: '', message: '', action: null };

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    this.batch.header.date = this.toYMD(new Date());

    // enums
    this.api.getEnums().subscribe({
      next: (data) => {
        this.device_status = data?.device_status ?? 'ASSIGNED';
        this.test_methods  = data?.test_methods ?? ['MANUAL', 'AUTOMATED'];
        this.test_statuses = data?.test_statuses ?? ['COMPLETED', 'PENDING'];
        this.phases        = data?.phases ?? ['1P', '3P'];
        this.office_types  = data?.office_types ?? [];
      },
      error: (err) => console.error('Enums error', err)
    });

    // ids from storage
    this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    this.currentLabId  = Number(localStorage.getItem('currentLabId') || 0);

    // initial load
    // this.doReloadAssigned();
  }

  // ------- Counters for header badges -------
  get totalCount(): number { return this.batch?.rows?.length ?? 0; }
  get matchedCount(): number { return (this.batch?.rows ?? []).filter(r => !!r.serial && !r.notFound).length; }
  get unknownCount(): number { return (this.batch?.rows ?? []).filter(r => !!r.notFound).length; }

  // ------- Load assignments (NEW mapping) -------
  private rebuildSerialIndex(assignments: AssignmentItem[]): void {
    this.serialIndex = {};
    for (const a of assignments) {
      const d = a?.device;
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
    // API still called the same way; the response is now an array of assignments.
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data: any) => {
        const assignments: AssignmentItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : [];

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
            notFound: false
          };
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
      },
      error: (e) => {
        console.error('Assigned list error', e);
        this.batch.rows = [{
          serial: '', make: '', capacity: '', result: '', device_id: 0, assignment_id: 0, notFound: false
        }];
      },
      complete: () => (this.loading = false)
    });
  }

  // ------- Row ops + autofill -------
  addBatchRow(): void {
    this.batch.rows.push({
      serial: '', make: '', capacity: '', result: '', device_id: 0, assignment_id: 0, notFound: false
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
        this.batch.header.phase = hit.phase.toUpperCase();
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
      (r.result || '').toLowerCase().includes(q)
    );
  }

  trackRow(index: number, r: DeviceRow): string {
    return `${r.assignment_id || 0}_${r.device_id || 0}_${r.serial || ''}_${index}`;
    // stable key even if user edits serial
  }

  // ------- Office lookup -------
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

  // ------- Submit -------
  private passFailFromText(txt: string): 'PASS' | 'FAIL' {
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

  private doSubmitBatch(): void {
    // Ensure dropdowns are not empty
    if (!this.testMethod && this.test_methods.length) this.testMethod = this.test_methods[0] as any;
    if (!this.testStatus && this.test_statuses.length) this.testStatus = this.test_statuses[0] as any;

    const when = this.isoOn(this.batch.header.date);

    const payload: TestReportPayload[] = this.batch.rows
      .filter(r => (r.serial || '').trim())
      .map(r => ({
        id: 0,
        device_id: r.device_id ?? 0,
        assignment_id: r.assignment_id ?? 0,   // <-- IMPORTANT: from assignment row, not userId
        start_datetime: when,
        end_datetime: when,
        physical_condition_of_device: '-',
        seal_status: '-',
        meter_glass_cover: '-',
        terminal_block: '-',
        meter_body: '-',
        other: r.result || '-',
        is_burned: /burn/i.test(r.result || ''),
        reading_before_test: 0,
        reading_after_test: 0,
        details: `Zone:${this.batch.header.zone || ''} Phase:${this.batch.header.phase || ''}`,
        test_result: this.passFailFromText(r.result),
        test_method: this.testMethod,
        ref_start_reading: 0,
        ref_end_reading: 0,
        test_status: this.testStatus,
        error_percentage: 0,
        approver_id: this.approverId
      }));

    this.submitting = true;
    this.api.postTestReports(payload).subscribe({
      next: () => alert('Batch test reports submitted'),
      error: (e) => { console.error(e); alert('Failed to submit batch test reports'); },
      complete: () => (this.submitting = false)
    });
  }

  // ------- Confirm modal wiring -------
  openConfirm(action: ModalAction, payload?: any): void {
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
        this.modal.title = 'Submit Batch Report';
        this.modal.message = `Submit ${this.matchedCount} matched row(s) and ${this.unknownCount} unknown row(s)?`;
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
    this.closeModal();

    if (a === 'reload') this.doReloadAssigned();
    if (a === 'fetch') this.doFetchOffice();
    if (a === 'removeRow') this.doRemoveRow(p?.index);
    if (a === 'clear') this.doClearRows();
    if (a === 'submit') this.doSubmitBatch();
  }
  

  // ------- Print -------
  print(): void { window.print(); }
}
