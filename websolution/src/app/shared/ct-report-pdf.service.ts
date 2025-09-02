import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

type TDocumentDefinitions = any;

export interface CtPdfRow {
  ct_no: string;
  make: string;
  cap: string;
  ratio: string;
  polarity: string;
  remark: string;
}

export interface CtHeader {
  location_code: string;
  location_name: string;
  consumer_name: string;
  address: string;
  no_of_ct: string;
  city_class: string;
  ref_no: string;
  ct_make: string;
  mr_no: string;
  mr_date: string;
  amount_deposited: string;
  date_of_testing: string;
  primary_current: string;
  secondary_current: string;
  testMethod?: string | null;
  testStatus?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CtReportPdfService {

  private buildHeaderBlock(meta:{zone:string, method:string, status:string}) {
    return [
      { text: 'OFFICE OF THE ASSISTANT ENGINEER (R.M.T.L.) M.T. DN.-I', alignment: 'center', bold: true, fontSize: 11 },
      { text: 'M.P.P.K.V.V.CO.LTD. INDORE', alignment: 'center', bold: true, margin: [0, 2, 0, 0], fontSize: 10 },
      { text: 'CT TESTING TestReport', alignment: 'center', margin: [0, 6, 0, 2], fontSize: 12, bold: true },
    ];
  }

  private zoneMethodStatusLine(meta:{zone:string, method:string, status:string}) {
    return {
      text: `DC/Zone: ${meta.zone}    •    Test Method: ${meta.method || '-' }    •    Test Status: ${meta.status || '-'}`,
      alignment: 'center', fontSize: 9, color: '#333', margin: [0,4,0,6]
    };
  }

  private infoTable(h: CtHeader) {
    const two = (label: string, value: any) =>
      ([{ text: label, style: 'lbl' }, { text: (value ?? '').toString(), style: 'val' }]);

    return {
      style: 'tableTight',
      layout: 'lightHorizontalLines',
      table: {
        widths: [160, '*'],
        body: [
          two('Name of consumer', h.consumer_name),
          two('Address', h.address),
          two('No. of C.T', h.no_of_ct),
          two('CITY CLASS', h.city_class),
          two('Ref.', h.ref_no),
          two('C.T Make', h.ct_make),
          two('M.R. / Txn & Date', `${h.mr_no || ''}${h.mr_no && h.mr_date ? '  DT  ' : ''}${h.mr_date || ''}`),
          two('Amount Deposited (₹)', h.amount_deposited),
          two('Date of Testing', h.date_of_testing),
        ]
      },
      margin: [0, 30, 0, 6]
    };
  }

  private detailsTable(rows: CtPdfRow[]) {
    const body:any[] = [[
      { text: '#', style: 'th', alignment: 'center' },
      { text: 'C.T No.', style: 'th' },
      { text: 'Make', style: 'th' },
      { text: 'Cap.', style: 'th' },
      { text: 'Ratio', style: 'th' },
      { text: 'Polarity', style: 'th' },
      { text: 'Remark', style: 'th' },
    ]];

    rows.filter(r => (r.ct_no || '').trim()).forEach((r, i) => {
      body.push([
        { text: String(i + 1), alignment: 'center' },
        r.ct_no || '-',
        r.make || '-',
        r.cap || '-',
        r.ratio || '-',
        r.polarity || '-',
        r.remark || '-'
      ]);
    });

    return {
      style: 'tableTight',
      layout: 'lightHorizontalLines',
      table: {
        headerRows: 1,
        widths: ['auto', '*', '*', 'auto', 'auto', 'auto', '*'],
        body,
        dontBreakRows: true
      },
      margin: [0, 0, 0, 6]
    };
  }

  private signBlock(h: CtHeader) {
    return [
      { text: `Primary Current: ${h.primary_current || ''} Amp    •    Secondary Current: ${h.secondary_current || ''} Amp`, style: 'tiny', margin:[0,2,0,8], alignment:'center' },
      {
        columns: [
          {
            width: '*', alignment: 'center',
            stack: [
              { text: 'Tested by', style: 'footRole' },
              { text: '\n____________________________', alignment: 'center' },
              { text: 'TESTING ASSISTANT (RMTL)', style: 'footTiny' },
            ],
          },
          {
            width: '*', alignment: 'center',
            stack: [
              { text: 'Verified by', style: 'footRole' },
              { text: '\n____________________________', alignment: 'center' },
              { text: 'JUNIOR ENGINEER (RMTL)', style: 'footTiny' },
            ],
          },
          {
            width: '*', alignment: 'center',
            stack: [
              { text: 'Approved by', style: 'footRole' },
              { text: '\n____________________________', alignment: 'center' },
              { text: 'ASSISTANT ENGINEER (RMTL)', style: 'footTiny' },
            ],
          },
        ],
        margin: [0, 0, 0, 0]
      }
    ];
  }

  private buildDoc(header: CtHeader, rows: CtPdfRow[]): TDocumentDefinitions {
    const zone = (header.location_code ? header.location_code + ' - ' : '') + (header.location_name || '');
    const meta = { zone, method: header.testMethod || '', status: header.testStatus || '' };

    return {
      pageSize: 'A4',
      pageMargins: [24, 22, 24, 28],
      defaultStyle: { fontSize: 9, lineHeight: 1.05 },
      styles: {
        lbl: { bold: true, fontSize: 9, color: '#111' },
        val: { fontSize: 9, color: '#111' },
        th: { bold: true, fontSize: 9 },
        tableTight: { fontSize: 9 },
        footRole: { fontSize: 9, bold: true },
        footTiny: { fontSize: 8, color: '#444' },
        tiny: { fontSize: 9, color: '#333' }
      },
      content: [
        ...this.buildHeaderBlock(meta),
        this.zoneMethodStatusLine(meta),
        this.infoTable(header),
        this.detailsTable(rows),
        ...this.signBlock(header),
      ],
      footer: (current:number, total:number) => ({
        columns: [
          { text: `Page ${current} of ${total}`, alignment: 'left', margin: [24, 0, 0, 0] },
          { text: 'M.P.P.K.V.V.CO. LTD., INDORE', alignment: 'right', margin: [0, 0, 24, 0] }
        ],
        fontSize: 8
      }),
      info: { title: 'CT_Testing_TestReport' }
    };
  }

  download(header: CtHeader, rows: CtPdfRow[]) {
    const doc = this.buildDoc(header, rows);
    pdfMake.createPdf(doc).download('CT_TESTING_TestReport.pdf');
  }
}
