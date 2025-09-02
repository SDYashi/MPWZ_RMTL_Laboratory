import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

type TDocumentDefinitions = any;

export interface VigHeader {
  location_code?: string;
  location_name?: string;
  testMethod?: string | null;
  testStatus?: string | null;
}

export interface VigRow {
  // main
  serial: string;
  make?: string;
  capacity?: string;
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
  is_burned?: boolean;
  seal_status?: string;
  meter_glass_cover?: string;
  terminal_block?: string;
  meter_body?: string;
  other?: string;

  reading_before_test?: number;
  reading_after_test?: number;
  rsm_kwh?: number;
  meter_kwh?: number;
  error_percentage?: number;
  starting_current_test?: string;
  creep_test?: string;

  remark?: string;
}

@Injectable({ providedIn: 'root' })
export class P4VigReportPdfService {

  download(header: VigHeader, rows: VigRow[], fileName = 'P4_VIG_CONTESTED_REPORTS.pdf') {
    const doc = this.buildDoc(header, rows);
    pdfMake.createPdf(doc).download(fileName);
  }

  open(header: VigHeader, rows: VigRow[]) {
    const doc = this.buildDoc(header, rows);
    pdfMake.createPdf(doc).open();
  }

  print(header: VigHeader, rows: VigRow[]) {
    const doc = this.buildDoc(header, rows);
    pdfMake.createPdf(doc).print();
  }

  // -------------------- internals --------------------
  private dotted(n=10){ return '·'.repeat(n); }

  private pageForRow(r: VigRow, meta:{zone:string, method:string, status:string}): any[] {
    const title = [
      { text: 'MADHYA PRADESH PASCHIM KSHETRA VIDHYUT VITRAN CO. LTD., POLOGROUND INDORE', alignment:'center', bold:true },
      { text: 'TEST RESULT FOR CONTESTED METER (P4 - VIG)', alignment:'center', margin:[0,4,0,6] },
      { text: `DC/Zone: ${meta.zone}    •    Test Method: ${meta.method || '-' }    •    Test Status: ${meta.status || '-'}`,
        alignment:'center', fontSize:9, color:'#555', margin:[0,0,0,8] }
    ];

    const lbl = { bold:true };
    const two = (label:string, value:any)=> ([{text:label, ...lbl}, {text:(value ?? '').toString()}]);

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
          [{text:'METER NO.', ...lbl}, {text:'MAKE', ...lbl}, {text:'CAPACITY', ...lbl}, {text:'READING', ...lbl}],
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
            {text:'KWH RECORDED BY RSS/RSM', ...lbl},
            {text:'KWH RECORDED BY METER', ...lbl},
            {text:'% ERROR', ...lbl},
            {text:'STARTING CURRENT TEST', ...lbl},
            {text:'CREEP TEST', ...lbl}
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
          [{text:'READING AS FOUND — BEFORE TEST', ...lbl}, {text:'AFTER TEST', ...lbl}],
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
        { text:'REMARKS', ...lbl },
        { text: r.remark || '', margin:[0,4,0,0] }
      ]
    };

    const sign = {
      margin:[0,14,0,0],
      columns:[
        {
          width: '*',
          stack: [
            { text: 'Tested by', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: 'TESTING ASSISTANT (RMTL)', fontSize: 9, alignment: 'center' },
          ],
        },
        {
          width: '*',
          stack: [
            { text: 'Verified by', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: 'JUNIOR ENGINEER (RMTL)', fontSize: 9, alignment: 'center' },
          ],
        },
        {
          width: '*',
          stack: [
            { text: 'Approved by', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: 'ASSISTANT ENGINEER (RMTL)', fontSize: 9, alignment: 'center' },
          ],
        },
      ]
    };

    return [ ...title, topInfo, detailMeter, rmtlHead, physTable, readFound, beforeAfter, testRes, remark, sign ];
  }

  private buildDoc(header: VigHeader, rows: VigRow[]): TDocumentDefinitions {
    const zone = (header.location_code ? header.location_code + ' - ' : '') + (header.location_name || '');
    const meta = { zone, method: header.testMethod || '', status: header.testStatus || '' };

    const content:any[] = [];
    const data = (rows || []).filter(r => (r.serial || '').trim());
    data.forEach((r, idx) => {
      content.push(...this.pageForRow(r, meta));
      if (idx < data.length - 1) content.push({ text:'', pageBreak:'after' });
    });

    return {
      pageSize:'A4',
      pageMargins:[28,28,28,36],
      defaultStyle:{ fontSize:10 },
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
}
