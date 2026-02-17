import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';
import {
  SampleMeterReportPdfService,
  SampleMeterRow,
  SampleMeterMeta,
  PdfLogos,
  SampleLabInfo
} from 'src/app/shared/samplemeter-report-pdf.service';

type Id = number;

interface AssignmentDevice {
  id: Id;
  serial_number: string;
  make?: string;
  capacity?: string;
  phase?: string;
  location_code?: string | null;
  location_name?: string | null;
  remark?: string;
}

interface AssignmentItem {
  id: Id; // assignment_id
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
  remark?: string;
  test_result?: string;
    testshifts?: string | null; // enum

  // mapping
  device_id?: Id;
  assignment_id?: Id;

  // backend fields
  consumer_name?: string | null;
  consumer_address?: string | null;

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
  selector: 'app-rmtl-add-testreport-samplemeter',
  templateUrl: './rmtl-add-testreport-samplemeter.component.html',
  styleUrls: ['./rmtl-add-testreport-samplemeter.component.css']
})
export class RmtlAddTestreportSamplemeterComponent implements OnInit {
  testshifts: string | null = null;
  shifts: string[] = [];
  commentby_testers: string[] = [];
  test_results: string[] = [];
  test_methods: string[] = [];
  test_statuses: string[] = [];

  // ids
  currentUserId: any;
  currentLabId: any;

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
  testMethod: string | null = null;
  testStatus: string | null = null;

  loading = false;
  submitting = false;
  inlineInfo: string | null = null;
  inlineError: string | null = null;

  rows: Row[] = [this.emptyRow()];
  modal: ModalState = { open: false, title: '', message: '' };

  // PDF upload
  selectedPdfFile: File | null = null;
  selectedPdfName: string | null = null;

  // Lab info (FIX: now loaded and passed to PDF meta)
  labInfo: SampleLabInfo = {};

  // picker
  asgPicker = {
    open: false,
    filter: '',
    selected: {} as Record<Id, boolean>,
    list: [] as AssignmentItem[],
    replaceExisting: true
  };

  // For serial lookup
  private serialIndex: Record<
    string,
    {
      make?: string;
      capacity?: string;
      device_id: Id;
      assignment_id: Id;
      phase?: string;
      remark?: string;
      location_code?: string | null;
      location_name?: string | null;
    }
  > = {};

  // adjust to your enums (SAMPLE purpose)
  device_status: 'ASSIGNED' = 'ASSIGNED';
  device_type = 'METER';
  device_testing_purpose: any;
  report_type = 'SAMPLE_TESTING';
  benches: any;

  constructor(
    private api: ApiServicesService,
    private authService: AuthService,
    private samplePdf: SampleMeterReportPdfService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getuseridfromtoken();
    this.currentLabId = this.authService.getlabidfromtoken();



    this.api.getEnums().subscribe({
      next: (data) => {
        this.commentby_testers = data?.commentby_testers || [];
        this.test_results = data?.test_results || [];
        this.test_methods = data?.test_methods || [];
        this.test_statuses = data?.test_statuses || [];
        this.report_type = data?.test_report_types?.SAMPLE_TESTING ?? 'SAMPLE_TESTING';
        this.device_testing_purpose = this.report_type;
        this.shifts = data?.labshifts || [];

        this.reloadAssignedIndex();
      },
      error: () => (this.inlineError = 'Unable to load enums. Please reload.')
    });

     // Lab info (for PDF header)
    if (this.currentLabId) {
      this.api.getLabInfo(this.currentLabId).subscribe({
        next: (info: any) => {
          this.labInfo = {
            lab_name: info?.lab_pdfheader_name || info?.lab_name,
            address_line: info?.lab_pdfheader_address || info?.lab_location,
            email: info?.lab_pdfheader_email || info?.lab_pdfheader_contact_no,
            phone: info?.lab_pdfheader_contact_no || info?.lab_location
         };
          this.benches = Array.isArray(info?.benches) ? info.benches : [];
        }
      });
    }
  }

  // ===================== Lab info (FIX) =====================


  // ===================== PDF selection =====================
  onPdfSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;

    if (!file) {
      this.selectedPdfFile = null;
      this.selectedPdfName = null;
      return;
    }
    if (file.type !== 'application/pdf') {
      this.inlineError = 'Only PDF allowed.';
      this.selectedPdfFile = null;
      this.selectedPdfName = null;
      input.value = '';
      return;
    }

    this.inlineError = null;
    this.selectedPdfFile = file;
    this.selectedPdfName = file.name;
  }

  clearSelectedPdf(inputEl?: HTMLInputElement) {
    this.selectedPdfFile = null;
    this.selectedPdfName = null;
    if (inputEl) inputEl.value = '';
  }

  // ===================== PDF build (FIX: meta.lab + better row normalization) =====================
  private buildSamplePdfInputs(): { rows: SampleMeterRow[]; meta: SampleMeterMeta; logos?: PdfLogos } {
    const rows: SampleMeterRow[] = this.rows
      .filter((r) => (r.meter_sr_no || '').trim())
      .map((r) => ({
        serial_number: (r.meter_sr_no || '').trim(),
        make: (r.meter_make || '').trim() || '-',
        capacity: (r.meter_capacity || '').trim() || '-',
        test_result: (r.test_result || '').trim() || '-',
        remark: (r.remark || '').trim()
      }));

    const meta: SampleMeterMeta = {
      zone: `${this.header.location_code || ''} ${this.header.location_name || ''}`.trim() || '-',
      phase: (this.header.phase || '').trim() || '-',
      date: this.batchDate,
      testMethod: this.testMethod || undefined,
      testStatus: this.testStatus || undefined,
      testing_bench: (this.header.testing_bench || '').trim() || undefined,
      testing_user: (this.header.testing_user || '').trim() || undefined,
      approving_user: (this.header.approving_user || '').trim() || undefined,

      // FIX: lab info now included so header prints correctly
      lab: {
        lab_name: (this.labInfo?.lab_name || '').trim(),
        address_line: (this.labInfo?.address_line || '').trim(),
        email: (this.labInfo?.email || '').trim(),
        phone: (this.labInfo?.phone || '').trim()
      }
    };

    const logos: PdfLogos | undefined = {
      leftLogoUrl: '/assets/icons/wzlogo.png',
      rightLogoUrl: '/assets/icons/wzlogo.png'
    };

    return { rows, meta, logos };
  }

  async downloadPdf() {
    try {
      const { rows, meta, logos } = this.buildSamplePdfInputs();
      await this.samplePdf.download(rows, meta, logos);
    } catch (e) {
      console.error(e);
      this.inlineError = 'PDF download failed.';
    }
  }

  // ===================== assigned =====================
  private getAssignedParams() {
    const uid = Number(this.currentUserId) || 0;
    const lid = Number(this.currentLabId) || 0;
    if (!uid || !lid) return null;

    return {
      status: this.device_status,
      user_id: uid,
      lab_id: lid,
      device_testing_purpose: this.device_testing_purpose,
      device_type: this.device_type
    };
  }

  private reloadAssignedIndex() {
    const p = this.getAssignedParams();
    if (!p) return;

    this.loading = true;
    this.api
      .getAssignedMeterList(p.status, p.user_id, p.lab_id, p.device_testing_purpose, p.device_type)
      .subscribe({
        next: (data: any) => {
          const list: AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

          this.asgPicker.list = list;
          this.rebuildSerialIndex(list);

          const first = list.find((a) => a.device);
          this.fillHeaderFromAssignment(first);

          this.loading = false;
          this.inlineInfo = `Total ${list.length} assigned device(s) loaded for Sample Meter testing.`;
          this.inlineError = null;
        },
        error: () => {
          this.loading = false;
          this.inlineError = 'No assigned devices found for Sample Meter testing.';
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
        make: (d?.make || '').trim(),
        capacity: (d?.capacity || '').trim(),
        device_id: d?.id ?? a.device_id,
        assignment_id: a.id,
        phase: (d?.phase || '').trim(),
        remark: (d?.remark || '').trim(),
        location_code: d?.location_code ?? null,
        location_name: d?.location_name ?? null
      };
    }
  }

  // ===================== rows =====================
  private emptyRow(seed: Partial<Row> = {}): Row {
    return {
      meter_sr_no: '',
      meter_make: '',
      meter_capacity: '',
      remark: '',
      ...seed
    };
  }

  addRow() {
    this.rows.push(this.emptyRow());
  }

  removeRow(i: number) {
    this.rows.splice(i, 1);
    if (!this.rows.length) this.rows = [this.emptyRow()];
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

      // auto fill header if missing
      if (!this.header.phase && hit.phase) this.header.phase = (hit.phase || '').toUpperCase();
      if (!this.header.location_code && hit.location_code) this.header.location_code = hit.location_code || '';
      if (!this.header.location_name && hit.location_name) this.header.location_name = hit.location_name || '';
    } else {
      row.meter_make = '';
      row.meter_capacity = '';
      row.device_id = undefined;
      row.assignment_id = undefined;
      row.notFound = !!key;
    }
  }

  // ===================== picker =====================
  openAssignedPicker() {
    const p = this.getAssignedParams();
    if (!p) {
      this.inlineError = 'Lab/User not ready.';
      return;
    }
    this.asgPicker.open = true;
    this.asgPicker.selected = {};
    this.reloadAssignedIndex();
  }

  closeAssignedPicker() {
    this.asgPicker.open = false;
  }

  get filteredAssigned(): AssignmentItem[] {
    const q = this.asgPicker.filter.trim().toLowerCase();
    const base = this.asgPicker.list.filter((a) => {
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
    const chosen = this.asgPicker.list.filter((a) => this.asgPicker.selected[a.id] && a.device?.serial_number);

    const existing = new Set(this.rows.map((r) => (r.meter_sr_no || '').toUpperCase().trim()));

    const newRows: Row[] = [];
    for (const a of chosen) {
      const d = a.device!;
      const sr = (d.serial_number || '').trim();
      if (!sr || existing.has(sr.toUpperCase())) continue;

      newRows.push({
        meter_sr_no: sr,
        meter_make: (d.make || '').trim(),
        meter_capacity: (d.capacity || '').trim(),
        remark: '', // keep blank, tester fills
        assignment_id: a.id,
        device_id: d.id || a.device_id,
        notFound: false
      });

      existing.add(sr.toUpperCase());
    }

    this.rows = this.asgPicker.replaceExisting ? (newRows.length ? newRows : [this.emptyRow()]) : [...this.rows, ...newRows];

    this.asgPicker.open = false;
    this.inlineInfo = `${newRows.length} row(s) added to the batch.`;
    this.inlineError = null;
  }

  // ===================== validation + submit =====================
  private validateBeforeSubmit(): { ok: boolean; reason?: string } {
    if (!this.header.location_code || !this.header.location_name) {
      return { ok: false, reason: 'Zone/DC is required (auto from assignment).' };
    }
    if (!this.batchDate) return { ok: false, reason: 'Testing date required.' };
    if (!this.testMethod) return { ok: false, reason: 'Select Test Method.' };
    if (!this.testStatus) return { ok: false, reason: 'Select Test Status.' };
    if (!this.selectedPdfFile) return { ok: false, reason: 'Please upload PDF report (required).' };

    const clean = this.rows.filter((r) => (r.meter_sr_no || '').trim());
    if (!clean.length) return { ok: false, reason: 'Enter at least one serial.' };

    const seenDev = new Set<number>();
    for (let i = 0; i < clean.length; i++) {
      const r = clean[i];
      if (r.notFound) return { ok: false, reason: `Row #${i + 1}: Serial not in assigned list.` };
      if (!r.assignment_id || !r.device_id) return { ok: false, reason: `Row #${i + 1}: Missing mapping.` };
      if (!r.test_result) return { ok: false, reason: `Row #${i + 1}: Choose Test Result.` };

      if (seenDev.has(r.device_id)) return { ok: false, reason: `Duplicate device in rows: device_id ${r.device_id}` };
      seenDev.add(r.device_id);
    }

    return { ok: true };
  }

  openConfirm(action: 'submit' | 'clear') {
    if (action === 'clear') {
      this.modal = {
        open: true,
        title: 'Clear All Rows',
        message: 'Clear all rows and leave one empty row?',
        action: 'clear'
      };
      return;
    }

    const v = this.validateBeforeSubmit();
    if (!v.ok) {
      this.inlineError = v.reason || 'Invalid data.';
      return;
    }

    this.inlineError = null;
    this.modal = {
      open: true,
      title: 'Submit Sample Meter Batch (with PDF)',
      message: 'Please verify PDF File Name before submiting the report.',
      action: 'submit'
    };
  }

  closeModal() {
    this.modal.open = false;
  }

  confirmModal() {
    if (this.modal.action === 'clear') {
      this.rows = [this.emptyRow()];
      this.selectedPdfFile = null;
      this.selectedPdfName = null;
      this.closeModal();
      return;
    }
    if (this.modal.action === 'submit') {
      this.confirmSubmit();
    }
  }

  private confirmSubmit() {
    const v = this.validateBeforeSubmit();
    if (!v.ok) {
      this.inlineError = v.reason || 'Invalid data.';
      return;
    }

    const whenISO = new Date(`${this.batchDate}T10:00:00`);
    const iso = new Date(whenISO.getTime() - whenISO.getTimezoneOffset() * 60000).toISOString();

    const payload = this.rows
      .filter((r) => (r.meter_sr_no || '').trim())
      .map((r) => ({
        assignment_id: r.assignment_id!,
        device_id: r.device_id!,
        report_type: this.report_type,
        start_datetime: iso,
        end_datetime: iso,
        test_method: this.testMethod!,
        test_status: this.testStatus!,
        test_result: r.test_result!,
        testshifts: this.testshifts ?? null,  

        details: (r.remark || '').trim() || null,
        final_remarks: (r.remark || '').trim() || null,

        consumer_name: r.consumer_name ?? null,
        consumer_address: r.consumer_address ?? null
      }));

    const fd = new FormData();
    fd.append('file', this.selectedPdfFile!);
    fd.append('testings_json', JSON.stringify(payload));

    this.submitting = true;
    this.inlineInfo = null;
    this.inlineError = null;

    this.api.postTestingBulkWithPdf(fd).subscribe({
      next: (res: any) => {
        this.submitting = false;
        this.closeModal();

        const url = Array.isArray(res) && res.length ? res[0]?.report_file_url : null;
        this.inlineInfo = url ? `Submitted successfully. PDF URL saved: ${url}` : 'Submitted successfully. PDF URL saved.';
        this.downloadPdf();
        this.inlineError = null;
        this.rows = [this.emptyRow()];
        this.selectedPdfFile = null;
        this.selectedPdfName = null;

        // generate local preview/download PDF also
       
      },
      error: (e) => {
        this.submitting = false;
        console.error(e);
        this.inlineError = e?.error?.detail || 'Error submitting report with PDF.';
      }
    });
  }

  // ===================== header fill =====================
  private fillHeaderFromAssignment(first?: AssignmentItem) {
    if (!first?.device) return;
    const d = first.device;

    this.header.location_code = d.location_code ?? this.header.location_code ?? '';
    this.header.location_name = d.location_name ?? this.header.location_name ?? '';
    if (!this.header.phase && d.phase) this.header.phase = (d.phase || '').toUpperCase();

    this.header.testing_bench = first?.testing_bench?.bench_name || '';
    this.header.testing_user = first?.user_assigned?.name || first?.user_assigned?.username || '';
    this.header.approving_user = first?.assigned_by_user?.name || first?.assigned_by_user?.username || '';
  }

  private toYMD(d: Date): string {
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
