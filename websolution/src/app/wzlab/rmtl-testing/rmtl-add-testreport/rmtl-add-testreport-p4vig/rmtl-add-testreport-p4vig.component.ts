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

interface Row {
  // main
  serial: string;
  make: string;
  capacity: string;
  removal_reading?: number;
  test_result?: string;

  // top sheet
  consumer_name?: string;
  address?: string;
  account_number?: string;
  division_zone?: string;
  panchanama_no?: string;
  panchanama_date?: string;
  condition_at_removal?: string;

  // rmtl
  testing_date?: string;
  is_burned: boolean;
  seal_status: string;
  meter_glass_cover: string;
  terminal_block: string;
  meter_body: string;
  other: string;

  reading_before_test?: number;
  reading_after_test?: number;
  rsm_kwh?: number;
  meter_kwh?: number;
  error_percentage?: number;
  starting_current_test?: string;
  creep_test?: string;

  remark?: string;

  // assignment
  assignment_id?: number;
  device_id?: number;
  notFound?: boolean;

  _open?: boolean;
}

interface ModalState {
  open: boolean;
  title: string;
  message?: string;
  action: 'submit' | null;
  payload?: any;
}

@Component({
  selector: 'app-rmtl-add-testreport-p4vig',
  templateUrl: './rmtl-add-testreport-p4vig.component.html',
  styleUrls: ['./rmtl-add-testreport-p4vig.component.css']
})
export class RmtlAddTestreportP4vigComponent implements OnInit {

  // ===== batch header =====
  header = { location_code: '', location_name: '' };
  test_methods: any[] = [];
  test_statuses: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;

  // ===== enums for condition pickers =====
  seal_statuses: any[] = [];
  glass_covers: any[] = [];
  terminal_blocks: any[] = [];
  meter_bodies: any[] = [];

  // ===== assignment =====
  device_status: 'ASSIGNED' = 'ASSIGNED';
  currentUserId = 0;
  currentLabId  = 0;
  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: number; assignment_id: number; }> = {};
  loading = false;

  // ===== table =====
  filterText = '';
  rows: Row[] = [ this.emptyRow() ];

  // ===== source lookup =====
  office_types: any;
  selectedSourceType: any;
  selectedSourceName: string = '';
  filteredSources: any;

  // ===== submit + modal state =====
  submitting = false;
  modal: ModalState = { open: false, title: '', action: null };
  alertSuccess: string | null = null;
  alertError: string | null = null;
  testResults: any;
  commentby_testers: any;
  meta: any
  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    this.currentLabId  = Number(localStorage.getItem('currentLabId') || 0);

    this.api.getEnums().subscribe({
      next: (d) => {
        this.test_methods   = d?.test_methods || [];
        this.test_statuses  = d?.test_statuses || [];
        this.seal_statuses  = d?.seal_statuses || [];
        this.glass_covers   = d?.glass_covers || [];
        this.terminal_blocks= d?.terminal_blocks || [];
        this.meter_bodies   = d?.meter_bodies || [];
        this.office_types   = d?.office_types || [];
        this.testResults    = d?.test_results || [];
        this.commentby_testers = d?.commentby_testers || [];
      }
    });

    // build index without altering UI
    this.reloadAssigned(false);
  }

  // ---------- Source fetch ----------
  fetchButtonData(): void {
    // FIX: validate both type and name
    if (!this.selectedSourceType || !this.selectedSourceName) {
      alert('Missing Input');
      return;
    }
    this.api.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
      next: (data) => {
        this.filteredSources = data;
        this.header.location_name = this.filteredSources?.name ?? '';
        this.header.location_code = this.filteredSources?.code ?? '';
      },
      error: () => alert('Failed to fetch source details. Check the code and try again.')
    });
  }

  onSourceTypeChange(): void {
    this.selectedSourceName = '';
    this.filteredSources = [];
  }

  // ===== derived counters =====
  get matchedCount(){ return (this.rows ?? []).filter(r => !!r.serial && !r.notFound).length; }
  get unknownCount(){ return (this.rows ?? []).filter(r => !!r.notFound).length; }

  // ===== helpers =====
  private emptyRow(seed?: Partial<Row>): Row {
    return {
      serial: '', make: '', capacity: '',
      is_burned: false, seal_status: '', meter_glass_cover: '', terminal_block: '', meter_body: '',
      other: '', _open: false, ...seed
    };
  }
  addRow(){ this.rows.push(this.emptyRow({ _open: true })); }
  removeRow(i:number){ this.rows.splice(i,1); if (!this.rows.length) this.addRow(); }
  trackByRow(i:number, r:Row){ return `${r.assignment_id || 0}_${r.device_id || 0}_${r.serial || ''}_${i}`; }

  displayRows(): Row[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter(r =>
      (r.serial || '').toLowerCase().includes(q) ||
      (r.make || '').toLowerCase().includes(q) ||
      (r.capacity || '').toLowerCase().includes(q) ||
      (r.consumer_name || '').toLowerCase().includes(q));
  }

  // ===== assignment =====
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

  reloadAssigned(replaceRows:boolean=true) {
    this.loading = true;
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data:any) => {
        const asg:AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        this.rebuildSerialIndex(asg);

        const first = asg.find(a=>a.device);
        if (first?.device){
          this.header.location_code = first.device.location_code ?? '';
          this.header.location_name = first.device.location_name ?? '';
        }

        if (replaceRows){
          this.rows = asg.map(a=>{
            const d = a.device || ({} as MeterDevice);
            return this.emptyRow({
              serial: d.serial_number || '',
              make: d.make || '',
              capacity: d.capacity || '',
              assignment_id: a.id ?? 0,
              device_id: d.id ?? a.device_id ?? 0,
              _open: false, notFound:false
            });
          });
          if (!this.rows.length) this.addRow();
        }
        this.loading = false;
      },
      error: ()=>{ this.loading=false; }
    });
  }

  onSerialChanged(i:number, serial:string){
    const key = (serial || '').toUpperCase().trim();
    const row = this.rows[i];
    const hit = this.serialIndex[key];
    if (hit){
      row.make = hit.make || '';
      row.capacity = hit.capacity || '';
      row.device_id = hit.device_id || 0;
      row.assignment_id = hit.assignment_id || 0;
      row.notFound = false;
    } else {
      row.make = ''; row.capacity = ''; row.device_id = 0; row.assignment_id = 0; row.notFound = key.length>0;
    }
  }

  // ===== payload / submit =====
  private isoOn(dateStr?: string){ const d = dateStr? new Date(dateStr+'T10:00:00') : new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString(); }

  private buildPayload(): any[] {
    // Choose a sensible timestamp; for contested we’ll use testing_date (or today if blank)
    return (this.rows||[])
      .filter(r => (r.serial||'').trim())
      .map(r => ({
        device_id: r.device_id ?? 0,
        assignment_id: r.assignment_id ?? 0,

        // testing window
        start_datetime: this.isoOn(r.testing_date),
        end_datetime: this.isoOn(r.testing_date),

        // lab condition fields
        is_burned: !!r.is_burned,
        seal_status: r.seal_status || '-',
        meter_glass_cover: r.meter_glass_cover || '-',
        terminal_block: r.terminal_block || '-',
        meter_body: r.meter_body || '-',
        other: r.other || '-',

        // readings
        reading_before_test: Number(r.reading_before_test) || 0,
        reading_after_test: Number(r.reading_after_test) || 0,
        rsm_kwh: Number(r.rsm_kwh) || 0,
        meter_kwh: Number(r.meter_kwh) || 0,
        error_percentage: Number(r.error_percentage) || 0,

        // results & meta
        test_result: r.test_result || undefined,
        test_method: this.testMethod || null,
        test_status: this.testStatus || null,

        // contested top sheet (stored for record)
        consumer_name: r.consumer_name || null,
        address: r.address || null,
        account_number: r.account_number || null,
        division_zone: r.division_zone || this.filteredSources.division_zone || null,
        panchanama_no: r.panchanama_no || null,
        panchanama_date: r.panchanama_date || null,
        condition_at_removal: r.condition_at_removal || null,
        removal_reading: Number(r.removal_reading) || 0,

        // free remark
        details: r.remark || null,

        // explicitly mark report type (server can branch if needed)
        report_type: 'P4_VIG'
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
    const missingIdx = payload.findIndex(p => !p.test_result);
    if (missingIdx !== -1){
      this.alertError = `Row #${missingIdx+1} is missing Test Result (OK/DEF/PASS/FAIL).`;
      return;
    }

    this.submitting = true;
    this.alertSuccess = null;
    this.alertError = null;

    // 🔗 Post to your existing endpoint. Change the method/name if your service differs.
    this.api.postTestReports(payload).subscribe({
      next: () => {
        this.submitting = false;
        // auto-generate/download PDF after successful save
        try { this.downloadPdf(); } catch(e){ console.error('PDF generation failed:', e); }
        this.alertSuccess = 'Batch submitted successfully!';
        // clear and close after a short delay
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

  // ===== PDF (unchanged except meta computed from header/method/status) =====
  private dotted(n=10){ return '·'.repeat(n); }

  private pageForRow(r:Row, meta:{zone:string, method:string, status:string}): any[] {
    const title = [
      { text: 'MADHYA PRADESH PASCHIM KSHETRA VIDHYUT VITRAN CO. LTD., POLOGROUND INDORE', alignment:'center', bold:true },
      { text: 'TEST RESULT FOR CONTESTED METER', alignment:'center', margin:[0,4,0,6] },
      { text: `DC/Zone: ${meta.zone}    •    Test Method: ${meta.method || '-' }    •    Test Status: ${meta.status || '-'}`,
        alignment:'center', fontSize:9, color:'#555', margin:[0,0,0,8] }
    ];

    const two = (label:string, value:any)=> ([{text:label, style:'lbl'}, {text:(value ?? '').toString()}]);

    const topInfo = {
      layout:'lightHorizontalLines',
      table:{
        widths:[210,'*'],
        body:[
          two('1. NAME OF CONSUMER', r.consumer_name),
          two('2. ADDRESS', r.address),
          two('3. ACCOUNT NUMBER', r.account_number),
          two('4. NAME OF DIVISION/ZONE', r.division_zone),
          two('5. PANCHANAMA NO. & DATE', `${r.panchanama_no || ''}${r.panchanama_no && r.panchanama_date ? '   Dt ' : ''}${r.panchanama_date || ''}`),
          two('6. METER CONDITION AS NOTED AT THE TIME OF REMOVAL', r.condition_at_removal),
        ]
      }
    };

    const detailMeter = {
      layout:'lightHorizontalLines',
      margin:[0,6,0,0],
      table:{
        widths:['*','*','*','*'],
        body:[
          [{text:'METER NO.', style:'lbl'}, {text:'MAKE', style:'lbl'}, {text:'CAPACITY', style:'lbl'}, {text:'READING', style:'lbl'}],
          [r.serial || '', r.make || '', r.capacity || '', (r.removal_reading ?? '').toString()]
        ]
      }
    };

    const rmtlHead = { text:'TO BE FILLED BY TESTING SECTION LABORATORY (RMTL)', alignment:'center', bold:true, margin:[0,8,0,4] };

    const physTable = {
      layout:'lightHorizontalLines',
      table:{
        widths:[210,'*'],
        body:[
          two('1. DATE OF TESTING', r.testing_date),
          two('2A) WHETHER FOUND BURNT', r.is_burned ? 'YES' : 'NO'),
          two('2B) METER BODY SEAL', r.seal_status),
          two('2C) METER GLASS', r.meter_glass_cover),
          two('2D) TERMINAL BLOCK', r.terminal_block),
          two('2E) METER BODY COVER', r.meter_body),
          two('2F) ANY OTHER', r.other),
        ]
      }
    };

    const beforeAfter = {
      layout:'lightHorizontalLines',
      margin:[0,6,0,0],
      table:{
        widths:['*','*','*','*','*'],
        body:[
          [
            {text:'KWH RECORDED BY RSS/RSM', style:'lbl'},
            {text:'KWH RECORDED BY METER', style:'lbl'},
            {text:'% ERROR', style:'lbl'},
            {text:'STARTING CURRENT TEST', style:'lbl'},
            {text:'CREEP TEST', style:'lbl'}
          ],
          [
            (r.rsm_kwh ?? '').toString(),
            (r.meter_kwh ?? '').toString(),
            (r.error_percentage ?? '').toString(),
            r.starting_current_test || '',
            r.creep_test || ''
          ]
        ]
      }
    };

    const readFound = {
      layout:'lightHorizontalLines',
      margin:[0,6,0,0],
      table:{
        widths:['*','*'],
        body:[
          [{text:'READING AS FOUND — BEFORE TEST', style:'lbl'}, {text:'AFTER TEST', style:'lbl'}],
          [(r.reading_before_test ?? '').toString(), (r.reading_after_test ?? '').toString()]
        ]
      }
    };

    const testRes = {
      margin:[0,6,0,0],
      text:`4. TEST RESULT : ${r.test_result || this.dotted(15)}`
    };

    const remark = {
      margin:[0,8,0,0],
      stack:[
        { text:'REMARKS', style:'lbl' },
        { text: r.remark || '', margin:[0,4,0,0] }
      ]
    };

    const sign = {
      margin:[0,14,0,0],
      columns:[
              {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Tested by', style: 'footRole' },
              { text: '\n\n____________________________', alignment: 'center' },
              { text: 'TESTING ASSISTANT (RMTL)', style: 'footTiny' },
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'Verified by', style: 'footRole' },
              { text: '\n\n____________________________', alignment: 'center' },
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
      ]
    };

    return [ ...title, topInfo, detailMeter, rmtlHead, physTable, readFound, beforeAfter, testRes, remark, sign ];
  }

  private buildDoc(): TDocumentDefinitions {
    const zone = (this.header.location_code ? this.header.location_code + ' - ' : '') + (this.header.location_name || '');
    const meta = { zone, method: this.testMethod || '', status: this.testStatus || '' };

    const content:any[] = [];
    const data = this.rows.filter(r => (r.serial || '').trim());
    data.forEach((r, idx) => {
      content.push(...this.pageForRow(r, meta));
      if (idx < data.length-1) content.push({ text:'', pageBreak:'after' });
    });

    return {
      pageSize:'A4',
      pageMargins:[28,28,28,36],
      defaultStyle:{ fontSize:10 },
      styles:{ lbl:{ bold:true } },
      content,
      footer: (current:number,total:number)=>({
        columns:[
          { text:`Page ${current} of ${total}`, alignment:'left', margin:[28,0,0,0] },
          { text:'M.P.P.K.V.V.CO. LTD., INDORE', alignment:'right', margin:[0,0,28,0] }
        ],
        fontSize:8
      }),
      info:{ title:'P4_VIG_Contested_Report' }
    };
  }

  downloadPdf(){
    const doc = this.buildDoc();
    pdfMake.createPdf(doc).download('P4_VIG_CONTESTED_REPORTS.pdf');
  }
}
