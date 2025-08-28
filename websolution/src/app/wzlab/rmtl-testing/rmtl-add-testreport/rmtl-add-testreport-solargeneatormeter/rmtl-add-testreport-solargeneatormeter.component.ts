import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

type TDocumentDefinitions = any;

interface MeterDevice {
  id: number;
  serial_number: string;
  make?: string;
  capacity?: string;
  location_code?: string | null;
  location_name?: string | null;
}
interface AssignmentItem { id: number; device_id: number; device?: MeterDevice | null; }

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

  testing_fees?: number;
  mr_no?: string;
  mr_date?: string;
  ref_no?: string;

  starting_reading?: number;
  final_reading_r?: number;
  final_reading_e?: number;
  difference?: number;

  starting_current_test?: string;
  creep_test?: string;
  dial_test?: string;
  remark?: string;
  test_result?: string;
  
}

interface ModalState {
  open: boolean;
  title: string;
  message: string;
  action: 'reload' | 'removeRow' | 'submit' | null;
  payload?: any;
}

@Component({
  selector: 'app-rmtl-add-testreport-solargeneatormeter',
  templateUrl: './rmtl-add-testreport-solargeneatormeter.component.html',
  styleUrls: ['./rmtl-add-testreport-solargeneatormeter.component.css']
})
export class RmtlAddTestreportSolargeneatormeterComponent implements OnInit {

  header = { location_code: '', location_name: '' };
  test_methods: any[] = [];
  test_statuses: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;

  device_status: 'ASSIGNED' = 'ASSIGNED';
  currentUserId = 0;
  currentLabId  = 0;
  loading = false;

  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: number; assignment_id: number; }> = {};

  filterText = '';
  rows: CertRow[] = [ this.emptyRow() ];

  // modal + submit state
  modal: ModalState = { open: false, title: '', message: '', action: null };
  submitting = false;
  alertSuccess: string | null = null;
  alertError: string | null = null;

  // optional: approver id if you use it in backend
  approverId: number | null = null;
  office_types: any;
  commentby_testers: any;
  selectedSourceType: any;
  selectedSourceName: string = '';
  filteredSources: any;
  test_results: any;
  // report type for backend
  report_type = 'SOLAR_GENERATION_METER';

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    this.currentLabId  = Number(localStorage.getItem('currentLabId') || 0);

    this.api.getEnums().subscribe({
      next: (d) => {
        this.test_methods  = d?.test_methods || [];
        this.test_statuses = d?.test_statuses || [];
        this.office_types  = d?.office_types || [];
        this.commentby_testers = d?.commentby_testers || [];
        this.test_results = d?.test_results || [];
        this.report_type = d?.test_report_types?.SOLAR_GENERATION_METER || this.report_type;
      }
    });

    this.reloadAssigned(false);
  }

        // ---------- Source fetch ----------
  fetchButtonData(): void {
    if (!this.selectedSourceType || !this.selectedSourceType) {
       alert('Missing Input');
      return;
    }
    this.api.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
      next: (data) => (this.filteredSources = data, 
        this.header.location_name = this.filteredSources.name,
        this.header.location_code = this.filteredSources.code ) ,
      error: () => alert('Failed to fetch source details. Check the code and try again.')
    });
  }

  onSourceTypeChange(): void {
    this.selectedSourceName = '';
    this.filteredSources = [];
  }
  // ======= Computed chips =======
  get matchedCount(){ return (this.rows ?? []).filter(r => !!r.meter_sr_no && !r.notFound).length; }
  get unknownCount(){ return (this.rows ?? []).filter(r => !!r.notFound).length; }

  // ======= Helpers =======
  private emptyRow(seed?: Partial<CertRow>): CertRow {
    return {
      _open: true,
      consumer_name: '',
      address: '',
      meter_make: '',
      meter_sr_no: '',
      meter_capacity: '',
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

  reloadAssigned(replaceRows: boolean = true) {
    this.loading = true;
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        this.rebuildSerialIndex(asg);


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
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

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
  removeRow(i: number) { this.rows.splice(i, 1); }
  trackByRow(i: number, r: CertRow) { return `${r.assignment_id || 0}_${r.device_id || 0}_${r.meter_sr_no || ''}_${i}`; }

  displayRows(): CertRow[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter(r =>
      (r.meter_sr_no || '').toLowerCase().includes(q) ||
      (r.meter_make || '').toLowerCase().includes(q) ||
      (r.consumer_name || '').toLowerCase().includes(q));
  }

  recompute(i: number) {
    const r = this.rows[i];
    const a = Number(r.final_reading_r ?? 0);
    const b = Number(r.starting_reading ?? 0);
    const v = isFinite(a) && isFinite(b) ? +(a - b).toFixed(4) : undefined;
    r.difference = v;
  }

  // ========= Submit flow =========
  private toYMD(d: Date){ const dt = new Date(d.getTime() - d.getTimezoneOffset()*60000); return dt.toISOString().slice(0,10); }
  private isoOn(dateStr?: string){ const d = dateStr? new Date(dateStr+'T10:00:00') : new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString(); }

  private inferredTestResult(r: CertRow): string | undefined {
    const vals = [r.starting_current_test, r.creep_test, r.dial_test].map(v => (v || '').toString().toLowerCase());
    const hasAny = vals.some(v => v.length);
    if (!hasAny) return undefined;
    if (vals.some(v => v.includes('fail'))) return 'FAIL';
    return 'PASS';
  }

 private buildPayloadForPreview(): any[] {
  return (this.rows || [])
    .filter(r => (r.meter_sr_no || '').trim())
    .map(r => {
      const when = this.isoOn(r.date_of_testing);

      // Build the details object first
      const detailsObj = {
        consumer_name: r.consumer_name || '',
        address: r.address || '',
        certificate_no: r.certificate_no || '',
        testing_fees: Number(r.testing_fees ?? 0),
        mr_no: r.mr_no || '',
        mr_date: r.mr_date || '',
        ref_no: r.ref_no || '',
        starting_reading: Number(r.starting_reading ?? 0),
        final_reading_r: Number(r.final_reading_r ?? 0),
        final_reading_e: Number(r.final_reading_e ?? 0),
        difference: Number(r.difference ?? 0),
        starting_current_test: r.starting_current_test || '',
        creep_test: r.creep_test || '',
        dial_test: r.dial_test || '',
        remark: r.remark || '',
      };

      return {
        device_id: r.device_id ?? 0,
        assignment_id: r.assignment_id ?? 0,
        start_datetime: when,
        end_datetime: when,

        // ✅ send a string, not an object
        details: JSON.stringify(detailsObj),

        physical_condition_of_device: '-',
        seal_status: '-',
        meter_glass_cover: '-',
        terminal_block: '-',
        meter_body: '-',
        other: '-',
        is_burned: false,
        reading_before_test: 0,
        reading_after_test: 0,
        ref_start_reading: 0,
        ref_end_reading: 0,
        error_percentage: 0,

        test_result: this.inferredTestResult(r),
        test_method: this.testMethod,
        test_status: this.testStatus,
        approver_id: this.approverId ?? null,
        report_type: this.report_type
      };
    });
}


  // modal
  openConfirm(action: ModalState['action'], payload?: any){
    if (action !== 'submit') { this.alertSuccess = null; this.alertError = null; }
    this.modal.action = action; this.modal.payload = payload;

    switch(action){
      case 'reload': this.modal.title='Reload Assigned Devices'; this.modal.message='Replace with latest assigned devices?'; break;
      case 'removeRow': this.modal.title='Remove Row'; this.modal.message=`Remove row #${(payload?.index ?? 0)+1}?`; break;
      case 'submit': this.modal.title='Submit Batch Certificate — Preview'; this.modal.message=''; break;
      default: this.modal.title=''; this.modal.message='';
    }
    this.modal.open = true;
  }
  closeModal(){ this.modal.open=false; this.modal.action=null; this.modal.payload=undefined; }

  confirmModal(){
    const a = this.modal.action, p = this.modal.payload;
    if (a !== 'submit') this.closeModal();
    if (a === 'reload') this.reloadAssigned(true);
    if (a === 'removeRow') this.removeRow(p?.index);
    if (a === 'submit') this.doSubmitBatch();
  }

  private doSubmitBatch(){
    const payload = this.buildPayloadForPreview();
    if (!payload.length){
      this.alertError = 'No valid rows to submit.';
      this.alertSuccess = null;
      return;
    }

    this.submitting = true;
    this.alertSuccess = null;
    this.alertError = null;

    this.api.postTestReports(payload).subscribe({
      next: () => {
        this.submitting = false;
        try { this.downloadPdf(); } catch(e){ console.error('PDF generation failed:', e); }
        this.alertSuccess = 'Batch Certificate submitted successfully!';
        this.alertError = null;
        this.rows = [ this.emptyRow() ];
        setTimeout(()=> this.closeModal(), 1200);
      },
      error: (err) => {
        this.submitting = false;
        this.alertSuccess = null;
        this.alertError = 'Error submitting certificate. Please verify fields and try again.';
        console.error(err);
      }
    });
  }

  // ================= PDF =================
private row2page(
  r: CertRow,
  meta: { zone: string; method: string; status: string }
): any[] {

  const headerBlock = {
    columns: [
      {
        width: '*',
        stack: [
          { text: 'OFFICE OF THE ASSISTANT ENGINEER (R.M.T.L.) M.T. DN.-I', alignment: 'center', bold: true, fontSize: 11 },
          { text: 'M.P.P.K.V.V.CO.LTD. INDORE', alignment: 'center', bold: true, margin: [0, 2, 0, 0], fontSize: 10 },
          { text: 'CERTIFICATE FOR A.C. SINGLE/THREE PHASE METER', alignment: 'center', margin: [0, 6, 0, 2], fontSize: 10 },
          { text: 'SOLAR GENERATOR METER TEST REPORT', style: 'hindiTitle', alignment: 'center', margin: [0, 4, 0, 0] },
        ],
      }
    ],
    columnGap: 12,
    margin: [0, 0, 0, 4],
  };

  const headerLine = {
    text: `DC/Zone: ${meta.zone}    •    Test Method: ${meta.method || '-'}    •    Test Status: ${meta.status || '-'}`,
    alignment: 'center',
    style: 'hdrSmall',
    margin: [0, 6, 0, 8],
  };

  const two = (label: string, value: any) => [
    { text: label, style: 'lbl' },
    { text: (value ?? '').toString(), style: 'val' },
  ];

  const mrText = `${r.mr_no ?? ''}${r.mr_no && r.mr_date ? '  DT  ' : ''}${r.mr_date ?? ''}`;

  const detailsTable = {
    style: 'tableTight',
    layout: 'lightHorizontalLines',
    table: {
      // Simple, compact 2-column table
      widths: [150, '*'],
      body: [
        two('Name of consumer', r.consumer_name),
        two('Address', r.address),
        two('Meter Make', r.meter_make),
        two('Meter Sr. No.', r.meter_sr_no),
        two('Meter Capacity', r.meter_capacity),
        two('Testing Fees Rs.', r.testing_fees),
        two('M.R. No & Date', mrText),
        two('Ref.', r.ref_no),
        two('Date of Testing', r.date_of_testing),
        two('Starting Reading', r.starting_reading),
        // Final readings in a single line to save space
        two('Final Reading', `R- ${r.final_reading_r ?? ''}    E- ${r.final_reading_e ?? ''}`),
        two('Difference', r.difference),
        two('Starting Current Test', r.starting_current_test),
        two('Creep Test', r.creep_test),
        two('Dial Test', r.dial_test),
        two('Remark', r.remark),
      ],
      // Keep rows on the same page (each cert is a page)
      dontBreakRows: true,
    },
    margin: [0, 6, 0, 6],
  };

  const sign = {
    columns: [
      {
        width: '*',
        alignment: 'center',
        stack: [
          { text: 'Tested by', style: 'footRole' },
          { text: '\n____________________________', alignment: 'center' },
          { text: 'TESTING ASSISTANT (RMTL)', style: 'footTiny' },
        ],
      },
      {
        width: '*',
        alignment: 'center',
        stack: [
          { text: 'Verified by', style: 'footRole' },
          { text: '\n____________________________', alignment: 'center' },
          { text: 'JUNIOR ENGINEER (RMTL)', style: 'footTiny' },
        ],
      },
      {
        width: '*',
        alignment: 'center',
        stack: [
          { text: 'Approved by', style: 'footRole' },
          { text: '\n____________________________', alignment: 'center' },
          { text: 'ASSISTANT ENGINEER (RMTL)', style: 'footTiny' },
        ],
      },
    ],
    margin: [0, 40, 0, 0],
  };

  // One certificate per page
  return [
    headerBlock,
    headerLine,
    detailsTable,
    sign,
    { text: '', pageBreak: 'after' },
  ];
}

private buildDoc(): TDocumentDefinitions {
  const pages: any[] = [];
  const meta = {
    zone: (this.header.location_code ? this.header.location_code + ' - ' : '') + (this.header.location_name || ''),
    method: this.testMethod || '',
    status: this.testStatus || '',
  };

  const data = this.rows.filter(r => (r.meter_sr_no || '').trim());
  data.forEach(r => pages.push(...this.row2page(r, meta)));

  return {
    pageSize: 'A4',
    pageMargins: [24, 22, 24, 28], // slightly tighter
    defaultStyle: { fontSize: 9, lineHeight: 1.05 }, // compact and readable
    styles: {
      lbl: { bold: true, fontSize: 9, color: '#111' },
      val: { fontSize: 9, color: '#111' },
      hindiTitle: { fontSize: 16, bold: true, color: '#111' },
      hdrSmall: { fontSize: 9, color: '#333' },
      tableTight: { fontSize: 9 },
      footRole: { fontSize: 9, bold: true },
      footTiny: { fontSize: 8, color: '#444' },
      lblRight: { fontSize: 8, color: '#444', alignment: 'right' },
      bigRight: { fontSize: 10, bold: true, alignment: 'right' },
    },
    content: pages,
    footer: (current: number, total: number) => ({
      columns: [
        { text: `Page ${current} of ${total}`, alignment: 'left', margin: [24, 0, 0, 0] },
        { text: 'M.P.P.K.V.V.CO. LTD., INDORE', alignment: 'right', margin: [0, 0, 24, 0] },
      ],
      fontSize: 8,
    }),
    info: { title: 'Solar_GENERATIONMETER_Certificate' },
  };
}


  private downloadPdf() {
    const doc = this.buildDoc();
    pdfMake.createPdf(doc).download('SOLAR_GENERATIONMETER_CERTIFICATES.pdf');
  }
}
