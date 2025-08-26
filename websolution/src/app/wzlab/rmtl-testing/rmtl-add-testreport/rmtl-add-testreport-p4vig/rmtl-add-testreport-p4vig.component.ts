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
      }
    });

    // build index without altering UI
    this.reloadAssigned(false);
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

  // ===== PDF =====
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
        { width:'*', text:'' },
        {
          width:220,
          stack:[
            { text:'Assistant Engineer', alignment:'left' },
            { text:'R.M.T.L.', alignment:'left' },
            { text:'M.P.P.K.V.V.C.L., Indore', alignment:'left' }
          ]
        }
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
