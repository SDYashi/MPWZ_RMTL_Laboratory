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
  // link back to assignment
  assignment_id?: number;
  device_id?: number;
  notFound?: boolean;

  // consumer + meter
  consumer_name: string;
  address: string;
  meter_make: string;
  meter_sr_no: string;
  meter_capacity: string;
  

  // certificate
  certificate_no?: string;
  date_of_testing?: string;

  // payments / refs
  testing_fees?: number;
  mr_no?: string;
  mr_date?: string;
  ref_no?: string;

  // readings
  starting_reading?: number;
  final_reading_r?: number;
  final_reading_e?: number;
  difference?: number;

  // tests + remark
  starting_current_test?: string;
  creep_test?: string;
  dial_test?: string;
  remark?: string;
  test_result?: string;
}

interface ModalState {
  open: boolean;
  title: string;
  action: 'submit' | null;
  payload?: any;
}

@Component({
  selector: 'app-rmtl-add-testreport-solarnetmeer',
  templateUrl: './rmtl-add-testreport-solarnetmeer.component.html',
  styleUrls: ['./rmtl-add-testreport-solarnetmeer.component.css']
})
export class RmtlAddTestreportSolarnetmeerComponent implements OnInit {

  // ======= Batch header =======
  header = { location_code: '', location_name: '' };
  test_methods: any[] = [];
  test_statuses: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;

  // ======= Assignment loading =======
  device_status: 'ASSIGNED' = 'ASSIGNED';
  currentUserId = 0;
  currentLabId  = 0;
  loading = false;

  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: number; assignment_id: number; }> = {};

  // ======= Table + UI =======
  filterText = '';
  rows: CertRow[] = [ this.emptyRow() ];

  // ======= Submit + modal =======
  submitting = false;
  modal: ModalState = { open: false, title: '', action: null };
  alertSuccess: string | null = null;
  alertError: string | null = null;
  office_types: any;
  commentby_testers: any;
  selectedSourceType: any;
  selectedSourceName: string = '';
  filteredSources: any;
  test_results: any;
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
        
      }
    });

    // prebuild serial index (no UI change)
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

  // ======= Computed chips in header =======
  get matchedCount(){ return (this.rows ?? []).filter(r => !!r.meter_sr_no && !r.notFound).length; }
  get unknownCount(){ return (this.rows ?? []).filter(r => !!r.notFound).length; }

  // ======= Assignment helpers =======
  private emptyRow(seed?: Partial<CertRow>): CertRow {
    return {
      _open: true,
      consumer_name: '',
      address: '',
      meter_make: '',
      meter_sr_no: '',
      meter_capacity: '',
      test_result: '',
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

  /** Load assigned meters and optionally replace table rows. */
  reloadAssigned(replaceRows: boolean = true) {
    this.loading = true;
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        this.rebuildSerialIndex(asg);

        // // set DC/Zone header from first device
        // const first = asg.find(a => a.device);
        // if (first?.device) {
        //   this.header.location_code = first.device.location_code ?? '';
        //   this.header.location_name = first.device.location_name ?? '';
        // }

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

  // ======= Table ops =======
  addRow() { this.rows.push(this.emptyRow()); }
  removeRow(i: number) { this.rows.splice(i, 1); if (!this.rows.length) this.rows.push(this.emptyRow()); }
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

  // ======= Submit flow =======
  private isoOn(dateStr?: string){ const d = dateStr? new Date(dateStr+'T10:00:00') : new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString(); }

  private buildPayload(): any[] {
    const zone = (this.header.location_code ? this.header.location_code + ' - ' : '') + (this.header.location_name || '');
    return (this.rows || [])
      .filter(r => (r.meter_sr_no || '').trim())
      .map(r => ({
        device_id: r.device_id ?? 0,
        assignment_id: r.assignment_id ?? 0,

        // timestamps from date_of_testing (fallback: today)
        start_datetime: this.isoOn(r.date_of_testing),
        end_datetime:   this.isoOn(r.date_of_testing),

        // header meta (optional for server)
        zone_or_dc: zone || null,
        test_method: this.testMethod || null,
        test_status: this.testStatus || null,

        // certificate details
        consumer_name: r.consumer_name || null,
        address: r.address || null,
        meter_make: r.meter_make || null,
        meter_sr_no: r.meter_sr_no || null,
        meter_capacity: r.meter_capacity || null,
        certificate_no: r.certificate_no || null,
        date_of_testing: r.date_of_testing || null,

        testing_fees: Number(r.testing_fees ?? 0),
        mr_no: r.mr_no || null,
        mr_date: r.mr_date || null,
        ref_no: r.ref_no || null,

        starting_reading: Number(r.starting_reading ?? 0),
        final_reading_r: Number(r.final_reading_r ?? 0),
        final_reading_e: Number(r.final_reading_e ?? 0),
        difference: Number(r.difference ?? 0),

        starting_current_test: r.starting_current_test || null,
        creep_test: r.creep_test || null,
        dial_test: r.dial_test || null,
        details: r.remark || null,
        test_result: r.test_result || null,
        report_type: 'SOLAR NETMETER'
      }));
  }

  openConfirm(action: 'submit', payload?: any){
    this.alertSuccess = null;
    this.alertError = null;
    this.modal.action = action;
    this.modal.payload = payload;
    this.modal.title = 'Submit Batch — Preview';
    this.modal.open = true;
  }

  closeModal(){
    this.modal.open = false;
    this.modal.action = null;
    this.modal.payload = undefined;
  }

  confirmModal(){
    if (this.modal.action === 'submit') this.doSubmit();
  }

  private doSubmit(){
    const payload = this.buildPayload();
    if (!payload.length){
      this.alertError = 'No valid rows to submit.';
      return;
    }

    // Optional: enforce a couple of basics
    const missingDt = payload.findIndex(p => !p.date_of_testing);
    if (missingDt !== -1){
      this.alertError = `Row #${missingDt+1} is missing Date of Testing.`;
      return;
    }

    this.submitting = true;
    this.alertSuccess = null;
    this.alertError = null;

    // Reuse your API method; adjust if your endpoint differs.
    this.api.postTestReports(payload).subscribe({
      next: () => {
        this.submitting = false;
        try { this.downloadPdf(); } catch(e){ console.error('PDF generation failed:', e); }
        this.alertSuccess = 'Batch submitted successfully!';
        this.rows = [ this.emptyRow() ];
        setTimeout(()=> this.closeModal(), 1200);
      },
      error: (e) => {
        console.error(e);
        this.submitting = false;
        this.alertError = 'Error submitting batch.';
      }
    });
  }

  // ================= PDF =================
  // private row2page(r: CertRow, meta: { zone: string; method: string; status: string }): any[] {
  //   const title = [
  //     { text: 'OFFICE OF THE ASSISTANT ENGINEER (R.M.T.L.) M.T. DN.-I', alignment: 'center', bold: true },
  //     { text: 'M.P.P.K.V.V.CO.LTD. INDORE', alignment: 'center', bold: true, margin: [0, 2, 0, 0] },
  //     { text: 'CERTIFICATE FOR A.C. SINGLE/THREE PHASE METER', alignment: 'center', margin: [0, 6, 0, 2] }, 
  //   ];

  //   const reporttypetitle = { text: 'SOLAR NET METER TEST REPORT', style: 'hindiTitle', fontSize: 48,  alignment: 'center', margin: [0, 6, 0, 2]  };
  //   const headerLine = { text: `DC/Zone: ${meta.zone}    •    Test Method: ${meta.method || '-' }    •    Test Status: ${meta.status || '-'}`, alignment: 'center', fontSize: 9, color: '#555', margin: [0, 0, 0, 6] };
  //   const hdrRight = r.certificate_no
  //     ? { text: r.certificate_no, alignment: 'right', margin: [0, 10, 0, 0] }
  //     : { text: '' };

  //   const two = (label: string, value: string | number | undefined) =>
  //     [{ text: label, style: 'lbl' }, { text: (value ?? '').toString(), colSpan: 2 }, {}];

  //   const threeFinal = [
  //     { text: 'Final Reading', style: 'lbl' },
  //     { text: `R- ${r.final_reading_r ?? ''}` },
  //     { text: `E- ${r.final_reading_e ?? ''}` }
  //   ];

  //   const mrLine = two('M.R. No & Date',
  //     `${r.mr_no ?? ''}${r.mr_no && r.mr_date ? '  DT  ' : ''}${r.mr_date ?? ''}`);

  //   const table = {
  //     layout: 'lightHorizontalLines',
  //     table: {
  //       widths: [140, '*', '*'],
  //       body: [
  //         two('Name of consumer', r.consumer_name),
  //         two('Address', r.address),
  //         two('Meter Make', r.meter_make),
  //         two('Meter Sr. No.', r.meter_sr_no),
  //         two('Meter Capacity', r.meter_capacity),
  //         two('Testing Fees Rs.', r.testing_fees),
  //         mrLine,
  //         two('Ref.', r.ref_no),
  //         two('Date of Testing', r.date_of_testing),
  //         two('Starting Reading', r.starting_reading),
  //         threeFinal,
  //         two('Difference', r.difference),
  //         two('Starting Current Test', r.starting_current_test),
  //         two('Creep Test', r.creep_test),
  //         two('Dial Test', r.dial_test),
  //         two('Remark', r.remark),
  //       ],
  //       margin: [0, 30, 0, 0]
  //     }
  //   };

  //   const sign = {
  //     columns: [
  //       { width: '*', text: '' },
  //       {
  //         width: '*',
  //         alignment: 'center',
  //         stack: [
  //           { text: 'Tested by', style: 'footRole' },
  //           { text: '\n\n____________________________', alignment: 'center' },
  //           { text: 'TESTING ASSISTANT (RMTL)', style: 'footTiny' },
  //         ],
  //       },
  //       {
  //         width: '*',
  //         alignment: 'center',
  //         stack: [
  //           { text: 'Verified by', style: 'footRole' },
  //           { text: '\n\n____________________________', alignment: 'center' },
  //           { text: 'JUNIOR ENGINEER (RMTL)', style: 'footTiny' },
  //         ],
  //       },
  //       {
  //         width: '*',
  //         alignment: 'center',
  //         stack: [
  //           { text: 'Approved by', style: 'footRole' },
  //           { text: '\n\n____________________________', alignment: 'center' },
  //           { text: 'ASSISTANT ENGINEER (RMTL)', style: 'footTiny' },
  //         ],
  //       },
  //     ],
  //     margin: [0, 8, 0, 0]
  //   };

  //   return [...title,reporttypetitle, headerLine, hdrRight, table, sign];
  // }
  //   private buildDoc(): TDocumentDefinitions {
  //   const pages: any[] = [];
  //   const meta = {
  //     zone: (this.header.location_code ? this.header.location_code + ' - ' : '') + (this.header.location_name || ''),
  //     method: this.testMethod || '',
  //     status: this.testStatus || ''
  //   };

  //   const data = this.rows.filter(r => (r.meter_sr_no || '').trim());
  //   data.forEach((r, i) => {
  //     pages.push(...this.row2page(r, meta));
  //     if (i < data.length - 1) pages.push({ text: '', pageBreak: 'after' });
  //   });

  //   return {
  //     pageSize: 'A4',
  //     pageMargins: [28, 28, 28, 36],
  //     defaultStyle: { fontSize: 10 },
  //     styles: { lbl: { bold: true } },
  //     content: pages,
  //     footer: (current: number, total: number) => ({
  //       columns: [
  //         { text: `Page ${current} of ${total}`, alignment: 'left', margin: [28, 0, 0, 0] },
  //         { text: 'M.P.P.K.V.V.CO. LTD., INDORE', alignment: 'right', margin: [0, 0, 28, 0] }
  //       ],
  //       fontSize: 8
  //     }),
  //     info: { title: 'Solar_NetMeter_Certificate' }
  //   };
  // }
 
// ====== NEW: small helper to draw the repeating PDF header (every page) ======
private pdfHeader(meta: { zone: string; method: string; status: string }) {
  // If you have a base64 logo, put it here (or keep null to hide):
  const labLogoBase64: string | null = null; // e.g. 'data:image/png;base64,iVBORw0KGgoAAA...'

  return {
    margin: [40, 16, 40, 6],
    stack: [
      {
        columns: [
          labLogoBase64
            ? { image: labLogoBase64, width: 46, height: 46, margin: [0, 0, 10, 0] }
            : { width: 16, text: '' },
          {
            width: '*',
            stack: [
              { text: 'MADHYAA PRADESH PASCHIM KHETRA VIDYUT VITARAN COMPANY LIMITED', bold: true, alignment: 'center', fontSize: 11 },
              { text: 'REMOTE METERING TESTING LABORATORY, INDORE', bold: true, alignment: 'center', fontSize: 11, margin: [0, 2, 0, 0] },
              { text: 'MPPKVVCL Near Conference Hall, Polo Ground, Indore – 452003 (MP)', alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0] },
              { text: 'Email: aermtlindore@gmail.com   |   Ph: 0731-29978514', alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0] },
            ]
          },
          { width: 16, text: '' }
        ]
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#c7c7c7' }],
        margin: [0, 2, 0, 0]
      },
      // Secondary line with batch meta (Zone/Method/Status)
      {
        text: `DC/Zone: ${meta.zone || '-'}    •    Test Method: ${meta.method || '-'}    •    Test Status: ${meta.status || '-'}`,
        alignment: 'center',
        fontSize: 9,
        color: '#555',
        margin: [0, 6, 0, 0]
      }
    ]
  };
}

// ====== UPDATED: certificate page builder (content only; header removed here) ======
private row2page(r: CertRow): any[] {
  const styles = {
    sectionHeader: { bold: true, fontSize: 12, margin: [0, 10, 0, 6], decoration: 'underline' },
    label: { bold: true, fillColor: '#f5f5f5', margin: [0, 2, 0, 2] },
    value: { margin: [0, 2, 0, 2] },
    footer: { fontSize: 9, italics: true }
  };

  const content: any[] = [];

  // Title for the certificate
  content.push(
    { text: 'SOLAR NET METER TEST REPORT', alignment: 'center', bold: true, fontSize: 14, margin: [0,5, 0, 0] },
  );

  if (r.certificate_no) {
    content.push({ text: `Certificate No: ${r.certificate_no}`, alignment: 'right', bold: true, margin: [0, 0, 0, 8] });
  }

  // 1) Consumer & Meter
  content.push(
    { text: 'Consumer & Meter Information', style: 'sectionHeader' },
    {
      table: {
        widths: ['30%', '70%'],
        body: [
          [{ text: 'Consumer Name', style: 'label' }, { text: r.consumer_name || '-', style: 'value' }],
          [{ text: 'Address', style: 'label' }, { text: r.address || '-', style: 'value' }],
          [{ text: 'Meter Make', style: 'label' }, { text: r.meter_make || '-', style: 'value' }],
          [{ text: 'Serial Number', style: 'label' }, { text: r.meter_sr_no || '-', style: 'value' }],
          [{ text: 'Capacity', style: 'label' }, { text: r.meter_capacity || '-', style: 'value' }],
        ]
      },
      layout: {
        defaultBorder: false,
        fillColor: (rowIndex: number) => (rowIndex % 2 === 0 ? '#f9f9f9' : null)
      },
      margin: [0, 0, 0, 12]
    }
  );

  // 2) Testing details
  content.push(
    { text: 'Testing Details', style: 'sectionHeader' },
    {
      table: {
        widths: ['30%', '35%', '35%'],
        body: [
          [{ text: 'Date of Testing', style: 'label' }, { text: r.date_of_testing || '-', style: 'value', colSpan: 2 }, {}],
          [{ text: 'Testing Fees', style: 'label' }, { text: r.testing_fees ? `₹${r.testing_fees}` : '-', style: 'value', colSpan: 2 }, {}],
          [{ text: 'M.R. Details', style: 'label' }, { text: `No: ${r.mr_no || '-'}`, style: 'value' }, { text: `Date: ${r.mr_date || '-'}`, style: 'value' }],
          [{ text: 'Reference No.', style: 'label' }, { text: r.ref_no || '-', style: 'value', colSpan: 2 }, {}],
        ]
      },
      layout: {
        defaultBorder: false,
        fillColor: (rowIndex: number) => (rowIndex % 2 === 0 ? '#f9f9f9' : null)
      },
      margin: [0, 0, 0, 12]
    }
  );

  // 3) Readings
  content.push(
    { text: 'Meter Readings', style: 'sectionHeader' },
    {
      table: {
        widths: ['30%', '23%', '23%', '24%'],
        body: [
          [{ text: 'Reading Type', style: 'label' }, { text: 'Value', style: 'label', alignment: 'center' }, { text: 'Final Reading', style: 'label', alignment: 'center', colSpan: 2 }, {}],
          [{ text: 'Starting Reading', style: 'label' }, { text: r.starting_reading ?? '-', style: 'value', alignment: 'center' }, { text: 'R:', style: 'label', alignment: 'right' }, { text: r.final_reading_r ?? '-', style: 'value', alignment: 'center' }],
          [{ text: 'Difference', style: 'label' }, { text: r.difference ?? '-', style: 'value', alignment: 'center' }, { text: 'E:', style: 'label', alignment: 'right' }, { text: r.final_reading_e ?? '-', style: 'value', alignment: 'center' }],
        ]
      },
      layout: {
        defaultBorder: false,
        fillColor: (rowIndex: number) => (rowIndex % 2 === 0 ? '#f9f9f9' : null)
      },
      margin: [0, 0, 0, 12]
    }
  );

  // 4) Test results
  content.push(
    { text: 'Test Results', style: 'sectionHeader' },
    {
      table: {
        widths: ['30%', '70%'],
        body: [
          [{ text: 'Starting Current Test', style: 'label' }, { text: r.starting_current_test || '-', style: 'value' }],
          [{ text: 'Creep Test', style: 'label' }, { text: r.creep_test || '-', style: 'value' }],
          [{ text: 'Dial Test', style: 'label' }, { text: r.dial_test || '-', style: 'value' }],
          [{ text: 'Overall Result', style: 'label' }, { text: r.test_result || '-', style: 'value', bold: true }],
          [{ text: 'Remarks', style: 'label' }, { text: r.remark || '-', style: 'value' }],
        ]
      },
      layout: {
        defaultBorder: false,
        fillColor: (rowIndex: number) => (rowIndex % 2 === 0 ? '#f9f9f9' : null)
      },
      margin: [0, 0, 0, 18]
    }
  );

  // 5) Signatures
  content.push({
    table: {
      widths: ['25%', '25%', '25%', '25%'],
      body: [
        [
          { text: 'Tested by', bold: true, alignment: 'center' },
          { text: 'Verified by', bold: true, alignment: 'center' },
          { text: 'Checked by', bold: true, alignment: 'center' },
          { text: 'Approved by', bold: true, alignment: 'center' }
        ],
        [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 1 }] },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 1 }] },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 1 }] },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 1 }] }
        ],
        [
          { text: 'Testing Assistant (RMTL)', style: 'footer', alignment: 'center' },
          { text: 'Junior Engineer (RMTL)', style: 'footer', alignment: 'center' },
          { text: 'Assistant Engineer (RMTL)', style: 'footer', alignment: 'center' },
          { text: 'Executive Engineer', style: 'footer', alignment: 'center' }
        ]
      ]
    },
    layout: 'noBorders'
  });

  return content;
}

// ====== UPDATED: buildDoc with repeating header & tidy footer ======
private buildDoc(): TDocumentDefinitions {
  const meta = {
    zone: (this.header.location_code ? this.header.location_code + ' - ' : '') + (this.header.location_name || ''),
    method: this.testMethod || '',
    status: this.testStatus || ''
  };

  const data = this.rows.filter(r => (r.meter_sr_no || '').trim());
  const content: any[] = [];

  // Optional: simple batch cover if multiple rows
  if (data.length > 1) {
    content.push(
      { text: 'SOLAR NET METER TEST REPORTS', alignment: 'center', bold: true, fontSize: 16, margin: [0, 140, 0, 10] },
      { text: `Batch Summary • Generated on ${new Date().toLocaleDateString()}`, alignment: 'center', fontSize: 10, margin: [0, 0, 0, 16] },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', '*'],
          body: [
            [{ text: 'Serial Number', bold: true }, { text: 'Consumer Name', bold: true }, { text: 'Result', bold: true }],
            ...data.map(r => [r.meter_sr_no || '-', r.consumer_name || '-', r.test_result || '-'])
          ]
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#e9edf5' : rowIndex % 2 === 0 ? '#fafafa' : null)
        }
      },
      { text: '', pageBreak: 'after' }
    );
  }

  // Individual certificates
  data.forEach((r, i) => {
    content.push(...this.row2page(r));
    if (i < data.length - 1) content.push({ text: '', pageBreak: 'after' });
  });

  return {
    pageSize: 'A4',
    pageMargins: [40, 110, 40, 60], // extra top space for repeating header
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    header: () => this.pdfHeader(meta), // <— repeating header here
    footer: (currentPage: number, pageCount: number) => ({
      margin: [40, 0, 40, 8],
      columns: [
        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'left', fontSize: 9, color: '#666' },
        { text: 'MPPKVVCL • RMTL Indore', alignment: 'right', fontSize: 9, color: '#666' }
      ]
    }),
    info: {
      title: 'Solar_NetMeter_Certificate',
      author: 'MPPKVVCL Indore',
      subject: 'Solar Net Meter Test Report'
    },
    content
  };
}

downloadPdf() {
  const doc = this.buildDoc();
  pdfMake.createPdf(doc).download('SOLAR_NETMETER_CERTIFICATES.pdf');
}

}
