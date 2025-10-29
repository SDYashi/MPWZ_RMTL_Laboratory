import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

type TDocumentDefinitions = any;

export interface ContestedReportHeader {
  date: string;                // YYYY-MM-DD
  phase?: string;
  zone?: string;               // "3420100 - Zone ABC"
  location_code?: string;
  location_name?: string;

  testing_bench?: string;
  testing_user?: string;
  approving_user?: string;

  lab_name?: string;
  lab_address?: string;
  lab_email?: string;
  lab_phone?: string;

  leftLogoUrl?: string;
  rightLogoUrl?: string;

  report_id?: string;          // e.g. "CON-2025-000123"
}

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
  shunt_reading_before_test?: number | null;
  shunt_reading_after_test?: number | null;
  shunt_ref_start_reading?: number | null;
  shunt_ref_end_reading?: number | null;
  shunt_current_test?: string | null;
  shunt_creep_test?: string | null;
  shunt_dail_test?: string | null;
  shunt_error_percentage?: number | null;

  // NUTRAL readings
  nutral_reading_before_test?: number | null;
  nutral_reading_after_test?: number | null;
  nutral_ref_start_reading?: number | null;
  nutral_ref_end_reading?: number | null;
  nutral_current_test?: string | null;
  nutral_creep_test?: string | null;
  nutral_dail_test?: string | null;
  nutral_error_percentage?: number | null;

  // Combined error
  error_percentage_import?: number | null;

  // Free-form remark
  remark?: string;
}

export interface ContestedReportPdfOptions {
  fileName?: string; // default: CONTESTED_YYYY-MM-DD.pdf
}

@Injectable({ providedIn: 'root' })
export class ContestedReportPdfService {

  // ---------------- Public entrypoints ----------------
  async downloadFromBatch(header: ContestedReportHeader, rows: ContestedReportRow[], opts: ContestedReportPdfOptions = {}): Promise<void> {
    const doc = await this.buildDocWithLogos(header, rows);
    const name = opts.fileName || `CONTESTED_${header.date}.pdf`;
    await new Promise<void>((resolve) =>
      pdfMake.createPdf(doc).download(name, () => resolve())
    );
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

    // helper to turn /assets/... into base64
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
      if (header.leftLogoUrl) {
        images['leftLogo'] = await toDataURL(header.leftLogoUrl);
      }
      if (header.rightLogoUrl) {
        images['rightLogo'] = await toDataURL(header.rightLogoUrl);
      } else if (images['leftLogo']) {
        // fallback mirror
        images['rightLogo'] = images['leftLogo'];
      }
    } catch {
      // ignore logo load failures
    }

    return this.buildDoc(header, rows, images);
  }

  // ---------- Theme & helpers ----------
  private theme = {
    grid: '#e6e9ef',
    labelBg: '#f8f9fc',
    softHeaderBg: '#eef7ff',
    textSubtle: '#5d6b7a',
  };

  private dotted(n = 12) { return '·'.repeat(n); }
  private join(parts: Array<string | undefined | null>, sep = ' ') {
    return parts.filter(Boolean).join(sep);
  }
  private yesNo(v?: boolean) { return v ? 'YES' : 'NO'; }
  private fmtNum(n?: number | null) {
    return (n ?? '') === '' || n === null || n === undefined ? '' : String(n);
  }

  // check if SHUNT block has any real value
  private hasShunt(r: ContestedReportRow): boolean {
    return (
      r.shunt_reading_before_test != null ||
      r.shunt_reading_after_test != null ||
      r.shunt_ref_start_reading != null ||
      r.shunt_ref_end_reading != null ||
      (r.shunt_current_test && r.shunt_current_test.trim() !== '') ||
      (r.shunt_creep_test && r.shunt_creep_test.trim() !== '') ||
      (r.shunt_dail_test && r.shunt_dail_test.trim() !== '') ||
      r.shunt_error_percentage != null
    );
  }

  // check if NUTRAL block has any real value
  private hasNutral(r: ContestedReportRow): boolean {
    return (
      r.nutral_reading_before_test != null ||
      r.nutral_reading_after_test != null ||
      r.nutral_ref_start_reading != null ||
      r.nutral_ref_end_reading != null ||
      (r.nutral_current_test && r.nutral_current_test.trim() !== '') ||
      (r.nutral_creep_test && r.nutral_creep_test.trim() !== '') ||
      (r.nutral_dail_test && r.nutral_dail_test.trim() !== '') ||
      r.nutral_error_percentage != null
    );
  }

  // ---------- Core doc builder ----------
  private buildDoc(header: ContestedReportHeader, rows: ContestedReportRow[], images: Record<string, string> = {}): TDocumentDefinitions {
    // single-row PDF (1 meter per PDF)
    const r = rows[0] || ({} as ContestedReportRow);

    // build "meta" object that gets passed everywhere
    const meta = {
      date: header.date,
      phase: header.phase || '',
      zone: header.zone || this.join([header.location_code, header.location_name], ' - '),

      testing_bench: header.testing_bench || '-',
      testing_user: header.testing_user || '-',
      approving_user: header.approving_user || '-',

      lab_name: header.lab_name || '-',
      lab_address: header.lab_address || '-',
      lab_email: header.lab_email || '-',
      lab_phone: header.lab_phone || '-',

      report_id: header.report_id || `CON-${(header.date || '').replace(/-/g, '')}-${Math.floor(1000 + Math.random()*9000)}`
    };

    // pre-build section arrays
    const consumerSection = this.sectionConsumer(meta, r);
    const meterSection    = this.sectionMeter(meta, r);

    const shuntExists  = this.hasShunt(r);
    const nutralExists = this.hasNutral(r);

    const shuntBlock   = shuntExists  ? this.sectionShunt(r)  : null;
    const nutralBlock  = nutralExists ? this.sectionNutral(r) : null;

    const combinedSec  = this.sectionCombined(r);
    const remarksSec   = this.sectionRemarks(r);
    const signSec      = this.sectionSignatures(meta);

    const readingBlocks: any[] = [];
    if (shuntBlock || nutralBlock) {
      readingBlocks.push({ text: 'Shunt & Nutral Readings', style: 'sectionTitle', noWrap: true });
      if (shuntBlock)  readingBlocks.push(shuntBlock);
      if (nutralBlock) readingBlocks.push(nutralBlock);
    }

    return {
      pageSize: 'A4',
      pageMargins: [18, 80, 18, 34],
      images,
      header: this.headerBar(meta, images),
      footer: (current: number, total: number) => ({
        columns: [
          {
            text: `Page ${current} of ${total}`,
            alignment: 'left',
            margin: [18, 0, 0, 0],
            color: this.theme.textSubtle
          },
          {
            text: 'M.P.P.K.V.V.CO. LTD., INDORE',
            alignment: 'right',
            margin: [0, 0, 18, 0],
            color: this.theme.textSubtle
          }
        ],
        fontSize: 8
      }),
      defaultStyle: {
        fontSize: 9,
        color: '#111'
      },
      styles: {
        small: { fontSize: 8.5, color: this.theme.textSubtle },
        sectionTitle: {
          bold: true,
          fontSize: 11,
          color: '#0b2237',
          margin: [0, 10, 0, 4]
        },
        tableHeader: {
          bold: true,
          fillColor: this.theme.labelBg
        },
        labelCell: {
          bold: true,
          fillColor: this.theme.labelBg
        },
        valueCell: {}
      },
      tableLayouts: {
        cleanGrid: {
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
      content: [
        { text: 'Contested Meter Testing Report', style: 'sectionTitle', alignment: 'center', noWrap: true,   fontSize: 14, margin: [0, 0, 0, 6] },
        { text: 'Consumer Details', style: 'sectionTitle', noWrap: true },
        consumerSection,

        { text: 'Meter & Condition', style: 'sectionTitle', noWrap: true },
        meterSection,

        ...readingBlocks,

        { text: 'Combined Error', style: 'sectionTitle', noWrap: true },
        combinedSec,

        { text: 'Remarks', style: 'sectionTitle', noWrap: true },
        remarksSec,

        signSec
      ]
    };
  }

  // ----------------- Header Bar (top banner with logos, lab info, report_id) -----------------
  private headerBar(meta: any, images: Record<string,string>) {
    const labName = (meta.lab_name || '').toString().toUpperCase();
    const addr    = meta.lab_address || '';
    const mail    = meta.lab_email  || '';
    const phone   = meta.lab_phone  || '';

    return {
      margin: [18, 14, 18, 10],
      columnGap: 8,
            stack: [
        {
      columns: [
        images['leftLogo']
          ? { image: 'leftLogo', width: 32, alignment: 'left' }
          : { width: 32, text: '' },

        {
          width: '*',
          stack: [
            {
              text: 'MADHYA PRADESH PASCHIM KSHETRA VIDYUT VITARAN COMPANY LIMITED',
              alignment: 'center',
              bold: true,
              fontSize: 12
            },
            {
              text: labName || '',
              alignment: 'center',
              color: '#333',
              margin: [0, 2, 0, 0],
              fontSize: 11
            },
            {
              text: addr,
              alignment: 'center',
              color: '#555',
              margin: [0, 2, 0, 0],
              fontSize: 9
            },
            {
              text: `Email: ${mail}    Phone: ${phone}`,
              alignment: 'center',
              color: '#555',
              margin: [0, 2, 2, 0],
              fontSize: 9
            },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 500, y2: 0, lineWidth: 1 ,  margin: [0, 2, 0, 0], }] },
          ]
        },

        images['rightLogo']
          ? { image: 'rightLogo', width: 32, alignment: 'right' }
          : { width: 32, text: '' }
      ]
    
        }
      ]
    };
  }

  // ----------------- Section builders -----------------

  // Helpers to generate common row layout of 4 cells (label/value + label/value)
  private row4(l1: string, v1: any, l2: string, v2: any) {
    return [
      { text: l1, style: 'labelCell' },
      { text: (v1 ?? '').toString(), style: 'valueCell' },
      { text: l2, style: 'labelCell' },
      { text: (v2 ?? '').toString(), style: 'valueCell' }
    ];
  }

  // Long value taking up the rest of row
  private row2(label: string, value: any) {
    return [
      { text: label, style: 'labelCell' },
      {
        text: (value ?? '').toString(),
        style: 'valueCell',
        colSpan: 3
      },
      {},
      {}
    ];
  }

  // ---------- Consumer Details ----------
  private sectionConsumer(meta: any, r: ContestedReportRow) {
    return {
      margin: [0, 2, 0, 0],
      layout: 'cleanGrid',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          this.row4('Zone / DC', meta.zone || '-', 'Date', meta.date || '-'),
          this.row4('Phase', meta.phase || '-', 'Testing Bench', meta.testing_bench || '-'),
          this.row4('Testing User', meta.testing_user || '-', 'Approving User', meta.approving_user || '-'),
          this.row2('Name of Consumer', r.consumer_name || ''),
          this.row2('Account / IVRS', r.account_no_ivrs || ''),
          this.row2('Address', r.address || ''),
          this.row2('Contested By', r.contested_by || ''),
          this.row2('Payment Particulars', r.payment_particulars || ''),
          this.row2(
            'Receipt No & Date',
            `${r.receipt_no || ''}    ${r.receipt_date || ''}`
          )
        ]
      }
    };
  }

  // ---------- Meter & Condition ----------
  private sectionMeter(meta: any, r: ContestedReportRow) {
    return {
      margin: [0, 2, 0, 0],
      layout: 'cleanGrid',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [
            {
              text: 'Meter & Testing Summary',
              colSpan: 4,
              alignment: 'center',
              bold: true,
              fillColor: this.theme.labelBg
            },
            {},
            {},
            {}
          ],
          this.row4(
            'Meter No.',
            r.serial || this.dotted(10),
            'Make',
            r.make || this.dotted(10)
          ),
          this.row4(
            'Capacity',
            r.capacity || this.dotted(10),
            'Removal Reading',
            this.fmtNum(r.removal_reading) || this.dotted(8)
          ),
          this.row4(
            'Physical Condition',
            r.physical_condition_of_device || '',
            'Found Burnt',
            this.yesNo(r.is_burned)
          ),
          this.row4(
            'Body Seal',
            r.seal_status || '',
            'Glass Cover',
            r.meter_glass_cover || ''
          ),
          this.row4(
            'Terminal Block',
            r.terminal_block || '',
            'Meter Body',
            r.meter_body || ''
          ),
          this.row2('Any Other', r.other || '')
        ]
      }
    };
  }

  // ---------- SHUNT block ----------
  private sectionShunt(r: ContestedReportRow) {
    return {
      margin: [0, 2, 0, 0],
      layout: 'cleanGrid',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [
            {
              text: 'SHUNT READINGS',
              colSpan: 4,
              alignment: 'center',
              bold: true,
              fillColor: this.theme.softHeaderBg
            },
            {},
            {},
            {}
          ],
          this.row4(
            'Reading Before Test',
            this.fmtNum(r.shunt_reading_before_test),
            'Reading After Test',
            this.fmtNum(r.shunt_reading_after_test)
          ),
          this.row4(
            'Ref Start',
            this.fmtNum(r.shunt_ref_start_reading),
            'Ref End',
            this.fmtNum(r.shunt_ref_end_reading)
          ),
          this.row4(
            'Starting Current Test',
            r.shunt_current_test || '',
            'Creep Test',
            r.shunt_creep_test || ''
          ),
          this.row4(
            'Dial Test',
            r.shunt_dail_test || '',
            'Error % (Shunt)',
            this.fmtNum(r.shunt_error_percentage)
          )
        ]
      }
    };
  }

  // ---------- NUTRAL block ----------
  private sectionNutral(r: ContestedReportRow) {
    return {
      margin: [0, 6, 0, 0],
      layout: 'cleanGrid',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [
            {
              text: 'NUTRAL READINGS',
              colSpan: 4,
              alignment: 'center',
              bold: true,
              fillColor: this.theme.softHeaderBg
            },
            {},
            {},
            {}
          ],
          this.row4(
            'Reading Before Test',
            this.fmtNum(r.nutral_reading_before_test),
            'Reading After Test',
            this.fmtNum(r.nutral_reading_after_test)
          ),
          this.row4(
            'Ref Start',
            this.fmtNum(r.nutral_ref_start_reading),
            'Ref End',
            this.fmtNum(r.nutral_ref_end_reading)
          ),
          this.row4(
            'Starting Current Test',
            r.nutral_current_test || '',
            'Creep Test',
            r.nutral_creep_test || ''
          ),
          this.row4(
            'Dial Test',
            r.nutral_dail_test || '',
            'Error % (Nutral)',
            this.fmtNum(r.nutral_error_percentage)
          )
        ]
      }
    };
  }

  // ---------- Combined Error ----------
  private sectionCombined(r: ContestedReportRow) {
    return {
      margin: [0, 2, 0, 0],
      layout: 'cleanGrid',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [
            {
              text: 'COMBINED RESULT',
              colSpan: 4,
              alignment: 'center',
              bold: true,
              fillColor: this.theme.labelBg
            },
            {},
            {},
            {}
          ],
          this.row4(
            'Final Error % (Combined)',
            this.fmtNum(r.error_percentage_import),
            '',
            ''
          )
        ]
      }
    };
  }

  // ---------- Remarks ----------
  private sectionRemarks(r: ContestedReportRow) {
    return {
      margin: [0, 2, 0, 0],
      layout: 'cleanGrid',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [ this.row2('Remark', r.remark || '') ]
      }
    };
  }

  // ---------- Signatures ----------
  private sectionSignatures(meta: any) {
    return {
      margin: [0, 12, 0, 0],
      columns: [
        {
          width: '*',
          stack: [
            { text: '\n\nTested by', alignment: 'center', bold: true },
            { text: '\n____________________________', alignment: 'center' },
            { text: (meta.testing_user || '').toUpperCase(), alignment: 'center', style: 'small' },
            { text: 'TESTING ASSISTANT', alignment: 'center', style: 'small' }
          ]
        },
        {
          width: '*',
          stack: [
            { text: '\n\nVerified by', alignment: 'center', bold: true },
            { text: '\n____________________________', alignment: 'center' },            
              { text: ('-').toUpperCase(), style: 'small', alignment: 'center' },
            { text: 'JUNIOR ENGINEER', alignment: 'center', style: 'small' }
          ]
        },
        {
          width: '*',
          stack: [
            { text: '\n\nApproved by', alignment: 'center', bold: true },
            { text: '\n____________________________', alignment: 'center' },
            { text: (meta.approving_user || '').toUpperCase(), alignment: 'center', style: 'small' },
            { text: 'ASSISTANT ENGINEER', alignment: 'center', style: 'small' }
          ]
        }
      ]
    };
  }
}
