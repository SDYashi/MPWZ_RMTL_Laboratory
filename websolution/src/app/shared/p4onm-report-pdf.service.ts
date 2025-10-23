import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

type TDocumentDefinitions = any;

/** Header metadata supplied by the page when exporting */
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

/** One meter = one PDF page */
export interface P4ONMReportRow {
  // Identity
  serial: string;
  make?: string;
  capacity?: string;
  removal_reading?: number;

  // Consumer / fee slip
  consumer_name?: string;
  account_no_ivrs?: string;
  address?: string;
  /** Some UIs use "contested_by", legacy used "p4onm_by"; we will render whichever is present */
  contested_by?: string;
  p4onm_by?: string;
  payment_particulars?: string;
  receipt_no?: string;
  receipt_date?: string;
  condition_at_removal?: string;

  // Device condition & general readings
  testing_date?: string;
  physical_condition_of_device?: string;
  is_burned?: boolean;
  seal_status?: string;
  meter_glass_cover?: string;
  terminal_block?: string;
  meter_body?: string;
  other?: string;

  // Legacy/overall import calc (kept for back-compat; UI may still show)
  reading_before_test?: number | null;
  reading_after_test?: number | null;

  // Dial test summary (legacy)
  rsm_kwh?: number | null;
  meter_kwh?: number | null;
  error_percentage?: number | null;

  // ---- SHUNT set ----
  shunt_reading_before_test?: number | null;
  shunt_reading_after_test?: number | null;
  shunt_ref_start_reading?: number | null;
  shunt_ref_end_reading?: number | null;
  shunt_current_test?: string | null;
  shunt_creep_test?: string | null;
  shunt_dail_test?: string | null;
  shunt_error_percentage?: number | null;

  // ---- NUTRAL set (rendered as "NEUTRAL") ----
  nutral_reading_before_test?: number | null;
  nutral_reading_after_test?: number | null;
  nutral_ref_start_reading?: number | null;
  nutral_ref_end_reading?: number | null;
  nutral_current_test?: string | null;
  nutral_creep_test?: string | null;
  nutral_dail_test?: string | null;
  nutral_error_percentage?: number | null;

  // Combined final error chosen from a mode (import)
  error_percentage_import?: number | null;

  // Final remarks (DB: final_remarks)
  final_remarks?: string | null;
}

export interface P4ONMPdfOptions {
  fileName?: string; // default: P4_ONM_YYYY-MM-DD.pdf
}

@Injectable({ providedIn: 'root' })
export class P4onmReportPdfService {
  // ---------- Theme ----------
  private theme = {
    ok: '#198754',
    fail: '#dc3545',
    na: '#6c757d',
    grid: '#e6e9ef',
    subtleText: '#5d6b7a',
    labelBg: '#f8f9fc'
  };

  // ---------- Public API ----------
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
      const res = await fetch(abs, { cache: 'no-cache' });
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
      }
      // mirror if only one provided
      if (!images['rightLogo'] && images['leftLogo']) images['rightLogo'] = images['leftLogo'];
      if (!images['leftLogo'] && images['rightLogo']) images['leftLogo'] = images['rightLogo'];
    } catch {
      // swallow image fetch errors — header will just hide missing logos
    }

    return this.buildDoc(header, rows, images);
  }

  // ---------- helpers ----------
  private dotted(n = 12) { return '·'.repeat(n); }
  private join(parts: Array<string | undefined | null>, sep = ' ') { return parts.filter(Boolean).join(sep); }
  private yesNo(v?: boolean) { return v ? 'YES' : 'NO'; }
  private present(v: any) { return v !== undefined && v !== null && v !== ''; }
  private fmtNum(v: number | null | undefined, frac = 2) { return this.present(v) ? Number(v).toFixed(frac) : ''; }

  private badge(val?: string | null) {
    const v = (val || '').toUpperCase();
    const color = (v === 'OK' || v === 'PASS') ? this.theme.ok : v === 'FAIL' ? this.theme.fail : this.theme.na;
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

  private hasShunt(r: P4ONMReportRow): boolean {
    return [
      r.shunt_reading_before_test,
      r.shunt_reading_after_test,
      r.shunt_ref_start_reading,
      r.shunt_ref_end_reading,
      r.shunt_current_test,
      r.shunt_creep_test,
      r.shunt_dail_test,
      r.shunt_error_percentage
    ].some(this.present);
  }
  private hasNutral(r: P4ONMReportRow): boolean {
    return [
      r.nutral_reading_before_test,
      r.nutral_reading_after_test,
      r.nutral_ref_start_reading,
      r.nutral_ref_end_reading,
      r.nutral_current_test,
      r.nutral_creep_test,
      r.nutral_dail_test,
      r.nutral_error_percentage
    ].some(this.present);
  }

  // ---------- document ----------
  private buildDoc(header: P4ONMReportHeader, rows: P4ONMReportRow[], images: Record<string, string> = {}): TDocumentDefinitions {
    const meta = {
      date: header.date,
      zone: header.zone || this.join([header.location_code, header.location_name], ' - '),
      phase: header.phase || '-',
      testing_bench: header.testing_bench || '-',
      testing_user: header.testing_user || '-',
      approving_user: header.approving_user || '-',
      lab_name: header.lab_name || '-',
      lab_address: header.lab_address || '-',
      lab_email: header.lab_email || '-',
      lab_phone: header.lab_phone || '-',
      report_id: header.report_id || `P4-${header.date.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`
    };

    const content: any[] = [];
    rows.forEach((r, idx) => {
      content.push(...this.pageForRow(r, meta));
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

  private headerBar(meta: any, images: Record<string, string>) {
    const logoBox = [42, 42] as [number, number];
    return {
      margin: [18, 10, 18, 8],
      columns: [
        images['leftLogo'] ? { image: 'leftLogo', fit: logoBox, alignment: 'left', margin: [0, 0, 8, 0] } : { width: logoBox[0], text: '' },
        {
          width: '*',
          stack: [
            { text: 'MADHYA PRADESH PASCHIM KSHETRA VIDYUT VITARAN COMPANY LIMITED', alignment: 'center', bold: true, fontSize: 13 },
            { text: (meta.lab_name || '').toUpperCase(), alignment: 'center', color: '#666', margin: [0, 2, 0, 0], fontSize: 11 },
            { text: meta.lab_address, alignment: 'center', color: '#666', margin: [0, 2, 0, 0], fontSize: 10 },
            { text: `Email: ${meta.lab_email} • Phone: ${meta.lab_phone}`, alignment: 'center', color: '#666', margin: [0, 2, 0, 0], fontSize: 9 },
          ]
        },
        images['rightLogo'] ? { image: 'rightLogo', fit: logoBox, alignment: 'right', margin: [8, 0, 0, 0] } : { width: logoBox[0], text: '' }
      ]
    };
  }

  private pageForRow(
    r: P4ONMReportRow,
    meta: {
      date: string; zone?: string; phase?: string;
      testing_bench: string; testing_user: string; approving_user: string;
      lab_name: string; lab_address: string; lab_email: string; lab_phone: string; report_id: string;
    }
  ): any[] {

    const row4 = (l1: string, v1: any, l2: string, v2: any) => ([
      { text: l1, bold: true, fillColor: this.theme.labelBg }, { text: (v1 ?? '').toString() },
      { text: l2, bold: true, fillColor: this.theme.labelBg }, { text: (v2 ?? '').toString() },
    ]);
    const row2 = (label: string, value: any) => ([
      { text: label, bold: true, fillColor: this.theme.labelBg },
      { text: (value ?? '').toString(), colSpan: 3 }, {}, {}
    ]);

    const topRule = { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 540, y2: 0, lineWidth: 1 }], margin: [0, 6, 0, 6] };

    const metaTopLine = {
      margin: [0, 0, 0, 6],
      columns: [
        { text: `NO ${this.dotted(20)}` },
        { text: `DATE ${meta.date}`, alignment: 'right' }
      ]
    };

    const reportTitle = { text: 'P4 O&M METER TEST REPORT', alignment: 'center', bold: true, margin: [0, 0, 0, 6], fontSize: 14 };

    // PHASE / BENCH / TESTING USER / APPROVING USER (single row)
    const infoTable = {
      layout: 'tightGrid',
      margin: [0, 0, 0, 6],
      table: {
        widths: ['auto','*','auto','*','auto','*','auto','*'],
        body: [[
          { text: 'PHASE', bold: true, fillColor: this.theme.labelBg }, { text: meta.phase || '-' },
          { text: 'TESTING BENCH', bold: true, fillColor: this.theme.labelBg }, { text: meta.testing_bench || '-' },
          { text: 'TESTING USER', bold: true, fillColor: this.theme.labelBg }, { text: meta.testing_user || '-' },
          { text: 'APPROVING USER', bold: true, fillColor: this.theme.labelBg }, { text: meta.approving_user || '-' }
        ]]
      }
    };

    // Consumer slip
    const slip = {
      layout: 'tightGrid',
      margin: [0, 0, 0, 6],
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          row4('Name of Consumer', r.consumer_name || '', 'Account / IVRS', r.account_no_ivrs || ''),
          row2('Address', r.address || ''),
          row2('P4 O&M Meter by (Consumer/Zone)', (r.contested_by || r.p4onm_by || '')),
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
          row4('Capacity', r.capacity || this.dotted(10), 'Reading (Removal)', this.present(r.removal_reading) ? this.fmtNum(r.removal_reading, 3) : this.dotted(8))
        ]
      }
    };

    const rightMeta = {
      columns: [
        { width: '*', text: '' },
        {
          width: 'auto',
          stack: [
            { text: `Zone/DC: ${meta.zone || '-'}`, color: this.theme.subtleText, fontSize: 9, alignment: 'right' },
            { text: `Report ID: ${meta.report_id}`, color: this.theme.subtleText, fontSize: 9, alignment: 'right', margin: [0, 2, 0, 0] },
            // Small QR for quick lookup (pdfmake built-in)
            { qr: `${meta.report_id}|${r.serial}`, fit: 56, alignment: 'right', margin: [0, 4, 0, 0] }
          ]
        }
      ],
      margin: [0, 0, 0, 8]
    };

    const signAej = {
      stack: [
        { text: 'As Received from', alignment: 'right', bold: true, margin: [0, 0, 0, 4] },
        { text: meta.zone || '-', alignment: 'right', italics: true, fontSize: 9 },
        { text: 'MPPKVVCL Indore', alignment: 'right', italics: true, fontSize: 9, margin: [0, 0, 0, 8] }
      ]
    };

    const labBlockHead = {
      stack: [
        { text: 'To be filled by Testing Section Laboratory', alignment: 'center', bold: true, margin: [0, 0, 0, 6] }
      ]
    };

    // Device condition
    const rmtlGrid = {
      layout: 'tightGrid',
      margin: [0, 0, 0, 6],
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          row4('Date of Testing', r.testing_date || meta.date, 'Physical Condition of Meter', r.physical_condition_of_device || ''),
          row4('Whether Found Burnt', this.yesNo(r.is_burned), 'Meter Body Seal', r.seal_status || ''),
          row4('Meter Glass Cover', r.meter_glass_cover || '', 'Terminal Block', r.terminal_block || ''),
          row4('Meter Body', r.meter_body || '', 'Any Other', r.other || '')
        ]
      }
    };

    // SHUNT block (conditional)
    const shuntGrid = {
      layout: 'tightGrid',
      margin: [0, 0, 0, 6],
      table: {
        headerRows: 1,
        widths: ['*','*','*','*'],
        body: [
          [{ text: 'SHUNT READINGS', colSpan: 4, alignment: 'center', bold: true, fillColor: this.theme.labelBg }, {}, {}, {}],
          [
            { text: 'Before Test', bold: true, fillColor: this.theme.labelBg },
            { text: this.fmtNum(r.shunt_reading_before_test) },
            { text: 'After Test', bold: true, fillColor: this.theme.labelBg },
            { text: this.fmtNum(r.shunt_reading_after_test) }
          ],
          [
            { text: 'Ref Start', bold: true, fillColor: this.theme.labelBg },
            { text: this.fmtNum(r.shunt_ref_start_reading) },
            { text: 'Ref End', bold: true, fillColor: this.theme.labelBg },
            { text: this.fmtNum(r.shunt_ref_end_reading) }
          ],
          [
            { text: 'Error % (Shunt)', bold: true, fillColor: this.theme.labelBg },
            { text: this.fmtNum(r.shunt_error_percentage) },
            { text: '', border: [false,false,false,false] },
            { text: '', border: [false,false,false,false] }
          ],
          [
            { text: 'Starting Current', bold: true, fillColor: this.theme.labelBg }, this.badge(r.shunt_current_test),
            { text: 'Creep Test', bold: true, fillColor: this.theme.labelBg }, this.badge(r.shunt_creep_test),
          ],
          [
            { text: 'Dial Test', bold: true, fillColor: this.theme.labelBg }, this.badge(r.shunt_dail_test),
            { text: '', border: [false,false,false,false] }, { text: '', border: [false,false,false,false] }
          ]
        ]
      }
    };

    // NEUTRAL block (conditional; fields remain "nutral_*")
    const neutralGrid = {
      layout: 'tightGrid',
      margin: [0, 0, 0, 6],
      table: {
        headerRows: 1,
        widths: ['*','*','*','*'],
        body: [
          [{ text: 'NEUTRAL READINGS', colSpan: 4, alignment: 'center', bold: true, fillColor: this.theme.labelBg }, {}, {}, {}],
          [
            { text: 'Before Test', bold: true, fillColor: this.theme.labelBg },
            { text: this.fmtNum(r.nutral_reading_before_test) },
            { text: 'After Test', bold: true, fillColor: this.theme.labelBg },
            { text: this.fmtNum(r.nutral_reading_after_test) }
          ],
          [
            { text: 'Ref Start', bold: true, fillColor: this.theme.labelBg },
            { text: this.fmtNum(r.nutral_ref_start_reading) },
            { text: 'Ref End', bold: true, fillColor: this.theme.labelBg },
            { text: this.fmtNum(r.nutral_ref_end_reading) }
          ],
          [
            { text: 'Error % (Neutral)', bold: true, fillColor: this.theme.labelBg },
            { text: this.fmtNum(r.nutral_error_percentage) },
            { text: '', border: [false,false,false,false] },
            { text: '', border: [false,false,false,false] }
          ],
          [
            { text: 'Starting Current', bold: true, fillColor: this.theme.labelBg }, this.badge(r.nutral_current_test),
            { text: 'Creep Test', bold: true, fillColor: this.theme.labelBg }, this.badge(r.nutral_creep_test),
          ],
          [
            { text: 'Dial Test', bold: true, fillColor: this.theme.labelBg }, this.badge(r.nutral_dail_test),
            { text: '', border: [false,false,false,false] }, { text: '', border: [false,false,false,false] }
          ]
        ]
      }
    };

    // Final/combined error (Import)
    const combinedError = this.present(r.error_percentage_import) ? {
      layout: 'tightGrid',
      margin: [0, 0, 0, 10],
      table: {
        widths: ['auto','*'],
        body: [
          [{ text: 'Final Error % (Import)', bold: true, fillColor: this.theme.labelBg }, { text: String(r.error_percentage_import) }]
        ]
      }
    } : null;

    // Optional legacy “results” block (only if any legacy fields present)
    const showLegacy = [r.rsm_kwh, r.meter_kwh, r.error_percentage, r.reading_before_test, r.reading_after_test].some(this.present);
    const legacyResults = showLegacy ? {
      layout: 'tightGrid',
      margin: [0, 0, 0, 6],
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          row4('Before Test (Legacy)', this.fmtNum(r.reading_before_test), 'After Test (Legacy)', this.fmtNum(r.reading_after_test)),
          row4('Dial Test (RSM kWh)', this.fmtNum(r.rsm_kwh), 'Dial Test (Meter kWh)', this.fmtNum(r.meter_kwh)),
          row4('% Error (Overall Legacy)', this.fmtNum(r.error_percentage), '—', '—')
        ]
      }
    } : null;

    const remarksBlock = this.present(r.final_remarks) ? {
      layout: 'tightGrid',
      margin: [0, 0, 0, 10],
      table: {
        widths: ['*'],
        body: [
          [{ text: 'Remarks', bold: true, fillColor: this.theme.labelBg }],
          [{ text: (r.final_remarks || ''), noWrap: false }]
        ]
      }
    } : null;

    const testedBy = {
      margin: [0, 8, 0, 0],
      columns: [
        {
          width: '*',
          stack: [
            { text: 'Tested by', alignment: 'center', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: meta.testing_user, alignment: 'center', color: this.theme.subtleText, fontSize: 9 },
            { text: 'TESTING ASSISTANT ', alignment: 'center', color: this.theme.subtleText, fontSize: 9 }
          ]
        },
        {
          width: '*',
          stack: [
            { text: 'Verified by', alignment: 'center', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: 'JUNIOR ENGINEER ', alignment: 'center', color: this.theme.subtleText, fontSize: 9 }
          ]
        },
        {
          width: '*',
          stack: [
            { text: 'Approved by', alignment: 'center', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: meta.approving_user, alignment: 'center', color: this.theme.subtleText, fontSize: 9 },
            { text: 'ASSISTANT ENGINEER ', alignment: 'center', color: this.theme.subtleText, fontSize: 9 }
          ]
        }
      ]
    };

    // Assemble page blocks (with conditions)
    const blocks: any[] = [
      topRule,
      metaTopLine,
      reportTitle,
      infoTable,
      rightMeta,
      slip,
      slipMeter,
      signAej,
      labBlockHead,
      rmtlGrid
    ];

    if (this.hasShunt(r)) blocks.push(shuntGrid);
    if (this.hasNutral(r)) blocks.push(neutralGrid);

    if (combinedError) blocks.push(combinedError);
    if (legacyResults) blocks.push(legacyResults);
    if (remarksBlock) blocks.push(remarksBlock);

    blocks.push(testedBy);
    return blocks;
  }
}
