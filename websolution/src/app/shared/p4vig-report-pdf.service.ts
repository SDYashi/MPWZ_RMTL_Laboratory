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
  approving_user?: string | null;
  phase?: string | null;
  

  // added for meta + header
  date?: string;                    // optional print date
  testing_bench?: string | null;
  testing_user?: string | null;

  // lab info + logos
  lab_name?: string | null;
  lab_address?: string | null;
  lab_email?: string | null;
  lab_phone?: string | null;
  leftLogoUrl?: string | null;      // http/https/relative OR data URL
  rightLogoUrl?: string | null;     // http/https/relative OR data URL
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

  async download(header: VigHeader, rows: VigRow[], fileName = 'P4_VIG_CONTESTED_REPORTS.pdf') {
    const doc = await this.buildDocWithLogos(header, rows);
    await new Promise<void>((resolve) => pdfMake.createPdf(doc).download(fileName, () => resolve()));
  }

  async open(header: VigHeader, rows: VigRow[]) {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).open();
  }

  async print(header: VigHeader, rows: VigRow[]) {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).print();
  }

  // -------------------- internals --------------------
  private theme = {
    grid: '#e6e9ef',
    subtle: '#5d6b7a',
    labelBg: '#f8f9fc'
  };
  private dotted(n=10){ return '·'.repeat(n); }

private async buildDocWithLogos(header: VigHeader, rows: VigRow[]): Promise<TDocumentDefinitions> {
  const images: Record<string, string> = {};
  const isData = (u?: string | null) => !!u && /^data:image\/[a-zA-Z]+;base64,/.test(u);

  const toDataURL = async (url: string) => {
    const abs = new URL(url, document.baseURI).toString();
    const res = await fetch(abs, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`logo fetch failed ${abs}`);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  try {
    if (header.leftLogoUrl) {
      images['leftLogo'] = isData(header.leftLogoUrl) ? header.leftLogoUrl! : await toDataURL(header.leftLogoUrl!);
    }
    if (header.rightLogoUrl) {
      images['rightLogo'] = isData(header.rightLogoUrl) ? header.rightLogoUrl! : await toDataURL(header.rightLogoUrl!);
    }

    // If only one logo provided, mirror it so *both* sides show a logo
    if (!images['leftLogo'] && images['rightLogo']) images['leftLogo'] = images['rightLogo'];
    if (!images['rightLogo'] && images['leftLogo']) images['rightLogo'] = images['leftLogo'];
  } catch {
    // If fetch/convert fails, just skip logos; headerBar() will render empty slots safely.
  }

  return this.buildDoc(header, rows, images);
}

private headerBar(meta: any, images: Record<string,string>) {
  // Logos constrained into a 42x42 box for consistent sizing
  const logoBox = [42, 42] as [number, number];

  return {
    margin: [18, 10, 18, 8],
    columns: [
      images['leftLogo']
        ? { image: 'leftLogo', fit: logoBox, alignment: 'left', margin: [0, 0, 10, 0] }
        : { width: logoBox[0], text: '' },

      {
        width: '*',
        stack: [
          { text: 'MADHYA PRADESH PASCHIM KSHETRA VIDYUT VITARAN COMPANY LIMITED', alignment: 'center', bold: true, fontSize: 13 },
          { text: (meta.lab_name || '').toUpperCase(), alignment: 'center', color: '#666', margin: [0, 2, 0, 0], fontSize: 12 },
          { text: meta.lab_address || '', alignment: 'center', color: '#666', margin: [0, 2, 0, 0], fontSize: 10 },
          { text: `Email: ${meta.lab_email || '-'} • Phone: ${meta.lab_phone || '-'}`, alignment: 'center', color: '#666', margin: [0, 2, 0, 0], fontSize: 10 },
        ]
      },

      images['rightLogo']
        ? { image: 'rightLogo', fit: logoBox, alignment: 'right', margin: [10, 0, 0, 0] }
        : { width: logoBox[0], text: '' }
    ]
  };
}

  private buildDoc(header: VigHeader, rows: VigRow[], images: Record<string,string>): TDocumentDefinitions {
    const zone = (header.location_code ? header.location_code + ' - ' : '') + (header.location_name || '');
    const meta = {
      zone,
      method: header.testMethod || '-',
      status: header.testStatus || '-',
      bench: header.testing_bench || '-',
      user: header.testing_user || '-',
      date: header.date || '',
      lab_name: header.lab_name || 'REGIONAL METER TESTING LABORATORY, INDORE',
      lab_address: header.lab_address || 'MPPKVVCL Near Conference Hall, Polo Ground, Indore (MP) 452003',
      lab_email: header.lab_email || 'testinglabwzind@gmail.com',
      lab_phone: header.lab_phone || '0731-2997802'
    };

    const content:any[] = [];
    const data = (rows || []).filter(r => (r.serial || '').trim());
    data.forEach((r, idx) => {
      content.push(...this.pageForRow(r, meta));
      if (idx < data.length - 1) content.push({ text:'', pageBreak:'after' });
    });

    return {
      pageSize:'A4',
      pageMargins:[18,74,18,34],
      defaultStyle:{ fontSize:9.5, color:'#111' },
      images,
      tableLayouts: {
        tightGrid: {
          hLineWidth: () => 0.5, vLineWidth: () => 0.5,
          hLineColor: () => this.theme.grid, vLineColor: () => this.theme.grid,
          paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 2, paddingBottom: () => 2
        }
      },
      header: this.headerBar(meta, images),
      footer: (current:number,total:number)=>({
        columns:[
          { text:`Page ${current} of ${total}`, alignment:'left', margin:[18,0,0,0], color: this.theme.subtle },
          { text:'M.P.P.K.V.V.CO. LTD., INDORE', alignment:'right', margin:[0,0,18,0], color: this.theme.subtle }
        ],
        fontSize:8
      }),
      content
    };
  }

  private pageForRow(r: VigRow, meta:{zone:string, method:string, status:string, bench:string, user:string, date:string}): any[] {
    const lbl = { bold:true };
    const two = (label:string, value:any)=> ([{text:label, ...lbl, fillColor: this.theme.labelBg}, {text:(value ?? '').toString()}]);

    const reportTitle = [
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 540, y2: 0, lineWidth: 1 }], margin: [0, 6, 0, 6] },
    { text: 'TEST RESULT FOR CONTESTED METER (P4 - VIG)', alignment:'center', bold:true, margin:[0,0,0,6], fontSize: 14 },
    ]
    // one-row meta table (no wrap into two lines)
    const metaRow = {
      layout: 'tightGrid',
      margin: [0, 0, 0, 8],
      table: {
        widths: ['auto','*','auto','*','auto','*','auto','*'],
        body: [[
          { text:'Zone/DC', ...lbl, fillColor: this.theme.labelBg }, { text: meta.zone || '-' },
          { text:'Method',  ...lbl, fillColor: this.theme.labelBg }, { text: meta.method || '-' },
          { text:'Status',  ...lbl, fillColor: this.theme.labelBg }, { text: meta.status || '-' },
          { text:'Bench',   ...lbl, fillColor: this.theme.labelBg }, { text: meta.bench || '-' }
        ]]
      }
    };

    const metaRow2 = {
      layout: 'tightGrid',
      margin: [0, 0, 0, 8],
      table: {
        widths: ['auto','*','auto','*'],
        body: [[
          { text:'Testing User', ...lbl, fillColor: this.theme.labelBg }, { text: meta.user || '-' },
          { text:'Date',         ...lbl, fillColor: this.theme.labelBg }, { text: meta.date || '-' }
        ]]
      }
    };

    const topInfo = {
      layout:'tightGrid',
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
      layout:'tightGrid',
      margin:[0,8,0,0],
      table:{
        widths:['*','*','*','*'],
        body:[
          [{text:'METER NO.', ...lbl, fillColor: this.theme.labelBg}, {text:'MAKE', ...lbl, fillColor: this.theme.labelBg}, {text:'CAPACITY', ...lbl, fillColor: this.theme.labelBg}, {text:'READING', ...lbl, fillColor: this.theme.labelBg}],
          [r.serial || '', r.make || '', r.capacity || '', (r.removal_reading ?? '').toString()]
        ]
      }
    };

    const rmtlHead = { text:'TO BE FILLED BY TESTING SECTION LABORATORY (RMTL)', alignment:'center', bold:true, margin:[0,10,0,6] };

    const physTable = {
      layout:'tightGrid',
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

    const readFound = {
      layout:'tightGrid',
      margin:[0,8,0,0],
      table:{
        widths:['*','*'],
        body:[
          [{text:'READING AS FOUND — BEFORE TEST', ...lbl, fillColor: this.theme.labelBg}, {text:'AFTER TEST', ...lbl, fillColor: this.theme.labelBg}],
          [(r.reading_before_test ?? '').toString(), (r.reading_after_test ?? '').toString()]
        ]
      }
    };

    const beforeAfter = {
      layout:'tightGrid',
      margin:[0,8,0,0],
      table:{
        widths:['*','*','*','*','*'],
        body:[
          [
            {text:'KWH RECORDED BY RSS/RSM', ...lbl, fillColor: this.theme.labelBg},
            {text:'KWH RECORDED BY METER',   ...lbl, fillColor: this.theme.labelBg},
            {text:'% ERROR',                 ...lbl, fillColor: this.theme.labelBg},
            {text:'STARTING CURRENT TEST',   ...lbl, fillColor: this.theme.labelBg},
            {text:'CREEP TEST',              ...lbl, fillColor: this.theme.labelBg}
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

    const testRes = {
      margin:[0,8,0,0],
      text:`4. TEST RESULT : ${r.test_result || this.dotted(15)}`
    };

    const remark = {
      margin:[0,10,0,0],
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
            { text: 'Tested by', bold: true, alignment: 'center' },
            { text: '____________________________', alignment: 'center' },
            { text: 'TESTING ASSISTANT (RMTL)', fontSize: 9, alignment: 'center', color: this.theme.subtle },
          ],
        },
        {
          width: '*',
          stack: [
            { text: 'Verified by', bold: true, alignment: 'center' },
            { text: '____________________________', alignment: 'center' },
            { text: 'JUNIOR ENGINEER (RMTL)', fontSize: 9, alignment: 'center', color: this.theme.subtle },
          ],
        },
        {
          width: '*',
          stack: [
            { text: 'Approved by', bold: true, alignment: 'center' },
            { text: '____________________________', alignment: 'center' },
            { text: 'ASSISTANT ENGINEER (RMTL)', fontSize: 9, alignment: 'center', color: this.theme.subtle },
          ],
        },
      ]
    };

    return [ reportTitle, metaRow, metaRow2, topInfo, detailMeter, rmtlHead, physTable, readFound, beforeAfter, testRes, remark, sign ];
  }
}
