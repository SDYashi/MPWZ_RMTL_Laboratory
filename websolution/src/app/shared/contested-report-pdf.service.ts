import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

type TDocumentDefinitions = any;

export interface ContestedReportHeader {
  date: string;                // YYYY-MM-DD
  phase?: string;
  zone?: string;               // e.g., "3420100 - Zone ABC"
  location_code?: string;
  location_name?: string;
  testerName?: string;

  testing_bench?: string;
  testing_user?: string;
  approving_user?: string;

  lab_name?: string;
  lab_address?: string;
  lab_email?: string;
  lab_phone?: string;

  leftLogoUrl?: string;
  rightLogoUrl?: string;       // right logo enabled

  report_id?: string;          // e.g., "CON-2025-000123"
}

/** Updated to mirror the new TS model: remove RSM/meter kWh; add SHUNT/NUTRAL blocks + combined error */
export interface ContestedReportRow {
  serial: string;
  make?: string;
  capacity?: string;
  removal_reading?: number;

  // Consumer / AE-JE slip fields
  consumer_name?: string;
  account_no_ivrs?: string;
  address?: string;
  contested_by?: string;
  payment_particulars?: string;
  receipt_no?: string;
  receipt_date?: string;       // YYYY-MM-DD

  // Device condition & meta
  testing_date?: string;       // YYYY-MM-DD
  physical_condition_of_device?: string;
  is_burned?: boolean;
  seal_status?: string;
  meter_glass_cover?: string;
  terminal_block?: string;
  meter_body?: string;
  other?: string;

  // SHUNT readings
  shunt_reading_before_test?: number;
  shunt_reading_after_test?: number;
  shunt_ref_start_reading?: number;
  shunt_ref_end_reading?: number;
  shunt_current_test?: string | null;
  shunt_creep_test?: string | null;
  shunt_dail_test?: string | null;
  shunt_error_percentage?: number | null;

  // NUTRAL readings
  nutral_reading_before_test?: number;
  nutral_reading_after_test?: number;
  nutral_ref_start_reading?: number;
  nutral_ref_end_reading?: number;
  nutral_current_test?: string | null;
  nutral_creep_test?: string | null;
  nutral_dail_test?: string | null;
  nutral_error_percentage?: number | null;

  // Combined error to print
  error_percentage_import?: number | null;

  // Free-form remark
  remark?: string;
}

export interface ContestedReportPdfOptions {
  fileName?: string; // default: CONTESTED_YYYY-MM-DD.pdf
}

@Injectable({ providedIn: 'root' })
export class ContestedReportPdfService {
  async downloadFromBatch(header: ContestedReportHeader, rows: ContestedReportRow[], opts: ContestedReportPdfOptions = {}): Promise<void> {
    const doc = await this.buildDocWithLogos(header, rows);
    const name = opts.fileName || `CONTESTED_${header.date}.pdf`;
    await new Promise<void>((resolve) => pdfMake.createPdf(doc).download(name, () => resolve()));
  }

  async openFromBatch(header: ContestedReportHeader, rows: ContestedReportRow[]): Promise<void> {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).open();
  }

  async printFromBatch(header: ContestedReportHeader, rows: ContestedReportRow[]): Promise<void> {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).print();
  }

  // -------------------- Internals --------------------
  private async buildDocWithLogos(header: ContestedReportHeader, rows: ContestedReportRow[]) {
    const images: Record<string, string> = {};
    const toDataURL = async (url: string) => {
      const abs = new URL(url, document.baseURI).toString();
      const res = await fetch(abs);
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };

    try {
      if (header.leftLogoUrl) images['leftLogo'] = await toDataURL(header.leftLogoUrl);
      if (header.rightLogoUrl) {
        images['rightLogo'] = await toDataURL(header.rightLogoUrl);
      } else if (images['leftLogo']) {
        images['rightLogo'] = images['leftLogo']; // mirror if only one provided
      }
    } catch {
      // ignore logo errors
    }

    return this.buildDoc(header, rows, images);
  }

  // ---------- Theme & helpers ----------
  private theme = {
    primary: '#0b5ed7',
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
  private fmtNum(n?: number | null) { return (n ?? '') === '' || n === null || n === undefined ? '' : String(n); }

  private buildDoc(header: ContestedReportHeader, rows: ContestedReportRow[], images: Record<string, string> = {}): TDocumentDefinitions {
    const meta = {
      date: header.date,
      phase: header.phase || '',
      zone: header.zone || this.join([header.location_code, header.location_name], ' - '),
      testing_bench: header.testing_bench || '-',
      testing_user: header.testing_user || '-',
      approving_user: header.approving_user || '-',
      lab_name: header.lab_name || 'REGINAL METERING TESTING LABORATORY INDORE',
      lab_address: header.lab_address || 'MPPKVVCL Near Conference Hall, Polo Ground, Indore (MP) 452003',
      lab_email: header.lab_email || 'testinglabwzind@gmail.com',
      lab_phone: header.lab_phone || '0731-2997802',
      report_id: header.report_id || `CON-${header.date.replace(/-/g, '')}-${Math.floor(1000 + Math.random()*9000)}`
    };

    const row = rows[0]; // targeted single page per report

    return {
      pageSize: 'A4',
      pageMargins: [18, 70, 18, 34],
      images,
      header: this.headerBar(meta, images),
      footer: (current: number, total: number) => ({
        columns: [
          { text: `Page ${current} of ${total}`, alignment: 'left', margin: [18, 0, 0, 0], color: this.theme.subtleText },
          { text: 'M.P.P.K.V.V.CO. LTD., INDORE', alignment: 'right', margin: [0, 0, 18, 0], color: this.theme.subtleText }
        ],
        fontSize: 8
      }),
      defaultStyle: { fontSize: 9, color: '#111' },
      styles: {
        small: { fontSize: 8.5, color: this.theme.subtleText },
        sectionTitle: { bold: true, fontSize: 11, color: '#0b2237', margin: [0, 8, 0, 2] },
        labelCell: { bold: true, fillColor: this.theme.labelBg },
        valueCell: {},
      },
      tableLayouts: {
        tightGrid: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => this.theme.grid,
          vLineColor: () => this.theme.grid,
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 2,
          paddingBottom: () => 2
        }
      },
      content: this.singlePageForRow(row, meta)
    };
  }

  // Header like screenshot: 2 logos + centered multi-line text
  private headerBar(meta: any, images: Record<string,string>) {
    const labName = (meta.lab_name || 'REGINAL METERING TESTING LABORATORY INDORE').toString().toUpperCase();
    const addr    = meta.lab_address || 'MPPKVVCL Near Conference Hall, Polo Ground, Indore (MP) 452003';
    const mail    = meta.lab_email  || 'testinglabwzind@gmail.com';
    const phone   = meta.lab_phone  || '0731-2997802';

    return {
      margin: [18, 10, 18, 8],
      columns: [
        images['leftLogo']  ? { image: 'leftLogo',  width: 28, alignment: 'left' } : { width: 28, text: '' },
        {
          width: '*',
          stack: [
            { text: 'MADHYA PRADESH PASCHIM KSHETRA VIDYUT VITARAN COMPANY LIMITED', alignment: 'center', bold: true, fontSize: 13 },
            { text: labName, alignment: 'center', color: '#666', margin: [0, 2, 0, 0], fontSize: 12 },
            { text: addr, alignment: 'center', color: '#666', margin: [0, 2, 0, 0], fontSize: 10 },
            { text: `Email: ${mail} • Phone: ${phone}`, alignment: 'center', color: '#666', margin: [0, 2, 0, 0], fontSize: 10 }
          ]
        },
        images['rightLogo'] ? { image: 'rightLogo', width: 28, alignment: 'right' } : { width: 28, text: '' }
      ]
    };
  }

  // ----------------- Content builder (with SHUNT/NUTRAL blocks) -----------------
  private singlePageForRow(
    r: ContestedReportRow,
    meta: {
      date: string; phase: string; zone?: string;
      testing_bench: string; testing_user: string; approving_user: string;
      lab_name: string; lab_address: string; lab_email: string; lab_phone: string; report_id: string;
    }
  ): any[] {

    // helpers – 4 columns: label/value + label/value
    const row4 = (l1: string, v1: any, l2: string, v2: any) => ([
      { text: l1, style: 'labelCell' }, { text: (v1 ?? '').toString(), style: 'valueCell' },
      { text: l2, style: 'labelCell' }, { text: (v2 ?? '').toString(), style: 'valueCell' },
    ]);
    // long value that should take the rest of the row
    const row2 = (label: string, value: any) => ([
      { text: label, style: 'labelCell' },
      { text: (value ?? '').toString(), style: 'valueCell', colSpan: 3 }, {}, {}
    ]);

    // ---------- Consumer Details ----------
    const consumer = {
      margin: [0, 6, 0, 0],
      layout: 'tightGrid',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          row4('Zone/DC', meta.zone || '-', 'Date', meta.date || '-'),
          row4('Phase', meta.phase || '-', 'Testing Bench', meta.testing_bench || '-'),
          row4('Testing User', meta.testing_user || '-', 'Approving User', meta.approving_user || '-'),
          row2('Name of Consumer', r.consumer_name || ''),
          row2('Account / IVRS', r.account_no_ivrs || ''),
          row2('Address', r.address || ''),
          row2('Contested By', r.contested_by || ''),
          row2('Payment Particulars', r.payment_particulars || ''),
          row2('Receipt No & Date', `${r.receipt_no || ''}    ${r.receipt_date || ''}`)
        ]
      }
    };

    // ---------- Meter & Condition ----------
    const summary = {
      margin: [0, 8, 0, 0],
      layout: 'tightGrid',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [{ text: 'METER & CONDITION', colSpan: 4, alignment: 'center', bold: true, fillColor: '#f8f9fc' }, {}, {}, {}],
          row4('Meter No.', r.serial || this.dotted(10), 'Make', r.make || this.dotted(10)),
          row4('Capacity', r.capacity || this.dotted(10), 'Removal Reading', this.fmtNum(r.removal_reading) || this.dotted(8)),
          row4('Physical Condition', r.physical_condition_of_device || '', 'Found Burnt', this.yesNo(r.is_burned)),
          row4('Body Seal', r.seal_status || '', 'Glass Cover', r.meter_glass_cover || ''),
          row4('Terminal Block', r.terminal_block || '', 'Meter Body', r.meter_body || ''),
          row2('Any Other', r.other || '')
        ]
      }
    };

    // ---------- SHUNT block ----------
    const shunt = {
      margin: [0, 8, 0, 0],
      layout: 'tightGrid',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [{ text: 'SHUNT READINGS', colSpan: 4, alignment: 'center', bold: true, fillColor: '#eef7ff' }, {}, {}, {}],
          row4('Reading Before Test', this.fmtNum(r.shunt_reading_before_test), 'Reading After Test', this.fmtNum(r.shunt_reading_after_test)),
          row4('Ref Start', this.fmtNum(r.shunt_ref_start_reading), 'Ref End', this.fmtNum(r.shunt_ref_end_reading)),
          row4('Starting Current Test', r.shunt_current_test || '', 'Creep Test', r.shunt_creep_test || ''),
          row4('Dial Test', r.shunt_dail_test || '', 'Error % (Shunt)', this.fmtNum(r.shunt_error_percentage))
        ]
      }
    };

    // ---------- NUTRAL block ----------
    const nutral = {
      margin: [0, 8, 0, 0],
      layout: 'tightGrid',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [{ text: 'NUTRAL READINGS', colSpan: 4, alignment: 'center', bold: true, fillColor: '#eef7ff' }, {}, {}, {}],
          row4('Reading Before Test', this.fmtNum(r.nutral_reading_before_test), 'Reading After Test', this.fmtNum(r.nutral_reading_after_test)),
          row4('Ref Start', this.fmtNum(r.nutral_ref_start_reading), 'Ref End', this.fmtNum(r.nutral_ref_end_reading)),
          row4('Starting Current Test', r.nutral_current_test || '', 'Creep Test', r.nutral_creep_test || ''),
          row4('Dial Test', r.nutral_dail_test || '', 'Error % (Nutral)', this.fmtNum(r.nutral_error_percentage))
        ]
      }
    };

    // ---------- Combined Error ----------
    const combined = {
      margin: [0, 8, 0, 0],
      layout: 'tightGrid',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [{ text: 'COMBINED RESULT', colSpan: 4, alignment: 'center', bold: true, fillColor: '#f8f9fc' }, {}, {}, {}],
          row4('Final Error % (Combined)', this.fmtNum(r.error_percentage_import), '', '')
        ]
      }
    };

    // ---------- Remarks & signatures ----------
    const remarks = {
      margin: [0, 8, 0, 0],
      layout: 'tightGrid',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          row2('Remark', r.remark || '')
        ]
      }
    };

    const signatures = {
      margin: [0, 10, 0, 0],
      columns: [
        {
          width: '*',
          stack: [
            { text: '\n\nTested by', alignment: 'center', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            {text: meta.testing_user.toUpperCase(), alignment: 'center', style: 'small' },
            { text: 'TESTING ASSISTANT', alignment: 'center', style: 'small' }
          ]
        },
        {
          width: '*',
          stack: [
            { text: '\n\nVerified by', alignment: 'center', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: 'JUNIOR ENGINEER', alignment: 'center', style: 'small' }
          ]
        },
        {
          width: '*',
          stack: [
            { text: '\n\nApproved by', alignment: 'center', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: meta.approving_user.toUpperCase(), alignment: 'center', style: 'small' },
            { text: 'ASSISTANT ENGINEER', alignment: 'center', style: 'small' }
          ]
        }
      ]
    };

    return [
      { text: 'Consumer Details', style: 'sectionTitle', noWrap: true },
      consumer,

      { text: 'Meter & Condition', style: 'sectionTitle', noWrap: true },
      summary,

      { text: 'Shunt & Nutral Readings', style: 'sectionTitle', noWrap: true },
      shunt,
      nutral,

      { text: 'Combined Error', style: 'sectionTitle', noWrap: true },
      combined,

      { text: 'Remarks', style: 'sectionTitle', noWrap: true },
      remarks,

      signatures
    ];
  }
}
