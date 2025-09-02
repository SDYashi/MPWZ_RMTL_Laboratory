import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

type TDocumentDefinitions = any;

export interface P4ONMReportHeader {
  /** YYYY-MM-DD */
  date: string;
  phase?: string;
  zone?: string;               // e.g. "3420100 - Zone ABC"
  location_code?: string;
  location_name?: string;
  testerName?: string;
}

export interface P4ONMReportRow {
  // AE/JE slip
  serial: string;
  make?: string;
  capacity?: string;
  removal_reading?: number;

  consumer_name?: string;
  account_no_ivrs?: string;
  address?: string;
  p4onm_by?: string;                 // requester (consumer/zone)
  payment_particulars?: string;
  receipt_no?: string;
  /** YYYY-MM-DD */
  receipt_date?: string;
  condition_at_removal?: string;

  // RMTL section
  /** YYYY-MM-DD */
  testing_date?: string;
  physical_condition_of_device?: string;
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

  /** OK/FAIL/NA (free text) */
  starting_current_test?: string;
  /** OK/FAIL/NA (free text) */
  creep_test?: string;

  /** Free text remark */
  remark?: string;
}

export interface P4ONMPdfOptions {
  fileName?: string; // default: P4_ONM_YYYY-MM-DD.pdf
}

@Injectable({ providedIn: 'root' })
export class P4onmReportPdfService {
  downloadFromBatch(header: P4ONMReportHeader, rows: P4ONMReportRow[], opts: P4ONMPdfOptions = {}): void {
    const doc = this.buildDoc(header, rows);
    const name = opts.fileName || `P4_ONM_${header.date}.pdf`;
    pdfMake.createPdf(doc).download(name);
  }

  openFromBatch(header: P4ONMReportHeader, rows: P4ONMReportRow[]): void {
    const doc = this.buildDoc(header, rows);
    pdfMake.createPdf(doc).open();
  }

  printFromBatch(header: P4ONMReportHeader, rows: P4ONMReportRow[]): void {
    const doc = this.buildDoc(header, rows);
    pdfMake.createPdf(doc).print();
  }

  // -------------------- Internals --------------------

  private buildDoc(header: P4ONMReportHeader, rows: P4ONMReportRow[]): TDocumentDefinitions {
    const meta = {
      date: header.date,
      zone: header.zone || this.joinNonEmpty([header.location_code, header.location_name], ' - '),
      testerName: header.testerName || '',
    };

    const content: any[] = [];
    rows.forEach((r, idx) => {
      content.push(...this.pageForRow(r, meta));
      if (idx < rows.length - 1) content.push({ text: '', pageBreak: 'after' });
    });

    return {
      pageSize: 'A4',
      pageMargins: [28, 28, 28, 36],
      defaultStyle: { fontSize: 10 },
      content,
      footer: (current: number, total: number) => ({
        columns: [
          { text: `Page ${current} of ${total}`, alignment: 'left', margin: [28, 0, 0, 0] },
          { text: 'M.P.P.K.V.V.CO. LTD., INDORE', alignment: 'right', margin: [0, 0, 28, 0] }
        ],
        fontSize: 8
      }),
      info: { title: `P4_ONM_${meta.date}` }
    };
  }

  private dotted(n = 20) { return '·'.repeat(n); }

  private joinNonEmpty(parts: Array<string | undefined | null>, sep = ' ') {
    return parts.filter(Boolean).join(sep);
  }

  private pageForRow(r: P4ONMReportRow, meta: { date: string; zone?: string; testerName?: string; }): any[] {
    const topTitle = {
      stack: [
        { text: 'OFFICE OF AE/JE MPPKVVCo.Ltd Zone', alignment: 'center', bold: true, margin: [0, 0, 0, 2] },
        { text: meta.zone || '', alignment: 'center', italics: true, fontSize: 9, margin: [0, 0, 0, 6] }
      ]
    };

    const topLine = {
      columns: [
        { text: `NO ${this.dotted(20)}` },
        { text: `DATE ${meta.date}`, alignment: 'right' },
      ],
      margin: [0, 0, 0, 6]
    };

    const reporttypetitle = { text: 'P4 O&M METER TEST REPORT', alignment: 'center', bold: true, margin: [0, 0, 0, 6] };

    const slip = {
      layout: 'lightHorizontalLines',
      table: {
        widths: ['auto', '*'],
        body: [
          [{ text: 'Name of Consumer', bold: true }, r.consumer_name || '' ],
          [{ text: 'Account No / IVRS No.', bold: true }, r.account_no_ivrs || '' ],
          [{ text: 'Address', bold: true }, r.address || '' ],
          [{ text: 'P4 O&M Meter by (Consumer/Zone)', bold: true }, r.p4onm_by || '' ],
          [{ text: 'Particular of payment of Testing Charges', bold: true }, r.payment_particulars || '' ],
          [{ text: 'Receipt No and Date', bold: true }, `${r.receipt_no || ''}    ${r.receipt_date || ''}` ],
          [{ text: 'Meter Condition as noted at the time of removal', bold: true }, r.condition_at_removal || '' ],
        ]
      }
    };

    const slipMeter = {
      layout: 'noBorders',
      margin: [0, 6, 0, 0],
      table: {
        widths: ['*', '*', '*', '*'],
        body: [
          [{ text: 'Meter No.', bold: true }, { text: 'Make', bold: true }, { text: 'Capacity', bold: true }, { text: 'Reading', bold: true }],
          [
            r.serial || this.dotted(15),
            r.make || this.dotted(12),
            r.capacity || this.dotted(12),
            (r.removal_reading ?? '').toString() || this.dotted(12)
          ]
        ]
      }
    };

    const slipSign = { text: 'JE/AE   MPPKVVCo.ltd', alignment: 'right', margin: [0, 2, 0, 8], italics: true, fontSize: 9 };

    const midHeads = [
      { text: 'REGIONAL METER TESTING LABORATORY, INDORE', alignment: 'center', bold: true },
      { text: 'MADHYA PRADESH PASCHIM KSHETRA VIDYUT VITARAN CO. LTD.', alignment: 'center', fontSize: 9, margin: [0, 1, 0, 0] },
      { text: 'To be filled by Testing Section Laboratory (RMTL)', alignment: 'center', margin: [0, 2, 0, 6] }
    ];

    const rmtlGrid = {
      layout: 'lightHorizontalLines',
      table: {
        widths: ['auto', '*'],
        body: [
          [{ text: 'Date of Testing', bold: true }, r.testing_date || meta.date],
          [{ text: 'Physical Condition of Meter', bold: true }, r.physical_condition_of_device || '' ],
          [{ text: 'Whether found Burnt', bold: true }, (r.is_burned ? 'YES' : 'NO')],
          [{ text: 'Meter Body Seal', bold: true }, r.seal_status || '' ],
          [{ text: 'Meter Glass Cover', bold: true }, r.meter_glass_cover || '' ],
          [{ text: 'Terminal Block', bold: true }, r.terminal_block || '' ],
          [{ text: 'Meter Body', bold: true }, r.meter_body || '' ],
          [{ text: 'Any Other', bold: true }, r.other || '' ],
          [{ text: 'Before Test', bold: true }, (r.reading_before_test ?? '').toString() ],
          [{ text: 'After Test', bold: true }, (r.reading_after_test ?? '').toString() ],
        ]
      },
      margin: [0, 0, 0, 6]
    };

    const remarkLines = {
      margin: [0, 6, 0, 0],
      stack: [
        { text: 'Remark:-', bold: true, margin: [0, 0, 0, 2] },
        {
          canvas: [
            { type: 'line', x1: 0, y1: 0, x2: 540, y2: 0, lineWidth: 0.5 },
            { type: 'line', x1: 0, y1: 10, x2: 540, y2: 10, lineWidth: 0.5 },
            { type: 'line', x1: 0, y1: 20, x2: 540, y2: 20, lineWidth: 0.5 }
          ],
          margin: [0, 2, 0, 0]
        }
      ]
    };

    const dialLine = {
      margin: [0, 8, 0, 0],
      text: `Dial Test kWh Recorded by RSM Meter ${r.rsm_kwh ?? this.dotted(10)} / kWh Recorded by meter ${r.meter_kwh ?? this.dotted(10)} , Overall`,
      fontSize: 10
    };

    const errorLine = {
      margin: [0, 4, 0, 0],
      text:
        `% Error ${ (r.error_percentage ?? this.dotted(6)) }   Starting Current Test ${ r.starting_current_test || this.dotted(8) }   Creep Test ${ r.creep_test || this.dotted(8) }   Other ${ r.remark || this.dotted(8) }`,
      fontSize: 10
    };

    const testedBy = {
      margin: [0, 20, 0, 0],
      columns: [
        {
          width: '*',
          stack: [
            { text: 'Tested by', style: 'footRole' },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: meta.testerName || '', style: 'footTiny' },
            { text: 'TESTING ASSISTANT (RMTL)', style: 'footTiny' },
          ],
        },
        {
          width: '*',
          stack: [
            { text: 'Verified by', style: 'footRole' },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: meta.testerName || '', style: 'footTiny' },
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
      ]
    };

    return [ topTitle, topLine, reporttypetitle, slip, slipMeter, slipSign, ...midHeads, rmtlGrid, remarkLines, dialLine, errorLine, testedBy ];
  }
}
