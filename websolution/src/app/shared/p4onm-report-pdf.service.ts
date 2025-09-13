import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

type TDocumentDefinitions = any;

export interface P4ONMReportHeader {
  date: string;                     // YYYY-MM-DD
  phase?: string;
  zone?: string;
  location_code?: string;
  location_name?: string;

  testing_bench?: string;
  testing_user?: string;
  approving_user?: string;

  lab_name?: string;
  lab_address?: string;
  lab_email?: string;
  lab_phone?: string;

  leftLogoUrl?: string;             // optional: http/https/relative OR data URL
  rightLogoUrl?: string;            // optional: http/https/relative OR data URL

  testerName?: string;
  report_id?: string;
}

export interface P4ONMReportRow {
  serial: string;
  make?: string;
  capacity?: string;
  removal_reading?: number;

  consumer_name?: string;
  account_no_ivrs?: string;
  address?: string;
  p4onm_by?: string;
  payment_particulars?: string;
  receipt_no?: string;
  receipt_date?: string;
  condition_at_removal?: string;

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

  starting_current_test?: string; // OK/FAIL/NA
  creep_test?: string;            // OK/FAIL/NA
  remark?: string;
}

export interface P4ONMPdfOptions {
  fileName?: string; // default: P4_ONM_YYYY-MM-DD.pdf
}

@Injectable({ providedIn: 'root' })
export class P4onmReportPdfService {
  async downloadFromBatch(header: P4ONMReportHeader, rows: P4ONMReportRow[], opts: P4ONMPdfOptions = {}): Promise<void> {
    const doc = await this.buildDocWithLogos(header, rows);
    const name = opts.fileName || `P4_ONM_${header.date}.pdf`;
    await new Promise<void>((resolve) => pdfMake.createPdf(doc).download(name, () => resolve()));
  }

  async openFromBatch(header: P4ONMReportHeader, rows: P4ONMReportRow[]): Promise<void> {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).open();
  }

  async printFromBatch(header: P4ONMReportHeader, rows: P4ONMReportRow[]): Promise<void> {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).print();
  }

  // -------------------- Internals --------------------
  private async buildDocWithLogos(header: P4ONMReportHeader, rows: P4ONMReportRow[]) {
    const images: Record<string, string> = {};

    const isDataUrl = (u?: string) => !!u && /^data:image\/[a-zA-Z]+;base64,/.test(u);
    const toDataURL = async (url: string) => {
      const abs = new URL(url, document.baseURI).toString();
      const res = await fetch(abs);
      if (!res.ok) throw new Error(`Failed to fetch ${abs}`);
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
        images['leftLogo'] = isDataUrl(header.leftLogoUrl) ? header.leftLogoUrl : await toDataURL(header.leftLogoUrl);
      }
      if (header.rightLogoUrl) {
        images['rightLogo'] = isDataUrl(header.rightLogoUrl) ? header.rightLogoUrl : await toDataURL(header.rightLogoUrl);
      } else if (images['leftLogo']) {
        images['rightLogo'] = images['leftLogo']; // mirror if only one provided
      }
    } catch {
      // swallow image fetch errors — header will just hide missing logos
    }

    return this.buildDoc(header, rows, images);
  }

  // ---------- Theme & helpers ----------
  private theme = {
    ok: '#198754',
    fail: '#dc3545',
    na: '#6c757d',
    grid: '#e6e9ef',
    subtleText: '#5d6b7a',
    labelBg: '#f8f9fc'
  };

  private dotted(n = 12) { return '·'.repeat(n); }
  private join(parts: Array<string | undefined | null>, sep = ' ') { return parts.filter(Boolean).join(sep); }
  private yesNo(v?: boolean) { return v ? 'YES' : 'NO'; }

  private badge(val?: string) {
    const v = (val || '').toUpperCase();
    const color = v === 'OK' ? this.theme.ok : v === 'FAIL' ? this.theme.fail : this.theme.na;
    return {
      table: { widths: ['*'], body: [[{ text: v || 'NA', color: '#fff', alignment: 'center', bold: true }]] },
      layout: {
        hLineWidth: () => 0, vLineWidth: () => 0,
        fillColor: () => color,
        paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 1, paddingBottom: () => 1
      },
      width: 48
    };
  }

  private buildDoc(header: P4ONMReportHeader, rows: P4ONMReportRow[], images: Record<string, string> = {}): TDocumentDefinitions {
    const meta = {
      date: header.date,
      zone: header.zone || this.join([header.location_code, header.location_name], ' - '),
      phase: header.phase || '-',
      testing_bench: header.testing_bench || '-',
      testing_user: header.testing_user || '-',
      approving_user: header.approving_user || '-',
      lab_name: header.lab_name || 'REGIONAL METER TESTING LABORATORY, INDORE',
      lab_address: header.lab_address || 'MPPKVVCL Near Conference Hall, Polo Ground, Indore (MP) 452003',
      lab_email: header.lab_email || 'testinglabwzind@gmail.com',
      lab_phone: header.lab_phone || '0731-2997802',
      report_id: header.report_id || `P4-${header.date.replace(/-/g, '')}-${Math.floor(1000 + Math.random()*9000)}`
    };

    const content: any[] = [];
    rows.forEach((r, idx) => {
      content.push(...this.pageForRow(r, meta, images));
      if (idx < rows.length - 1) content.push({ text: '', pageBreak: 'after' });
    });

    return {
      pageSize: 'A4',
      pageMargins: [18, 74, 18, 34],
      defaultStyle: { fontSize: 9.5, color: '#111' },
      images, // register images so header can resolve them
      tableLayouts: {
        tightGrid: {
          hLineWidth: () => 0.5, vLineWidth: () => 0.5,
          hLineColor: () => this.theme.grid, vLineColor: () => this.theme.grid,
          paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 2, paddingBottom: () => 2
        }
      },
      header: this.headerBar(meta, images),
      footer: (current: number, total: number) => ({
        columns: [
          { text: `Page ${current} of ${total}`, alignment: 'left', margin: [18, 0, 0, 0], color: this.theme.subtleText },
          { text: 'M.P.P.K.V.V.CO. LTD., INDORE', alignment: 'right', margin: [0, 0, 18, 0], color: this.theme.subtleText }
        ],
        fontSize: 8
      }),
      content
    };
  }

  private headerBar(meta: any, images: Record<string,string>) {
    return {
      margin: [18, 10, 18, 8],
      columns: [
        images['leftLogo']  ? { image: 'leftLogo',  width: 28, alignment: 'left' } : { width: 28, text: '' },
        {
          width: '*',
          stack: [
            { text: 'MADHYA PRADESH PASCHIM KSHETRA VIDYUT VITARAN COMPANY LIMITED', alignment: 'center', bold: true, fontSize: 13 },
            { text: (meta.lab_name || '').toUpperCase(), alignment: 'center', color: '#666', margin: [0, 2, 0, 0], fontSize: 12 },
            { text: meta.lab_address, alignment: 'center', color: '#666', margin: [0, 2, 0, 0], fontSize: 10 },
            { text: `Email: ${meta.lab_email} • Phone: ${meta.lab_phone}`, alignment: 'center', color: '#666', margin: [0, 2, 0, 0], fontSize: 10 },
            { text: this.dotted(10), color: '#000', bold: true, fontSize: 10 }
          ]
        },
        images['rightLogo'] ? { image: 'rightLogo', width: 28, alignment: 'right' } : { width: 28, text: '' }
      ]
    };
  }

  private pageForRow(
    r: P4ONMReportRow,
    meta: { date: string; zone?: string; phase?: string; testing_bench: string; testing_user: string; approving_user: string;
            lab_name: string; lab_address: string; lab_email: string; lab_phone: string; report_id: string; },
    _images: Record<string, string>
  ): any[] {

    const row4 = (l1: string, v1: any, l2: string, v2: any) => ([
      { text: l1, bold: true, fillColor: this.theme.labelBg }, { text: (v1 ?? '').toString() },
      { text: l2, bold: true, fillColor: this.theme.labelBg }, { text: (v2 ?? '').toString() },
    ]);
    const row2 = (label: string, value: any) => ([
      { text: label, bold: true, fillColor: this.theme.labelBg },
      { text: (value ?? '').toString(), colSpan: 3 }, {}, {}
    ]);

    const headingAej = {
      margin: [0, 0, 0, 4],
      stack: [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 540, y2: 0, lineWidth: 1 }], margin: [0, 6, 0, 6] },
        { text: 'OFFICE OF AE/JE MPPKVVCo.Ltd Zone', alignment: 'center', bold: true },
        { text: meta.zone || '-', alignment: 'center', italics: true, fontSize: 9 }
      ]
    };

    const metaTopLine = {
      margin: [0, 0, 0, 6],
      columns: [
        { text: `NO ${this.dotted(20)}` },
        { text: `DATE ${meta.date}`, alignment: 'right' }
      ]
    };

    const reportTitle = { text: 'P4 O&M METER TEST REPORT', alignment: 'center', bold: true, margin: [0, 0, 0, 6] , fontSize: 14 };

    // 🔹 Single-row table for PHASE / BENCH / TESTING USER / APPROVING USER
    const infoTable = {
      layout: 'tightGrid',
      margin: [0, 0, 0, 6],
      table: {
        // label, value, label, value, label, value, label, value
        widths: ['auto','*','auto','*','auto','*','auto','*'],
        body: [[
          { text: 'PHASE', bold: true, fillColor: this.theme.labelBg }, { text: meta.phase || '-' },
          { text: 'TESTING BENCH', bold: true, fillColor: this.theme.labelBg }, { text: meta.testing_bench || '-' },
          { text: 'TESTING USER', bold: true, fillColor: this.theme.labelBg }, { text: meta.testing_user || '-' },
          { text: 'APPROVING USER', bold: true, fillColor: this.theme.labelBg }, { text: meta.approving_user || '-' }
        ]]
      }
    };

    const slip = {
      layout: 'tightGrid',
      margin: [0, 0, 0, 6],
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          row4('Name of Consumer', r.consumer_name || '', 'Account / IVRS', r.account_no_ivrs || ''),
          row2('Address', r.address || ''),
          row2('P4 O&M Meter by (Consumer/Zone)', r.p4onm_by || ''),
          row2('Particular of payment of Testing Charges', r.payment_particulars || ''),
          row4('Receipt No', r.receipt_no || '', 'Receipt Date', r.receipt_date || ''),
          row2('Meter Condition at Removal', r.condition_at_removal || '')
        ]
      }
    };

    const slipMeter = {
      layout: 'tightGrid',
      margin: [0, 0, 0, 6],
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          row4('Meter No.', r.serial || this.dotted(12), 'Make', r.make || this.dotted(10)),
          row4('Capacity', r.capacity || this.dotted(10), 'Reading (Removal)', (r.removal_reading ?? '').toString() || this.dotted(8))
        ]
      }
    };

    const signAej = { text: 'JE/AE   MPPKVVCo.ltd', alignment: 'right', italics: true, fontSize: 9, margin: [0, 0, 0, 8] };

    const labBlockHead = {
      stack: [
        { text: 'To be filled by Testing Section Laboratory', alignment: 'center', bold: true, margin: [0, 0, 0, 4] },
        // { text: 'MADHYA PRADESH PASCHIM KSHETRA VIDYUT VITARAN CO. LTD.', alignment: 'center', fontSize: 9, margin: [0, 1, 0, 0] },
        // { text: ' (RMTL)', alignment: 'center', margin: [0, 2, 0, 6] }
      ]
    };

    const rmtlGrid = {
      layout: 'tightGrid',
      margin: [0, 0, 0, 6],
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          row4('Date of Testing', r.testing_date || meta.date, 'Physical Condition of Meter', r.physical_condition_of_device || ''),
          row4('Whether Found Burnt', this.yesNo(r.is_burned), 'Meter Body Seal', r.seal_status || ''),
          row4('Meter Glass Cover', r.meter_glass_cover || '', 'Terminal Block', r.terminal_block || ''),
          row4('Meter Body', r.meter_body || '', 'Any Other', r.other || ''),
          row4('Before Test', (r.reading_before_test ?? '').toString(), 'After Test', (r.reading_after_test ?? '').toString())
        ]
      }
    };

    const results = {
      layout: 'tightGrid',
      margin: [0, 0, 0, 6],
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          row4('Dial Test (RSM kWh)', (r.rsm_kwh ?? '').toString(), 'Dial Test (Meter kWh)', (r.meter_kwh ?? '').toString()),
          row4('% Error (Overall)', (r.error_percentage ?? '').toString(), '—', '—'),
          [
            { text: 'Starting Current Test', bold: true, fillColor: this.theme.labelBg },
            this.badge(r.starting_current_test),
            { text: 'Creep Test', bold: true, fillColor: this.theme.labelBg },
            this.badge(r.creep_test)
          ]
        ]
      }
    };

    const remark = {
      layout: 'tightGrid',
      margin: [0, 0, 0, 10],
      table: {
        widths: ['*'],
        body: [
          [{ text: 'Remark', bold: true, fillColor: this.theme.labelBg }],
          [{ text: (r.remark || ''), noWrap: false }]
        ]
      }
    };

    const testedBy = {
      margin: [0, 8, 0, 0],
      columns: [
        {
          width: '*',
          stack: [
            { text: 'Tested by', alignment: 'center', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            { text:  '', alignment: 'center', color: this.theme.subtleText, fontSize: 9 },
            { text: 'TESTING ASSISTANT (RMTL)', alignment: 'center', color: this.theme.subtleText, fontSize: 9 }
          ]
        },
        {
          width: '*',
          stack: [
            { text: 'Verified by', alignment: 'center', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: '', alignment: 'center', color: this.theme.subtleText, fontSize: 9 },
            { text: 'JUNIOR ENGINEER (RMTL)', alignment: 'center', color: this.theme.subtleText, fontSize: 9 }
          ]
        },
        {
          width: '*',
          stack: [
            { text: 'Approved by', alignment: 'center', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: '', alignment: 'center', color: this.theme.subtleText, fontSize: 9 },
            { text: 'ASSISTANT ENGINEER (RMTL)', alignment: 'center', color: this.theme.subtleText, fontSize: 9 }
          ]
        }
      ]
    };

    return [
      headingAej,
      metaTopLine,
      reportTitle,
      infoTable,      // ⬅️ now a single-row table, not a paragraph
      slip,
      slipMeter,
      signAej,
      labBlockHead,
      rmtlGrid,
      results,
      remark,
      testedBy
    ];
  }
}
