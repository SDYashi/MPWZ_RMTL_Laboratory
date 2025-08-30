import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;
import TDocumentDefinition from 'pdfmake/interfaces';
import { environment } from 'src/environment/environment';
type TDocumentDefinition = /*unresolved*/ any;

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
  id: number;           // assignment_id
  device_id: number;
  device?: MeterDevice | null;
}
interface DeviceRow {
  // visible
  serial: string;
  make: string;
  capacity: string;
  remark: string;                  // previously `result` (shown as “Remarks”)
  test_result?: string;  
  test_method: 'MANUAL' | 'AUTOMATED';      
  test_status?: string;           // previously `test_status` (shown as “Test Status”)
  device_id: number;
  assignment_id: number;
  notFound?: boolean;
  // details (shown in expandable row)
  physical_condition_of_device: string;
  seal_status: string;
  meter_glass_cover: string;
  terminal_block: string;
  meter_body: string;
  other: string;                   // extra note (separate from remark)
  is_burned: boolean;

  reading_before_test: number;
  reading_after_test: number;
  ref_start_reading: number;
  ref_end_reading: number;
  error_percentage: number;

  _open?: boolean;                 // UI only
}
interface ModalState {
  open: boolean;
  title: string;
  message: string;
  action: 'clear' | 'reload' | 'removeRow' | 'submit' | null | string[];
  payload?: any;
}
@Component({
  selector: 'app-rmtl-add-testreport-oldagainstmtr',
  templateUrl: './rmtl-add-testreport-oldagainstmtr.component.html',
  styleUrls: ['./rmtl-add-testreport-oldagainstmtr.component.css']
})
export class RmtlAddTestreportOldagainstmtrComponent implements OnInit {

  // Enums/options
  device_status: 'ASSIGNED' = 'ASSIGNED';
  comment_bytester: any[] = [];      
  testResultOptions: any[] = [];
  test_methods: any[] = [];
  test_statuses: any[] = [];

  // Header + rows
  batch = {
    header: { zone: '', phase: '', date: '', location_code: '', location_name: '' },
    rows: [] as DeviceRow[]
  };

  // IDs
  currentUserId = 0;
  currentLabId = 0;

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
  approverId: number | null = null;

  // Serial → device index
  private serialIndex: Record<string, {
    make?: string;
    capacity?: string;
    device_id: number;
    assignment_id: number;
    phase?: string;
  }> = {};
  physical_conditions: any;
  seal_statuses: any;
  glass_covers: any;
  terminal_blocks: any;
  meter_bodies: any;
  makes: any;
  capacities: any;
  test_results: any;
  report_type: any;

  constructor(private api: ApiServicesService) {}

  // ===================== Lifecycle =====================
  ngOnInit(): void {
    this.batch.header.date = this.toYMD(new Date());

    // Load enums/options
    this.api.getEnums().subscribe({
      next: (data) => {
        this.device_status = (data?.device_status as 'ASSIGNED') ?? 'ASSIGNED';
        this.comment_bytester = data?.commentby_testers || [];
        this.test_results = data?.test_results || [];
        this.test_methods =data?.test_methods || [];
        this.test_statuses = data?.test_statuses || [];
        this.physical_conditions = data?.physical_conditions || [];
        this.seal_statuses = data?.seal_statuses || [];
        this.glass_covers = data?.glass_covers || [];
        this.terminal_blocks = data?.terminal_blocks || [];
        this.meter_bodies = data?.meter_bodies || [];
        this.makes = data?.makes || [];
        this.capacities = data?.capacities || [];
        this.report_type= data?.test_report_types.AGAINST_OLD_METER|| 'AGAINST OLD METER';

      },
      error: (err) => console.error('Enums error', err)
    });

    // Load ids
    this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    this.currentLabId  = Number(localStorage.getItem('currentLabId') || 0);

    // build index only
    this.doReloadAssignedWithoutAddingRows();
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

  doReloadAssigned(): void {
    this.loading = true;
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data: any) => {
        const assignments: AssignmentItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.results) ? data.results : [];

        this.rebuildSerialIndex(assignments);

        // Build visible rows from assignments
        this.batch.rows = assignments.map(a => {
          const d = a.device || ({} as MeterDevice);
          return this.emptyRow({
            serial: d.serial_number || '',
            make: d.make || '',
            capacity: d.capacity || '',
            device_id: d.id ?? a.device_id ?? 0,
            assignment_id: a.id ?? 0,
            notFound: false
          });
        });

        // keep 1 empty row if nothing
        if (!this.batch.rows.length) this.addBatchRow();

        // infer consistent phase if possible
        if (!this.batch.header.phase) {
          const uniq = new Set(
            assignments.map(a => (a.device?.phase || '').toUpperCase()).filter(Boolean)
          );
          this.batch.header.phase = uniq.size === 1 ? [...uniq][0] : '';
        }
        this.loading = false;
      },
      error: (e) => {
        console.error('Assigned list error', e);
        this.batch.rows = [this.emptyRow()];
        this.loading = false;
      }
    });
  }

  private loadDataWithoutAddingRows(assignments: AssignmentItem[]): void {
    this.rebuildSerialIndex(assignments);
  }

  doReloadAssignedWithoutAddingRows(): void {
    this.loading = true;
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data: any) => {
        const assignments: AssignmentItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.results) ? data.results : [];
        this.loadDataWithoutAddingRows(assignments);
        const firstDevice = assignments.find(a => a.device);
        if (firstDevice) {
          this.batch.header.location_code = firstDevice.device?.location_code ?? '';
          this.batch.header.location_name = firstDevice.device?.location_name ?? '';
        }

        if (!this.batch.header.phase) {
          const uniq = new Set(
            assignments.map(a => (a.device?.phase || '').toUpperCase()).filter(Boolean)
          );
          this.batch.header.phase = uniq.size === 1 ? [...uniq][0] : '';
        }
        this.loading = false;
      },
      error: (e) => {
        console.error('Assigned list error', e);
        this.loading = false;
      }
    });
  }

  // ===================== Row ops + autofill =====================
  private emptyRow(seed?: Partial<DeviceRow>): DeviceRow {
    return {
      serial: '',
      make: '',
      capacity: '',
      remark: '',
      test_result: undefined,
      test_method: 'MANUAL',  // default method
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

  addBatchRow(): void {
    this.batch.rows.push(this.emptyRow());
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
  private toYMD(d: Date): string {
    const dt = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return dt.toISOString().slice(0, 10);
  }

  private isoOn(dateStr?: string): string {
    const d = dateStr ? new Date(dateStr + 'T10:00:00') : new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  }

  // Prepare payload from user-entered values only
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
        other: this.comment_bytester || '-',
        is_burned: !!r.is_burned,

        reading_before_test: Number(r.reading_before_test) || 0,
        reading_after_test: Number(r.reading_after_test) || 0,
        ref_start_reading: Number(r.ref_start_reading) || 0,
        ref_end_reading: Number(r.ref_end_reading) || 0,
        error_percentage: Number(r.error_percentage) || 0,

        details: r.device_id ?? 0,             // as per your example
        test_result: (r.test_result as string) || undefined,
        test_method: this.testMethod,
        test_status: this.testStatus,
        approver_id: this.approverId ?? null,
        report_type: this.report_type ?? 'AGAINST OLD METER',
        remark: r.remark
      }));
  }

  private doSubmitBatch(): void {
    // Build payload (also used for preview)
    this.payload = this.buildPayloadForPreview();

    if (!this.payload.length) {
      this.alertError = 'No valid rows to submit.';
      this.alertSuccess = null;
      return;
    }

    // Ensure user selected PASS/FAIL for all rows
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
      next: () => {
        this.submitting = false;
          // create PDF BEFORE clearing rows
        try {
          this.downloadStopDefectivePdfFromBatch();
        } catch (e) {
          console.error('PDF generation failed:', e);
        }
        this.alertSuccess = 'Batch Report submitted successfully!';
        this.alertError = null;
        this.batch.rows = [this.emptyRow()];  // reset to one empty row
        setTimeout(() => this.closeModal(), 1200);
    
      },
      error: (error) => {
        this.submitting = false;
        this.alertSuccess = null;
        this.alertError = 'Error submitting report. Please verify rows and try again.';
        console.error('Submit batch error', error);
      }
    });
  }

  // ===================== Confirm modal =====================
  openConfirm(action: ModalState['action'], payload?: any): void {
    if (action !== 'submit') {
      this.alertSuccess = null;
      this.alertError = null;
    }

    this.modal.action = action;
    this.modal.payload = payload;

    switch (action) {
      case 'reload':
        this.modal.title = 'Reload Assigned Devices';
        this.modal.message = 'Replacing table with all latest assigned devices?';
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
        this.payload = this.buildPayloadForPreview();
        this.modal.title = 'Submit Batch Report — Preview';
        this.modal.message = '';
        break;
      default:
        this.modal.title = '';
        this.modal.message = '';
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
    if (a !== 'submit') this.closeModal();
    if (a === 'reload') this.doReloadAssigned();
    if (a === 'removeRow') this.doRemoveRow(p?.index);
    if (a === 'clear') this.doClearRows();
    if (a === 'submit') this.doSubmitBatch();
  }

  // ===================== PDF Download =====================
 // ---------- PDF helpers ----------
private buildPrintableSnapshot() {
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
    approverId: this.approverId ?? '-',
    testerName: (localStorage.getItem('currentUserName') || '').toString(),
    labName: 'REMOTE METERING TESTING LABORATORY INDORE'
  };

  return { rows, meta };
}

private isOk(row: { remark: string; test_result: string }): boolean {
  const t = `${row.test_result} ${row.remark}`.toLowerCase();
  return /\bok\b|\bpass\b/.test(t);
}

private resultText(row: { remark: string; test_result: string }): string {
  const t = (row.test_result || '').trim();
  const m = (row.remark || '').trim();
  if (t && m && t.toUpperCase() !== 'OK') return `${t} — ${m}`;
  if (t && (!m || t.toUpperCase() === 'OK')) return t;
  return m || '-';
}

private buildStopDefectiveDoc(
  rows: Array<{serial:string;make:string;capacity:string;remark:string;test_result:string}>,
  meta: any
): TDocumentDefinitions {
  const total = rows.length;
  const okCount = rows.filter(r => this.isOk(r)).length;
  const defCount = total - okCount;

  const tableBody: any[] = [[
    { text: 'S.No', style: 'th', alignment: 'center' },
    { text: 'METER NUMBER', style: 'th' },
    { text: 'MAKE', style: 'th' },
    { text: 'CAPACITY', style: 'th' },
    { text: 'TEST RESULT', style: 'th' },
  ]];
  rows.forEach((r, i) => {
    tableBody.push([
      { text: String(i + 1), alignment: 'center' },
      { text: r.serial || '-' },
      { text: r.make || '-' },
      { text: r.capacity || '-' },
      { text: this.resultText(r) },
    ]);
  });

  return {
    pageSize: 'A4',
    pageMargins: [28, 36, 28, 40],
    defaultStyle: { fontSize: 10 }, // set font here if you embed Devanagari
    styles: {
      hindiTitle: { fontSize: 14, bold: true, alignment: 'center' },
      sub: { fontSize: 10, color: '#666', alignment: 'center', margin: [0,2,0,0] },
      th: { bold: true },
      badge: { fontSize: 11, bold: true, alignment: 'right' },
      rightSmall: { fontSize: 9, alignment: 'right', margin: [0,2,0,0] },
      footRole: { fontSize: 10, bold: true, alignment: 'center' },
      footTiny: { fontSize: 9, alignment: 'center', color: '#444' },
    },
    info: { title: `Stop-Defective_${meta.date}` },
    // header: {
    //   columns: [
    //     {
    //       image: 'data:image/png;base64,' + environment.LOGO_BASE64,
    //       width: 100,
    //       margin: [0, 8, 0, 0],
    //     },
    //     {
    //       image: 'data:image/png;base64,' + environment.LOGO_BASE64,
    //       width: 100,
    //       margin: [0, 8, 0, 0],
    //       alignment: 'right',
    //     },
    //   ],
    //   margin: [0, 8, 0, 0],
    // },
    content: [
      {
        columns: [
          { width: '*', stack: [
            { text: 'MADHYAA PRADESH PASCHIM KSHETRA VIDYUT VITARNAN COMPANY LIMITED', style: 'hindiTitle' }, // { text: 'Madhya Pradesh Paschim Kshetra Vidyut Vitaran Company Limited Indore', style: 'hindiTitle' },
            { text: meta.labName, style: 'sub' },
            { text: 'MPPKVVCL NEAR CONFRENCE HALL  , POLOGROUND, PIN-452003 INDORE, (MP).\ntestinglabwzind@gmail.com - Ph. No. 0731-2997802', style: 'sub', margin: [0,3,0,3] },
          ]}        
        ]
      },

      { canvas: [{ type:'line', x1:0, y1:0, x2:540, y2:0, lineWidth:1 }], margin: [0,6,0,6] },
      { text: 'AGAINST OLD_METER TEST REPORT', style: 'hindiTitle', margin: [0,0,0,4] },


      {
        layout: 'lightHorizontalLines',
        table: {
          widths: ['auto','*','auto','*','auto','*'],
          body: [
            [{ text:'ZONE/DC', bold:true }, meta.zone || '-',
             { text:'PHASE', bold:true }, meta.phase || '-',
             { text:'TESTING DATE', bold:true }, meta.date],
            [{ text:'Test Method', bold:true }, meta.testMethod,
             { text:'Test Status', bold:true }, meta.testStatus,
             { text:'Approver ID', bold:true }, String(meta.approverId || '-')],
          ]
        },
        margin: [0, 0, 0, 8]
      },

      {
        layout: 'lightHorizontalLines',
        table: { headerRows: 1, widths: ['auto','*','*','*','*'], body: tableBody }
      },

      { text: `\nTOTAL: ${total}   •   OK: ${okCount}   •   DEF: ${defCount}`, alignment: 'right' },

      { text: '\n' },

      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Tested by', style: 'footRole' },
              { text: '\n\n____________________________', alignment: 'center' },
              { text: (meta.testerName || ''), style: 'footTiny' },
              { text: 'TESTING ASSISTANT (RMTL)', style: 'footTiny' },
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'Verified by', style: 'footRole' },
              { text: '\n\n____________________________', alignment: 'center' },
              { text: (meta.testerName || ''), style: 'footTiny' },
              { text: 'JUNIOR ENGINEER (RMTL)', style: 'footTiny' },
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'Approved by', style: 'footRole' },
              { text: '\n\n____________________________', alignment: 'center' },
              { text: 'ASSISTANT ENGINEER (RMTL)', style: 'footTiny' },
            ],
          },
        ],
        margin: [0, 8, 0, 0]
      },
    ],
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'left', margin: [28,0,0,0] },
        { text: 'M.P.P.K.V.V.CO. LTD., INDORE', alignment: 'right', margin: [0,0,28,0] },
      ],
      fontSize: 8
    })
  };
}

private downloadStopDefectivePdfFromBatch(): void {
  const snap = this.buildPrintableSnapshot();
  const doc = this.buildStopDefectiveDoc(snap.rows, snap.meta);
  const fname = `AGAINST_OLD_METER_${snap.meta.date}.pdf`;
  pdfMake.createPdf(doc).download(fname);
}






}

