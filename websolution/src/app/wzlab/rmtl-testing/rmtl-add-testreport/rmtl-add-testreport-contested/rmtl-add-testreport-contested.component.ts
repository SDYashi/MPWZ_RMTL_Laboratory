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
  phase?: string;
  location_code?: string | null;
  location_name?: string | null;
}
interface AssignmentItem { id: number; device_id: number; device?: MeterDevice | null; }

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

  // AE/JE Zone sheet
  form_no?: string;
  form_date?: string;
  consumer_name?: string;
  account_no_ivrs?: string;
  address?: string;
  contested_by?: string;
  payment_particulars?: string;
  receipt_no?: string;
  receipt_date?: string;
  condition_at_removal?: string;
  removal_reading?: number;

  // RMTL section
  testing_date?: string;
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

  rsm_kwh?: number;
  meter_kwh?: number;
  starting_current_test?: string;
  creep_test?: string;

  _open?: boolean;
}
interface ModalState {
  open: boolean; title: string; message: string;
  action: 'clear' | 'reload' | 'removeRow' | 'submit' | null | string[]; payload?: any;
}

@Component({
  selector: 'app-rmtl-add-testreport-contested',
  templateUrl: './rmtl-add-testreport-contested.component.html',
  styleUrls: ['./rmtl-add-testreport-contested.component.css']
})
export class RmtlAddTestreportContestedComponent implements OnInit {
  // enums/options
  device_status: 'ASSIGNED' = 'ASSIGNED';
  comment_bytester: any[] = [];
  test_methods: any[] = [];
  test_statuses: any[] = [];

  // header + rows
  batch = { header: { zone: '', phase: '', date: '', location_code: '', location_name: '' }, rows: [] as DeviceRow[] };

  // ids
  currentUserId = 0; currentLabId = 0;

  // ui state
  filterText = ''; loading = false; submitting = false;
  modal: ModalState = { open: false, title: '', message: '', action: null };
  alertSuccess: string | null = null; alertError: string | null = null;
  payload: any[] = []; testMethod: string | null = null; testStatus: string | null = null;
  approverId: number | null = null;

  physical_conditions: any[] = []; seal_statuses: any[] = []; glass_covers: any[] = [];
  terminal_blocks: any[] = []; meter_bodies: any[] = []; makes: any[] = []; capacities: any[] = [];
  test_results: any[] = []; report_type = 'CONTESTED';

  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: number; assignment_id: number; phase?: string; }> = {};
  phases: any;
  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    this.batch.header.date = this.toYMD(new Date());
    this.api.getEnums().subscribe({
      next: (d) => {
        this.device_status = (d?.device_status as 'ASSIGNED') ?? 'ASSIGNED';
        this.comment_bytester = d?.commentby_testers || [];
        this.test_results = d?.test_results || [];
        this.test_methods = d?.test_methods || [];
        this.test_statuses = d?.test_statuses || [];
        this.physical_conditions = d?.physical_conditions || [];
        this.seal_statuses = d?.seal_statuses || [];
        this.glass_covers = d?.glass_covers || [];
        this.terminal_blocks = d?.terminal_blocks || [];
        this.meter_bodies = d?.meter_bodies || [];
        this.makes = d?.makes || [];
        this.capacities = d?.capacities || [];
        this.report_type = d?.test_report_types?.CONTESTED || 'CONTESTED';
        this.phases=d?.phases || [];
      }
    });
    this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    this.currentLabId  = Number(localStorage.getItem('currentLabId') || 0);
    this.doReloadAssignedWithoutAddingRows();
  }

  get totalCount(){ return this.batch?.rows?.length ?? 0; }
  get matchedCount(){ return (this.batch?.rows ?? []).filter(r => !!r.serial && !r.notFound).length; }
  get unknownCount(){ return (this.batch?.rows ?? []).filter(r => !!r.notFound).length; }

  private rebuildSerialIndex(asg: AssignmentItem[]): void {
    this.serialIndex = {};
    for (const a of asg) {
      const d = a?.device ?? null;
      const s = (d?.serial_number || '').toUpperCase().trim();
      if (!s) continue;
      this.serialIndex[s] = { make: d?.make || '', capacity: d?.capacity || '', device_id: d?.id ?? a.device_id ?? 0, assignment_id: a?.id ?? 0, phase: d?.phase || '' };
    }
  }

  doReloadAssigned(): void {
    this.loading = true;
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        this.rebuildSerialIndex(asg);
        this.batch.rows = asg.map(a => {
          const d = a.device || ({} as MeterDevice);
          return this.emptyRow({ serial: d.serial_number || '', make: d.make || '', capacity: d.capacity || '', device_id: d.id ?? a.device_id ?? 0, assignment_id: a.id ?? 0, notFound: false });
        });
        if (!this.batch.rows.length) this.addBatchRow();
        if (!this.batch.header.phase) {
          const uniq = new Set(asg.map(a => (a.device?.phase || '').toUpperCase()).filter(Boolean));
          this.batch.header.phase = uniq.size === 1 ? [...uniq][0] : '';
        }
        const first = asg.find(a => a.device);
        if (first?.device) {
          this.batch.header.location_code = first.device.location_code ?? '';
          this.batch.header.location_name = first.device.location_name ?? '';
        }
        this.loading = false;
      },
      error: () => { this.batch.rows = [this.emptyRow()]; this.loading = false; }
    });
  }

  private loadDataWithoutAddingRows(asg: AssignmentItem[]): void { this.rebuildSerialIndex(asg); }
  doReloadAssignedWithoutAddingRows(): void {
    this.loading = true;
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        this.loadDataWithoutAddingRows(asg);
        const first = asg.find(a => a.device);
        if (first?.device) {
          this.batch.header.location_code = first.device.location_code ?? '';
          this.batch.header.location_name = first.device.location_name ?? '';
        }
        if (!this.batch.header.phase) {
          const uniq = new Set(asg.map(a => (a.device?.phase || '').toUpperCase()).filter(Boolean));
          this.batch.header.phase = uniq.size === 1 ? [...uniq][0] : '';
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private emptyRow(seed?: Partial<DeviceRow>): DeviceRow {
    return {
      serial: '', make: '', capacity: '', remark: '', test_result: undefined, test_method: 'MANUAL',
      device_id: 0, assignment_id: 0, notFound: false,

      form_no: '', form_date: '',
      consumer_name: '', account_no_ivrs: '', address: '', contested_by: '', payment_particulars: '',
      receipt_no: '', receipt_date: '', condition_at_removal: '', removal_reading: undefined,

      testing_date: '', physical_condition_of_device: '', seal_status: '', meter_glass_cover: '',
      terminal_block: '', meter_body: '', other: '', is_burned: false,

      reading_before_test: 0, reading_after_test: 0, ref_start_reading: 0, ref_end_reading: 0, error_percentage: 0,
      rsm_kwh: undefined, meter_kwh: undefined, starting_current_test: '', creep_test: '',
      _open: false, ...seed
    };
  }

  addBatchRow(){ this.batch.rows.push(this.emptyRow()); }
  private doRemoveRow(i: number){ this.batch.rows.splice(i,1); }
  private doClearRows(){ this.batch.rows = []; this.addBatchRow(); }

  onSerialChanged(i: number, serial: string){
    const key = (serial || '').toUpperCase().trim();
    const row = this.batch.rows[i]; const hit = this.serialIndex[key];
    if (hit){
      row.make = hit.make || ''; row.capacity = hit.capacity || '';
      row.device_id = hit.device_id || 0; row.assignment_id = hit.assignment_id || 0; row.notFound = false;
      if (!this.batch.header.phase && hit.phase){ this.batch.header.phase = (hit.phase || '').toUpperCase(); }
    } else {
      row.make=''; row.capacity=''; row.device_id=0; row.assignment_id=0; row.notFound = key.length>0;
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
  trackRow(i:number, r:DeviceRow){ return `${r.assignment_id||0}_${r.device_id||0}_${r.serial||''}_${i}`; }

  // helpers
  private toYMD(d: Date){ const dt = new Date(d.getTime() - d.getTimezoneOffset()*60000); return dt.toISOString().slice(0,10); }
  private isoOn(dateStr?: string){ const d = dateStr? new Date(dateStr+'T10:00:00') : new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString(); }

  private buildPayloadForPreview(): any[] {
    const when = this.isoOn(this.batch.header.date);
    return (this.batch.rows||[]).filter(r => (r.serial||'').trim()).map(r => ({
      device_id: r.device_id ?? 0, assignment_id: r.assignment_id ?? 0,
      start_datetime: when, end_datetime: when,
      physical_condition_of_device: r.physical_condition_of_device || '-', seal_status: r.seal_status || '-',
      meter_glass_cover: r.meter_glass_cover || '-', terminal_block: r.terminal_block || '-',
      meter_body: r.meter_body || '-', other: r.other || '-', is_burned: !!r.is_burned,
      reading_before_test: Number(r.reading_before_test)||0, reading_after_test: Number(r.reading_after_test)||0,
      ref_start_reading: Number(r.ref_start_reading)||0, ref_end_reading: Number(r.ref_end_reading)||0,
      error_percentage: Number(r.error_percentage)||0,
      details: r.device_id ?? 0, test_result: (r.test_result as string) || undefined,
      test_method: this.testMethod, test_status: this.testStatus, approver_id: this.approverId ?? null,
      report_type: this.report_type || 'CONTESTED',
    }));
  }

  private doSubmitBatch(): void {
    this.payload = this.buildPayloadForPreview();
    if (!this.payload.length){ this.alertError='No valid rows to submit.'; this.alertSuccess=null; return; }
    const missing = this.payload.findIndex(p => !p.test_result);
    if (missing!==-1){ this.alertError = `Row #${missing+1} is missing Test Result (PASS/FAIL).`; this.alertSuccess=null; return; }

    this.submitting = true; this.alertSuccess=null; this.alertError=null;
    this.api.postTestReports(this.payload).subscribe({
      next: () => {
        this.submitting = false;
        try { this.downloadContestedPdfFromBatch(); } catch(e){ console.error('PDF generation failed:', e); }
        this.alertSuccess = 'Batch Report submitted successfully!'; this.alertError=null;
        this.batch.rows = [this.emptyRow()]; setTimeout(()=>this.closeModal(),1200);
      },
      error: (e) => { this.submitting=false; this.alertSuccess=null; this.alertError='Error submitting report.'; console.error(e); }
    });
  }

  openConfirm(action: ModalState['action'], payload?: any){
    if (action!=='submit'){ this.alertSuccess=null; this.alertError=null; }
    this.modal.action = action; this.modal.payload = payload;
    switch(action){
      case 'reload': this.modal.title='Reload Assigned Devices'; this.modal.message='Replace with latest assigned devices?'; break;
      case 'removeRow': this.modal.title='Remove Row'; this.modal.message=`Remove row #${(payload?.index ?? 0)+1}?`; break;
      case 'clear': this.modal.title='Clear All Rows'; this.modal.message='Clear all rows and leave one empty row?'; break;
      case 'submit': this.payload=this.buildPayloadForPreview(); this.modal.title='Submit Batch Report — Preview'; this.modal.message=''; break;
      default: this.modal.title=''; this.modal.message='';
    }
    this.modal.open = true;
  }
  closeModal(){ this.modal.open=false; this.modal.action=null; this.modal.payload=undefined; }
  confirmModal(){ const a=this.modal.action, p=this.modal.payload; if(a!=='submit') this.closeModal(); if(a==='reload') this.doReloadAssigned(); if(a==='removeRow') this.doRemoveRow(p?.index); if(a==='clear') this.doClearRows(); if(a==='submit') this.doSubmitBatch(); }

  // ===== PDF: sheet layout (one page per meter) =====
  private buildPrintableSnapshot(){
    const rows = (this.batch.rows||[]).filter(r=> (r.serial||'').trim()).map(r=>({
      ...r,
      testing_date: r.testing_date || this.batch.header.date,
    }));
    const meta = {
      zone: (this.batch.header.location_code ? this.batch.header.location_code + ' - ' : '') + (this.batch.header.location_name || ''),
      date: this.batch.header.date || this.toYMD(new Date()),
    };
    return { rows, meta };
  }

  private dotted(n=20){ return '·'.repeat(n); }

  private pageForRow(r:any, meta:any): any[] {
    const topTitle = { text: 'OFFICE OF AE/JE MPPKVVCo.Ltd Zone', alignment: 'center', bold: true, margin: [0,0,0,6] };
    const topLine = {
      columns: [
        { text: `NO ${r.form_no || this.dotted(20)}` },
        { text: `DATE ${r.form_date || meta.date}`, alignment: 'right' },       
      ],
      margin: [0,0,0,6]
    };
    const reporttypetitle = { text: 'CONTTESTED METER TEST REPORT', style: 'hindiTitle', margin: [0,0,0,4] };

    const slip = {
      layout: 'lightHorizontalLines',
      table: {
        widths: ['auto','*'],
        body: [
          [{text:'Name of Consumer', bold:true}, r.consumer_name || '' ],
          [{text:'Account No / IVRS No.', bold:true}, r.account_no_ivrs || '' ],
          [{text:'Address', bold:true}, r.address || '' ],
          [{text:'Contested Meter by Consumer/Zone', bold:true}, r.contested_by || '' ],
          [{text:'Particular of payment of Testing Charges', bold:true}, r.payment_particulars || '' ],
          [{text:'Receipt No and Date', bold:true}, `${r.receipt_no || ''}    ${r.receipt_date || ''}` ],
          [{text:'Meter Condition as noted at the time of removal', bold:true}, r.condition_at_removal || '' ],
        ]
      }
    };

    const slipMeter = {
      layout: 'noBorders',
      margin: [0,6,0,0],
      table: {
        widths: ['*','*','*','*'],
        body: [
          [{text:'Meter No.',bold:true},{text:'Make',bold:true},{text:'Capacity',bold:true},{text:'Reading',bold:true}],
          [r.serial || this.dotted(15), r.make || this.dotted(12), r.capacity || this.dotted(12), (r.removal_reading ?? '') || this.dotted(12)]
        ]
      }
    };

    const slipSign = { text: 'JE/AE   MPPKVVCo.ltd', alignment: 'right', margin:[0,2,0,8], italics:true, fontSize:9 };

    const midHeads = [
      { text:'REGIONAL METER TESTING LABORATORY, INDORE', alignment:'center', bold:true },
      { text:'MADHYA PRADESH PASCHIM KSHETRA VIDYUT VITARAN CO. LTD.', alignment:'center', fontSize:9, margin:[0,1,0,0]},
      { text:'To Filled By Testing Section Laboratory (RMTL)', alignment:'center', margin:[0,2,0,6] }
    ];

    const rmtlGrid = {
      layout:'lightHorizontalLines',
      table:{
        widths:['auto','*'],
        body:[
          [{text:'Date of Testing',bold:true}, r.testing_date || meta.date],
          [{text:'Physical Condition of Meter',bold:true}, r.physical_condition_of_device || '' ],
          [{text:'Whether found Burnt',bold:true}, (r.is_burned ? 'YES' : 'NO')],
          [{text:'Meter Body Seal',bold:true}, r.seal_status || '' ],
          [{text:'Meter Glass Cover',bold:true}, r.meter_glass_cover || '' ],
          [{text:'Terminal Block',bold:true}, r.terminal_block || '' ],
          [{text:'Meter Body',bold:true}, r.meter_body || '' ],
          [{text:'Any Other',bold:true}, r.other || '' ],
          // Before/After row below to match image
          [{text:'Before Test',bold:true}, (r.reading_before_test ?? '').toString()],
          [{text:'After Test',bold:true}, (r.reading_after_test ?? '').toString()],
        ]
      },
      margin:[0,0,0,6]
    };

    const remarkLines = {
      margin:[0,6,0,0],
      stack:[
        { text:'Remark:-', bold:true, margin:[0,0,0,2] },
        { canvas:[ {type:'line', x1:0, y1:0, x2:540, y2:0, lineWidth:0.5},
                   {type:'line', x1:0, y1:10, x2:540, y2:10, lineWidth:0.5},
                   {type:'line', x1:0, y1:20, x2:540, y2:20, lineWidth:0.5} ],
          margin:[0,2,0,0] }
      ]
    };

    const dialLine = {
      margin:[0,8,0,0],
      text:
        `Dial Test KWH Recorded by RSM Meter ${r.rsm_kwh ?? this.dotted(10)}  / KWH Recorded by meter ${r.meter_kwh ?? this.dotted(10)}  ,Over all`,
      fontSize:10
    };

    const errorLine = {
      margin:[0,4,0,0],
      text:
        `% Error ${ (r.error_percentage ?? this.dotted(6)) }   Starting Current Test ${ r.starting_current_test || this.dotted(8) }   Creep Test ${ r.creep_test || this.dotted(8) }   Other ${ r.remark || this.dotted(8) }`,
      fontSize:10
    };

    const testedBy = {
      margin:[0,20,0,0],
      stack:[
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
      ]
    };

    return [ topTitle, topLine,reporttypetitle, slip, slipMeter, slipSign, ...midHeads, rmtlGrid, remarkLines, dialLine, errorLine, testedBy ];
  }

  private buildContestedDoc(rows:any[], meta:any): TDocumentDefinitions {
    const content:any[] = [];
    rows.forEach((r, idx) => {
      content.push(...this.pageForRow(r, meta));
      if (idx < rows.length-1) content.push({ text:'', pageBreak:'after' });
    });
    return {
      pageSize:'A4', pageMargins:[28,28,28,36], defaultStyle:{fontSize:10},
      content,
      footer: (current: number, total: number) => ({
        columns: [
          { text:`Page ${current} of ${total}`, alignment:'left', margin:[28,0,0,0] },
          { text:'M.P.P.K.V.V.CO. LTD., INDORE', alignment:'right', margin:[0,0,28,0] }
        ], fontSize:8
      }),
      info:{ title:`CONTESTED_${meta.date}` }
    };
  }

  private downloadContestedPdfFromBatch(): void {
    const snap = this.buildPrintableSnapshot();
    const doc = this.buildContestedDoc(snap.rows, snap.meta);
    pdfMake.createPdf(doc).download(`CONTESTED_${snap.meta.date}.pdf`);
  }
}
