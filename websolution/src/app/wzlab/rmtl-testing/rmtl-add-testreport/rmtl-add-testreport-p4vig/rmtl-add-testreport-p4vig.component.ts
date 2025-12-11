import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { P4VigReportPdfService, VigHeader, VigRow } from 'src/app/shared/p4vig-report-pdf.service';

type ViewMode = 'SHUNT' | 'NUTRAL' | 'BOTH' | '';
type ErrorFromMode = 'SHUNT' | 'NUTRAL' | '';

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
  id: number;
  device_id: number;
  device?: MeterDevice | null;
  testing_bench?: { bench_name?: string } | null;
  bench_name?: string;
  user_assigned?: { username?: string; name?: string } | null;
  assigned_by_user?: { username?: string; name?: string } | null;
  username?: string;
}

interface Row {
  // identity
  serial: string;
  make: string;
  capacity: string;
  notFound?: boolean;
  removal_reading?: number;
  test_result?: string;

  // quick remark list + free text
  remark?: string;
  final_remarks?: string;  

  // consumer/zone slip
  consumer_name?: string;
  address?: string;
  account_number?: string;
  division_zone?: string;
  panchanama_no?: string;
  panchanama_date?: string;
  condition_at_removal?: string;
  test_requester_name?: string;

  // testing meta
  testing_date?: string;

  // physical condition set
  physical_condition_of_device?: string | null;
  is_burned: boolean;
  seal_status: string;
  meter_glass_cover: string;
  terminal_block: string;
  meter_body: string;
  other: string;

  // SHUNT set
  shunt_reading_before_test?: number | null;
  shunt_reading_after_test?: number | null;
  shunt_ref_start_reading?: number | null;
  shunt_ref_end_reading?: number | null;
  shunt_current_test?: string | null;
  shunt_creep_test?: string | null;
  shunt_dail_test?: string | null;
  shunt_error_percentage?: number | null;

  // NUTRAL set
  nutral_reading_before_test?: number | null;
  nutral_reading_after_test?: number | null;
  nutral_ref_start_reading?: number | null;
  nutral_ref_end_reading?: number | null;
  nutral_current_test?: string | null;
  nutral_creep_test?: string | null;
  nutral_dail_test?: string | null;
  nutral_error_percentage?: number | null;

  // Combined import error
  error_from_mode: ErrorFromMode;
  error_percentage_import?: number | null;

  // mapping ids
  assignment_id?: number;
  device_id?: number;

  // UI
  view_mode?: ViewMode;
  _open?: boolean;
}

type ModalAction = 'submit' | null;
interface ModalState {
  open: boolean;
  title: string;
  message?: string;
  action: ModalAction;
  payload?: any;
}

@Component({
  selector: 'app-rmtl-add-testreport-p4vig',
  templateUrl: './rmtl-add-testreport-p4vig.component.html',
  styleUrls: ['./rmtl-add-testreport-p4vig.component.css']
})
export class RmtlAddTestreportP4vigComponent implements OnInit {

  // ===== batch header =====
  header: {
    location_code: string;
    location_name: string;
    testing_bench: string;
    testing_user: string;
    phase?: string;
    approving_user?: string;
  } = {
    location_code: '',
    location_name: '',
    testing_bench: '',
    testing_user: '',
    phase: '',
    approving_user: ''
  };

  // methods/status
  test_methods: any[] = [];
  test_statuses: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;

  // enums
  physical_conditions: any[] = [];
  seal_statuses: any[] = [];
  glass_covers: any[] = [];
  terminal_blocks: any[] = [];
  meter_bodies: any[] = [];
  testResults: any;
  commentby_testers: any;

  // testing type & badges
  ternal_testing_types: ('SHUNT' | 'NUTRAL' | 'BOTH')[] = ['SHUNT', 'NUTRAL', 'BOTH'];
  test_dail_current_cheaps: any[] = [];

  // assignment / lab
  device_status: 'ASSIGNED' = 'ASSIGNED';
  currentUserId: any;
  currentLabId: any;
  private serialIndex: Record<string, {
    make?: string;
    capacity?: string;
    device_id: number;
    assignment_id: number;
    phase?: string;
  }> = {};
  loading = false;

  labInfo: {
    lab_name?: string;
    address?: string;
    email?: string;
    phone?: string;
    logo_left_url?: string;
    logo_right_url?: string;
  } | null = null;

  // table
  filterText = '';
  rows: Row[] = [this.emptyRow()];

  // source
  office_types: any;
  selectedSourceType: any;
  selectedSourceName: string = '';
  filteredSources: any;

  // submit + modal state
  submitting = false;
  modal: ModalState = { open: false, title: '', action: null };
  alertSuccess: string | null = null;
  alertError: string | null = null;

  // alert modal
  alert = {
    open: false,
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
    autoCloseMs: 0 as number | 0,
    _t: 0 as any
  };

  // device picker modal
  devicePicker = {
    open: false,
    items: [] as AssignmentItem[],
    selected: new Set<number>(),
    loading: false,
    selectAll: false,
    search: '' as string
  };

  report_type: any;
  device_testing_purpose: any;
  device_type: any;

  // page-level message
  pageMessage: { type: 'success' | 'error' | 'warning' | 'info'; text: string } | null = null;
  fees_mtr_cts: any;
  testing_requester_name: string = '';
  divisions_lists: any;

  constructor(
    private api: ApiServicesService,
    private pdfSvc: P4VigReportPdfService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getuseridfromtoken();
    this.currentLabId = this.authService.getlabidfromtoken();

    // set fallback testing_user from token just for initial UI display,
    // but we'll overwrite with assignment data once we fetch it
    this.header.testing_user = this.authService.getUserNameFromToken() || '';

    this.api.getEnums().subscribe({
      next: (d) => {
        this.test_methods = d?.test_methods || [];
        this.test_statuses = d?.test_statuses || [];
        this.physical_conditions = d?.physical_conditions || [];
        this.seal_statuses = d?.seal_statuses || [];
        this.glass_covers = d?.glass_covers || [];
        this.terminal_blocks = d?.terminal_blocks || [];
        this.meter_bodies = d?.meter_bodies || [];
        this.office_types = d?.office_types || [];
        this.testResults = d?.test_results || [];
        this.commentby_testers = d?.commentby_testers || [];
        this.ternal_testing_types = d?.ternal_testing_types || this.ternal_testing_types;
        this.test_dail_current_cheaps = d?.test_dail_current_cheaps || [];
        this.fees_mtr_cts = d?.fees_mtr_cts || [];

        this.report_type = d?.test_report_types?.VIGILENCE_CHECKING || 'VIGILENCE_CHECKING';
        this.device_testing_purpose = d?.test_report_types?.VIGILENCE_CHECKING || 'VIGILENCE_CHECKING';
        this.device_type = d?.device_types?.METER || 'METER';

        this.loadAssignedIndexOnly();
      }
    });

    // lab info for header / pdf footer
    this.api.getLabInfo(this.currentLabId || 0).subscribe({
      next: (info: any) => {
        this.labInfo = {
            lab_name: info?.lab_pdfheader_name || info?.lab_name,
            address: info?.lab_pdfheader_address || info?.lab_location,
            email: info?.lab_pdfheader_email || info?.lab_pdfheader_contact_no,
            phone: info?.lab_pdfheader_contact_no || info?.lab_location,
          logo_left_url: info?.logo_left_url,
          logo_right_url: info?.logo_right_url
        };
      },
      error: (e) => {
        this.setPageMessage('warning', 'Could not fetch lab info.');
        console.error('Labinfo load error', e);
      }
    });
    
    this.api.getDivisions().subscribe({
      next: (d) => {
        this.divisions_lists = d;
      }
    });

  }

  // ---------- source fetch ----------
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
  get matchedCount() {
    return (this.rows ?? []).filter(r => !!r.serial && !r.notFound).length;
  }
  get unknownCount() {
    return (this.rows ?? []).filter(r => !!r.notFound).length;
  }

  // ===== helpers =====
  private emptyRow(seed?: Partial<Row>): Row {
    return {
      serial: '',
      make: '',
      capacity: '',
      is_burned: false,
      seal_status: '',
      meter_glass_cover: '',
      terminal_block: '',
      meter_body: '',
      other: '',
      view_mode: 'BOTH',
      error_from_mode: '',
      error_percentage_import: null,
      shunt_reading_before_test: null,
      shunt_reading_after_test: null,
      shunt_ref_start_reading: null,
      shunt_ref_end_reading: null,
      shunt_current_test: null,
      shunt_creep_test: null,
      shunt_dail_test: null,
      shunt_error_percentage: null,
      nutral_reading_before_test: null,
      nutral_reading_after_test: null,
      nutral_ref_start_reading: null,
      nutral_ref_end_reading: null,
      nutral_current_test: null,
      nutral_creep_test: null,
      nutral_dail_test: null,
      nutral_error_percentage: null,
      _open: false,
      ...seed
    } as Row;
  }

  addRow() {
    this.rows.push(this.emptyRow({ _open: true }));
  }

  removeRow(i: number) {
    if (i < 0 || i >= this.rows.length) return;
    this.rows.splice(i, 1);
    if (!this.rows.length) this.addRow();
  }

  trackByRow(i: number, r: Row) {
    return `${r.assignment_id || 0}_${r.device_id || 0}_${r.serial || ''}_${i}`;
  }

  displayRows(): Row[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter(r =>
      (r.serial || '').toLowerCase().includes(q) ||
      (r.make || '').toLowerCase().includes(q) ||
      (r.capacity || '').toLowerCase().includes(q) ||
      (r.consumer_name || '').toLowerCase().includes(q)
    );
  }

  // ===== assigned index only =====
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
        phase: d?.phase || ''
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

    // Only backfill defaults if still empty. Do NOT overwrite values that
    // we may have filled from assignment data already.
    if (!this.header.testing_user) {
      this.header.testing_user =
        this.authService.getUserNameFromToken() ||
        this.header.testing_user ||
        '-';
    }
    if (!this.header.testing_bench) {
      this.header.testing_bench = this.header.testing_bench || '-';
    }
    if (!this.header.approving_user) {
      this.header.approving_user = this.header.approving_user || '-';
    }
    if (!this.header.phase) {
      this.header.phase = this.header.phase || '';
    }

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
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];

        asg.sort((a, b) => (a.device?.make || '').localeCompare(b.device?.make || ''));
        this.rebuildSerialIndex(asg);

        const first = asg.find(a => a.device);
        if (first?.device) {
          // Zone / DC
          this.header.location_code = first.device.location_code ?? this.header.location_code ?? '';
          this.header.location_name = first.device.location_name ?? this.header.location_name ?? '';

          // Bench name
          this.header.testing_bench = first.testing_bench?.bench_name || '-';

          // Testing user (prefer full name, then username)
          this.header.testing_user =
            first.user_assigned?.name ||
            first.user_assigned?.username ||
            '-';

          // Approving user (prefer full name, then username)
          this.header.approving_user =
            first.assigned_by_user?.name ||
            first.assigned_by_user?.username ||
            '-';
       
          // Phase (if device has it)
          if (first.device.phase) {
            this.header.phase = (first.device.phase || '').toUpperCase();
          }
             this.testing_requester_name =this.header.location_code + ' - ' + this.header.location_name || '';

        }

        this.loading = false;
        this.setPageMessage(
          'success',
          `Total ${asg.length} Assigned devices found for P4 VIG checking.`
        );
      },
      error: (err) => {
        this.loading = false;
        console.error('Assigned load failed', err);
        this.setPageMessage('error', 'No Assigned devices found for P4 VIG checking.');
      }
    });
  }

  // ===== device picker =====
  openDevicePicker() {
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
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];

        asg.sort((a, b) => (a.device?.make || '').localeCompare(b.device?.make || ''));
        this.devicePicker.items = asg;

        const first = asg.find(a => a.device);
        if (first?.device) {
          // Zone / DC
          this.header.location_code = first.device.location_code || this.header.location_code || '';
          this.header.location_name = first.device.location_name || this.header.location_name || '';

          // Bench name
          this.header.testing_bench = first.testing_bench?.bench_name || '-';

          // Testing user (prefer full name, then username)
          this.header.testing_user =
            first.user_assigned?.name ||
            first.user_assigned?.username ||
            '-';

          // Approving user (prefer full name, then username)
          this.header.approving_user =
            first.assigned_by_user?.name ||
            first.assigned_by_user?.username ||
            '-';

          // Phase
          if (first.device.phase) {
            this.header.phase = (first.device.phase || '').toUpperCase();
          }
        }

        this.devicePicker.open = true;
        this.devicePicker.loading = false;
        this.clearPageMessage();
      },
      error: (err) => {
        this.devicePicker.loading = false;
        console.error('Picker load failed', err);
        this.setPageMessage('error', 'Could not fetch assigned meters.');
      }
    });
  }

  devicePickerDisplayItems(): AssignmentItem[] {
    const q = (this.devicePicker.search || '').trim().toLowerCase();
    const filtered = !q
      ? this.devicePicker.items
      : this.devicePicker.items.filter(a =>
          (a.device?.serial_number || '').toLowerCase().includes(q)
        );
    return filtered;
  }

  toggleSelectAll() {
    this.devicePicker.selectAll = !this.devicePicker.selectAll;
    this.devicePicker.selected.clear();
    if (this.devicePicker.selectAll) {
      for (const a of this.devicePicker.items) this.devicePicker.selected.add(a.id);
    }
  }

  toggleSelectOne(id: number) {
    if (this.devicePicker.selected.has(id)) this.devicePicker.selected.delete(id);
    else this.devicePicker.selected.add(id);
  }

  closeDevicePicker() {
    this.devicePicker.open = false;
  }

  addSelectedDevices() {
    const chosen = new Set(this.devicePicker.selected);
    if (!chosen.size) {
      this.closeDevicePicker();
      return;
    }

    const existingSerials = new Set(
      this.rows.map(r => (r.serial || '').toUpperCase().trim())
    );

    for (const a of this.devicePicker.items) {
      if (!chosen.has(a.id)) continue;
      const d = a.device || ({} as MeterDevice);
      const serial = (d.serial_number || '').toUpperCase().trim();
      if (!serial || existingSerials.has(serial)) continue;

      this.rows.push(
        this.emptyRow({
          serial: d.serial_number || '',
          make: d.make || '',
          capacity: d.capacity || '',
          assignment_id: a.id ?? 0,
          device_id: d.id ?? a.device_id ?? 0,
          _open: true,
          notFound: false
        })
      );

      existingSerials.add(serial);
    }

    if (!this.rows.length) this.addRow();
    const emptyRow = this.rows.find(r => r.serial === '' && r.make === '' && r.capacity === '');
    if (emptyRow) this.rows.splice(this.rows.indexOf(emptyRow), 1);

    this.closeDevicePicker();
    // this.setPageMessage('success', 'Selected devices added to the table.');
  }

  onSerialChanged(i: number, serial: string) {
    const key = (serial || '').toUpperCase().trim();
    const row = this.rows[i];
    const hit = this.serialIndex[key];

    if (hit) {
      row.make = hit.make || '';
      row.capacity = hit.capacity || '';
      row.device_id = hit.device_id || 0;
      row.assignment_id = hit.assignment_id || 0;
      row.notFound = false;

      if (!this.header.phase && hit.phase) {
        this.header.phase = (hit.phase || '').toUpperCase();
      }

      this.clearPageMessage();
    } else {
      row.make = '';
      row.capacity = '';
      row.device_id = 0;
      row.assignment_id = 0;
      row.notFound = key.length > 0;

      if (key.length > 0) {
        this.setPageMessage(
          'warning',
          `Serial "${serial}" not found in assigned list.`
        );
      }
    }
  }

  // ===== numbers / dates =====
  private isoOn(dateStr?: string) {
    const d = dateStr ? new Date(dateStr + 'T10:00:00') : new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  }

  private numOrNull(v: any) {
    const n = Number(v);
    return (isFinite(n) && v !== '' && v !== null && v !== undefined) ? n : null;
  }

  // ===== shunt/nutral math =====
  private round2(v: number | null): number | null {
    if (v == null || !isFinite(v)) return null;
    return Math.round(v * 100) / 100;
  }
  private diff(a?: number | null, b?: number | null): number | null {
    if (a == null || b == null) return null;
    return b - a;
  }
  private pctError(meterDiff: number | null, refDiff: number | null): number | null {
    if (meterDiff == null || refDiff == null) return null;
    if (refDiff === 0) return null;
    return ((meterDiff - refDiff) / refDiff) * 100;
  }

  calcShunt(i: number): void {
    const r = this.rows[i];
    const meter = this.diff(r.shunt_reading_before_test, r.shunt_reading_after_test);
    const ref = this.diff(r.shunt_ref_start_reading, r.shunt_ref_end_reading);
    r.shunt_error_percentage = this.round2(this.pctError(meter, ref));
    this.calculateErrorPct(i);
  }

  calcNutral(i: number): void {
    const r = this.rows[i];
    const meter = this.diff(r.nutral_reading_before_test, r.nutral_reading_after_test);
    const ref = this.diff(r.nutral_ref_start_reading, r.nutral_ref_end_reading);
    r.nutral_error_percentage = this.round2(this.pctError(meter, ref));
    this.calculateErrorPct(i);
  }

  onErrorFromModeChanged(i: number) {
    this.calculateErrorPct(i);
  }

  calculateErrorPct(i: number): void {
    const r = this.rows[i];
    let source: number | null = null;
    switch (r.error_from_mode) {
      case 'SHUNT':
        source = r.shunt_error_percentage ?? null;
        break;
      case 'NUTRAL':
        source = r.nutral_error_percentage ?? null;
        break;
      default:
        source = r.shunt_error_percentage ?? r.nutral_error_percentage ?? null;
    }
    r.error_percentage_import = this.round2(source);
  }

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

    const missingResultIdx = this.rows.findIndex(
      r => (r.serial || '').trim() && !r.test_result
    );
    if (missingResultIdx !== -1) {
      this.setPageMessage(
        'warning',
        `Row #${missingResultIdx + 1} is missing Test Result.`
      );
      return false;
    }

    return true;
  }

  private buildPayload(): any[] {
    const approverId = this.currentUserId || 0;
    const createdById = this.currentUserId || 0;

    return (this.rows || [])
      .filter(r => (r.serial || '').trim())
      .map(r => {
        const whenISO = this.isoOn(r.testing_date);

        return {
          device_id: r.device_id ?? 0,
          assignment_id: r.assignment_id ?? 0,
          start_datetime: whenISO,
          end_datetime: whenISO,

          // physicals
          physical_condition_of_device: r.physical_condition_of_device || null,
          seal_status: r.seal_status || null,
          meter_glass_cover: r.meter_glass_cover || null,
          terminal_block: r.terminal_block || null,
          meter_body: r.meter_body || null,
          other: r.other || null,
          is_burned: !!r.is_burned,

          // SHUNT
          shunt_reading_before_test: this.numOrNull(r.shunt_reading_before_test),
          shunt_reading_after_test: this.numOrNull(r.shunt_reading_after_test),
          shunt_ref_start_reading: this.numOrNull(r.shunt_ref_start_reading),
          shunt_ref_end_reading: this.numOrNull(r.shunt_ref_end_reading),
          shunt_current_test: r.shunt_current_test || null,
          shunt_creep_test: r.shunt_creep_test || null,
          shunt_dail_test: r.shunt_dail_test || null,
          shunt_error_percentage: this.numOrNull(r.shunt_error_percentage),

          // NUTRAL
          nutral_reading_before_test: this.numOrNull(r.nutral_reading_before_test),
          nutral_reading_after_test: this.numOrNull(r.nutral_reading_after_test),
          nutral_ref_start_reading: this.numOrNull(r.nutral_ref_start_reading),
          nutral_ref_end_reading: this.numOrNull(r.nutral_ref_end_reading),
          nutral_current_test: r.nutral_current_test || null,
          nutral_creep_test: r.nutral_creep_test || null,
          nutral_dail_test: r.nutral_dail_test || null,
          nutral_error_percentage: this.numOrNull(r.nutral_error_percentage),

          // combined import error
          error_percentage_import: this.numOrNull(r.error_percentage_import),

          // details & results
          details: r.remark || null,
          test_result: r.test_result || null,
          test_method: this.testMethod || null,
          test_status: this.testStatus || null,
          final_remarks: r.final_remarks || null,
          // consumer/fees-ish (VIG)
          consumer_name: r.consumer_name || null,
          consumer_address: r.address || null,
          ref_no: r.account_number || null,
          test_requester_name: this.testing_requester_name || null,

          // removal / P4 VIG fields
          meter_removaltime_reading: this.numOrNull(r.removal_reading),
          any_other_remarkny_zone: r.condition_at_removal || null,
          p4_metercodition: r.condition_at_removal || null,
          p4_division: r.division_zone || null,
          p4_no: r.panchanama_no || null,
          p4_date: r.panchanama_date || null,

          // approvals & audit
          approver_id: approverId || null,
          created_by_id: createdById || null,
          report_id: null,
          report_type: 'VIGILENCE_CHECKING'
        };
      });
  }

  // ===== submit modal =====
  openConfirmSubmit() {
    this.alertSuccess = null;
    this.alertError = null;
    if (!this.validate()) return;
    this.modal.action = 'submit';
    this.modal.title = 'Submit Batch — Preview';
    this.modal.open = true;
  }

  closeModal() {
    this.modal.open = false;
    this.modal.action = null;
    this.modal.payload = undefined;
  }

  confirmModal() {
    if (this.modal.action === 'submit') {
      this.doSubmit();
    }
  }

async doSubmit() {
  const payload = this.buildPayload();
  if (!payload.length) {
    this.alertError = 'No valid rows to submit.';
    this.openAlert(
      'warning',
      'Nothing to submit',
      'Please add at least one valid row.'
    );
    return;
  }

  this.submitting = true;
  this.alertSuccess = null;
  this.alertError = null;
  this.openAlert('info', 'Submitting…', 'Saving data to server.');

  this.api.postTestReports(payload).subscribe({
    next: async () => {
      this.submitting = false;

      const header: VigHeader = {
        location_code: this.header.location_code || '',
        location_name: this.header.location_name || '',
        testMethod: this.testMethod || '',
        testStatus: this.testStatus || '',
        date: new Date().toISOString().slice(0, 10),
        testing_bench: this.header.testing_bench || '-',
        testing_user: this.header.testing_user || '-',

        lab_name: this.labInfo?.lab_name || null,
        lab_address: this.labInfo?.address || null,
        lab_email: this.labInfo?.email || null,
        lab_phone: this.labInfo?.phone || null,
        leftLogoUrl: this.labInfo?.logo_left_url || '/assets/icons/wzlogo.png',
        rightLogoUrl: this.labInfo?.logo_right_url || '/assets/icons/wzlogo.png'
      };

      // build full PDF rows for the contested (VIG) report
      const rows: VigRow[] = (this.rows || [])
        .filter(r => (r.serial || '').trim())
        .map(r => ({
          serial: r.serial,
          make: r.make,
          capacity: r.capacity,
          removal_reading: this.numOrNull(r.removal_reading) ?? undefined,
          test_result: r.test_result,

          // Consumer / seizure info
          consumer_name: r.consumer_name,
          address: r.address,
          account_number: r.account_number,
          division_zone: r.division_zone,
          panchanama_no: r.panchanama_no,
          panchanama_date: r.panchanama_date,
          condition_at_removal: r.condition_at_removal,

          // Physical condition
          testing_date: r.testing_date,
          is_burned: !!r.is_burned,
          seal_status: r.seal_status,
          meter_glass_cover: r.meter_glass_cover,
          terminal_block: r.terminal_block,
          meter_body: r.meter_body,
          other: r.other,

          // Test/meter type selections
          test_type: r.view_mode === 'BOTH'
            ? 'BOTH'
            : (r.view_mode === 'SHUNT'
                ? 'SHUNT'
                : (r.view_mode === 'NUTRAL'
                    ? 'NEUTRAL'
                    : undefined)),
          // if you actually collect meter type somewhere in UI, map it here;
          // leaving undefined won't break PDF
          meter_type: undefined,

          // Shunt set
          shunt_reading_before_test: this.numOrNull(r.shunt_reading_before_test),
          shunt_reading_after_test: this.numOrNull(r.shunt_reading_after_test),
          shunt_ref_start_reading: this.numOrNull(r.shunt_ref_start_reading),
          shunt_ref_end_reading: this.numOrNull(r.shunt_ref_end_reading),
          shunt_error_percentage: this.numOrNull(r.shunt_error_percentage),
          shunt_current_test: r.shunt_current_test || null,
          shunt_creep_test: r.shunt_creep_test || null,
          shunt_dail_test: r.shunt_dail_test || null,

          // Neutral set
          nutral_reading_before_test: this.numOrNull(r.nutral_reading_before_test),
          nutral_reading_after_test: this.numOrNull(r.nutral_reading_after_test),
          nutral_ref_start_reading: this.numOrNull(r.nutral_ref_start_reading),
          nutral_ref_end_reading: this.numOrNull(r.nutral_ref_end_reading),
          nutral_error_percentage: this.numOrNull(r.nutral_error_percentage),
          nutral_current_test: r.nutral_current_test || null,
          nutral_creep_test: r.nutral_creep_test || null,
          nutral_dail_test: r.nutral_dail_test || null,

          // Import / Export / calc
          start_reading_import: null,
          final_reading_import: null,
          difference_import: null,
          start_reading_export: null,
          final_reading_export: null,
          difference_export: null,
          final_Meter_Difference: null,
          error_percentage_import: this.numOrNull(r.error_percentage_import),
          error_percentage_export: null,

          // Lab / accounting / misc
          certificate_number: undefined,
          testing_fees: undefined,
          fees_mr_no: undefined,
          fees_mr_date: undefined,
          ref_no: r.account_number,
          test_requester_name: this.testing_requester_name || r.test_requester_name || '',
          meter_removaltime_metercondition: null,
          any_other_remarkny_zone: r.condition_at_removal,
          dail_test_kwh_rsm: null,
          recorderedbymeter_kwh: null,

          // P4 section-ish
          p4_division: r.division_zone,
          p4_no: r.panchanama_no,
          p4_date: r.panchanama_date,
          p4_metercodition: r.condition_at_removal,

          // Remarks
          final_remarks: r.final_remarks || '',
          approver_remark: undefined,
          dial_testby: undefined,

          remark: r.remark || ''
        }));

      this.openAlert('success', 'Saved', 'Data saved. Generating PDF…', 1200);

      await this.pdfSvc.download(header, rows);

      this.alertSuccess = 'Batch submitted and PDF downloaded successfully!';
      this.openAlert(
        'success',
        'Completed',
        'PDF downloaded to your device.',
        1600
      );

      // reset for next batch
      this.rows = [this.emptyRow()];
      setTimeout(() => this.closeModal(), 1000);
    },
    error: (e) => {
      console.error(e);
      this.submitting = false;
      this.alertError = 'Error submitting batch.';
      this.openAlert(
        'error',
        'Submission failed',
        'Something went wrong while submitting the batch.'
      );
    }
  });
}


  // ===== alert helpers =====
  openAlert(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    autoCloseMs: number = 0
  ) {
    if (this.alert._t) {
      clearTimeout(this.alert._t as any);
    }
    this.alert = { open: true, type, title, message, autoCloseMs, _t: 0 };
    if (autoCloseMs > 0) {
      this.alert._t = setTimeout(() => this.closeAlert(), autoCloseMs);
    }
  }

  closeAlert() {
    if (this.alert._t) {
      clearTimeout(this.alert._t as any);
    }
    this.alert.open = false;
  }

  // ===== page-level message =====
  setPageMessage(
    type: 'success' | 'error' | 'warning' | 'info',
    text: string
  ) {
    this.pageMessage = { type, text };
  }

  clearPageMessage() {
    this.pageMessage = null;
  }
}
