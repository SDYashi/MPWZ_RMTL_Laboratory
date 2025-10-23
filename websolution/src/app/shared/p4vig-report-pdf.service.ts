import { Injectable } from '@angular/core';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Register default fonts
(pdfMake as any).vfs = pdfFonts.vfs;

export interface VigHeader {
  location_code?: string;
  location_name?: string;
  testMethod?: string | null;
  testStatus?: string | null;

  // meta
  date?: string;
  testing_bench?: string | null;
  testing_user?: string | null;

  // lab info + logos
  lab_name?: string | null;
  lab_address?: string | null;
  lab_email?: string | null;
  lab_phone?: string | null;
  leftLogoUrl?: string | null;
  rightLogoUrl?: string | null;
}

export interface VigRow {
  serial: string;
  make?: string;
  capacity?: string;
  removal_reading?: number;
  test_result?: string;

  // Consumer Information
  consumer_name?: string;
  address?: string;
  account_number?: string;
  division_zone?: string;
  panchanama_no?: string;
  panchanama_date?: string;
  condition_at_removal?: string;

  // Physical Condition
  testing_date?: string;
  is_burned?: boolean;
  seal_status?: string;
  meter_glass_cover?: string;
  terminal_block?: string;
  meter_body?: string;
  other?: string;

  // Test Type Selection
  test_type?: 'SHUNT' | 'NEUTRAL' | 'BOTH';
  meter_type?: 'NETMETER' | 'NON_SMARTMETER';

  // Shunt Fields
  shunt_reading_before_test?: number | null;
  shunt_reading_after_test?: number | null;
  shunt_ref_start_reading?: number | null;
  shunt_ref_end_reading?: number | null;
  shunt_error_percentage?: number | null;
  shunt_current_test?: string | null;
  shunt_creep_test?: string | null;
  shunt_dail_test?: string | null;

  // Neutral Fields
  nutral_reading_before_test?: number | null;
  nutral_reading_after_test?: number | null;
  nutral_ref_start_reading?: number | null;
  nutral_ref_end_reading?: number | null;
  nutral_error_percentage?: number | null;
  nutral_current_test?: string | null;
  nutral_creep_test?: string | null;
  nutral_dail_test?: string | null;

  // Import/Export Fields
  start_reading_import?: number | null;
  final_reading_import?: number | null;
  difference_import?: number | null;
  start_reading_export?: number | null;
  final_reading_export?: number | null;
  difference_export?: number | null;
  final_Meter_Difference?: number | null;
  error_percentage_import?: number | null;
  error_percentage_export?: number | null;

  // Additional Fields
  certificate_number?: string;
  testing_fees?: string;
  fees_mr_no?: string;
  fees_mr_date?: string;
  ref_no?: string;
  test_requester_name?: string;
  meter_removaltime_metercondition?: number | null;
  any_other_remarkny_zone?: string;
  dail_test_kwh_rsm?: number | null;
  recorderedbymeter_kwh?: number | null;
  final_remarks?: string;
  p4_division?: string;
  p4_no?: string;
  p4_date?: string;
  p4_metercodition?: string;
  approver_remark?: string;

  // Technical Fields
  dial_testby?: string;

  remark?: string | null;
}

@Injectable({ providedIn: 'root' })
export class P4VigReportPdfService {
  private theme = {
    ok: '#198754',
    fail: '#dc3545',
    na: '#6c757d',
    grid: '#e6e9ef',
    subtle: '#5d6b7a',
    labelBg: '#f8f9fc',
    head: '#151433',
  };

  private dotted(n = 10) { return '·'.repeat(n); }
  private present(v: any) { return v !== undefined && v !== null && v !== ''; }
  private fmtNum(v: number | null | undefined, frac = 2) {
    return this.present(v) ? Number(v).toFixed(frac) : '';
  }

  constructor() {
    // Define custom table layout globally (tight grid like UI)
    (pdfMake as any).tableLayouts = {
      ...(pdfMake as any).tableLayouts,
      tightGrid: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => this.theme.grid,
        vLineColor: () => this.theme.grid,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 2,
        paddingBottom: () => 2,
      },
    };
  }

  async download(header: VigHeader, rows: VigRow[], fileName = 'P4_VIG_CONTESTED_REPORTS.pdf') {
    const doc = await this.buildDocWithLogos(header, rows);
    await new Promise<void>((resolve) =>
      pdfMake.createPdf(doc).download(fileName, () => resolve())
    );
  }

  async open(header: VigHeader, rows: VigRow[]) {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).open();
  }

  async print(header: VigHeader, rows: VigRow[]) {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).print();
  }

  // ---- internals ----
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
        images['leftLogo'] = isData(header.leftLogoUrl)
          ? header.leftLogoUrl!
          : await toDataURL(header.leftLogoUrl!);
      }
      if (header.rightLogoUrl) {
        images['rightLogo'] = isData(header.rightLogoUrl)
          ? header.rightLogoUrl!
          : await toDataURL(header.rightLogoUrl!);
      }
      // Mirror single provided logo to both sides
      if (!images['leftLogo'] && images['rightLogo']) images['leftLogo'] = images['rightLogo'];
      if (!images['rightLogo'] && images['leftLogo']) images['rightLogo'] = images['leftLogo'];
    } catch {
      // Skip logos if fetch fails
    }

    return this.buildDoc(header, rows, images);
  }

  private headerBar(meta: any, images: Record<string, string>): Content {
    const logoBox = [42, 42] as [number, number];

    return {
      margin: [18, 12, 18, 10],
      columns: [
        images['leftLogo']
          ? { image: 'leftLogo', fit: logoBox, alignment: 'left', margin: [0, 0, 10, 0] }
          : { width: logoBox[0], text: '' },

        {
          width: '*',
          stack: [
            {
              text: 'MADHYA PRADESH PASCHIM KSHETRA VIDYUT VITARAN COMPANY LIMITED',
              alignment: 'center',
              bold: true,
              fontSize: 13,
            },
            {
              text: (meta.lab_name || 'REGIONAL METER TESTING LABORATORY').toUpperCase(),
              alignment: 'center',
              color: '#333',
              margin: [0, 2, 0, 0],
              fontSize: 11,
            },
            {
              text: meta.lab_address || '',
              alignment: 'center',
              color: '#444',
              margin: [0, 2, 0, 0],
              fontSize: 10,
            },
            {
              text: `Email: ${meta.lab_email || '-'} • Phone: ${meta.lab_phone || '-'}`,
              alignment: 'center',
              color: '#444',
              margin: [0, 2, 0, 0],
              fontSize: 9,
            },
          ],
        },

        images['rightLogo']
          ? { image: 'rightLogo', fit: logoBox, alignment: 'right', margin: [10, 0, 0, 0] }
          : { width: logoBox[0], text: '' },
      ],
    };
  }

  private badge(val?: string | null) {
    const v = (val || '').toUpperCase();
    const color = v === 'OK' || v === 'PASS' ? this.theme.ok : v === 'FAIL' ? this.theme.fail : this.theme.na;
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

  private buildDoc(
    header: VigHeader,
    rows: VigRow[],
    images: Record<string, string>
  ): TDocumentDefinitions {
    const zone =
      (header.location_code ? header.location_code + ' - ' : '') +
      (header.location_name || '');
    const meta = {
      zone,
      method: header.testMethod || '-',
      status: header.testStatus || '-',
      bench: header.testing_bench || '-',
      user: header.testing_user || '-',
      date: header.date || '',
      lab_name: header.lab_name || 'REGIONAL METER TESTING LABORATORY, INDORE',
      lab_address:
        header.lab_address ||
        'MPPKVVCL Near Conference Hall, Polo Ground, Indore (MP) 452003',
      lab_email: header.lab_email || 'testinglabwzind@gmail.com',
      lab_phone: header.lab_phone || '0731-2997802',
    };

    const content: any[] = [];
    const data = (rows || []).filter((r) => (r.serial || '').trim());
    data.forEach((r, idx) => {
      content.push(...this.pageForRow(r, meta));
      if (idx < data.length - 1) content.push({ text: '', pageBreak: 'after' });
    });

    return {
      pageSize: 'A4',
      pageMargins: [18, 74, 18, 34],
      defaultStyle: { fontSize: 9.5, color: '#111' },
      images,
      header: this.headerBar(meta, images),
      footer: (current: number, total: number) => ({
        columns: [
          {
            text: `Page ${current} of ${total}`,
            alignment: 'left',
            margin: [18, 0, 0, 0],
            color: this.theme.subtle,
          },
          {
            text: 'M.P.P.K.V.V.CO. LTD., INDORE',
            alignment: 'right',
            margin: [0, 0, 18, 0],
            color: this.theme.subtle,
          },
        ],
        fontSize: 8,
      }),
      content,
    };
  }

  private pageForRow(
    r: VigRow,
    meta: { zone: string; method: string; status: string; bench: string; user: string; date: string }
  ): any[] {
    const lbl = { bold: true };
    const two = (label: string, value: any) => [
      { text: label, ...lbl, fillColor: this.theme.labelBg },
      { text: (value ?? '').toString() },
    ];

    const titleBand = [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 540, y2: 0, lineWidth: 1 }], margin: [0, 6, 0, 6] },
      { text: 'TEST RESULT FOR CONTESTED METER (P4 - VIG)', alignment: 'center', bold: true, margin: [0, 0, 0, 6], fontSize: 14 },
    ];

    const metaRow = {
      layout: 'tightGrid',
      margin: [0, 0, 0, 8],
      table: {
        widths: ['auto', '*', 'auto', '*', 'auto', '*', 'auto', '*'],
        body: [[
          { text: 'Zone/DC', ...lbl, fillColor: this.theme.labelBg }, { text: meta.zone || '-' },
          { text: 'Method',  ...lbl, fillColor: this.theme.labelBg }, { text: meta.method || '-' },
          { text: 'Status',  ...lbl, fillColor: this.theme.labelBg }, { text: meta.status || '-' },
          { text: 'Bench',   ...lbl, fillColor: this.theme.labelBg }, { text: meta.bench || '-' },
        ]],
      },
    };

    const metaRow2 = {
      layout: 'tightGrid',
      margin: [0, 0, 0, 8],
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [[
          { text: 'Testing User', ...lbl, fillColor: this.theme.labelBg }, { text: meta.user || '-' },
          { text: 'Date',         ...lbl, fillColor: this.theme.labelBg }, { text: meta.date || '-' },
        ]],
      },
    };

    const consumerInfo = {
      layout: 'tightGrid',
      table: {
        widths: [210, '*'],
        body: [
          two('1. NAME OF CONSUMER', r.consumer_name),
          two('2. ADDRESS', r.address),
          two('3. ACCOUNT NUMBER', r.account_number),
          two('4. NAME OF DIVISION/ZONE', r.division_zone),
          two('5. PANCHANAMA NO. & DATE', `${r.panchanama_no || ''}${r.panchanama_no && r.panchanama_date ? '   Dt ' : ''}${r.panchanama_date || ''}`),
          two('6. METER CONDITION AS NOTED AT THE TIME OF REMOVAL', r.condition_at_removal),
        ],
      },
    };

    const meterDetails = {
      layout: 'tightGrid',
      margin: [0, 8, 0, 0],
      table: {
        widths: ['*', '*', '*', '*'],
        body: [
          [
            { text: 'METER NO.', ...lbl, fillColor: this.theme.labelBg },
            { text: 'MAKE', ...lbl, fillColor: this.theme.labelBg },
            { text: 'CAPACITY', ...lbl, fillColor: this.theme.labelBg },
            { text: 'READING AT REMOVAL', ...lbl, fillColor: this.theme.labelBg },
          ],
          [r.serial || '', r.make || '', r.capacity || '', this.fmtNum(r.removal_reading, 3)],
        ],
      },
    };

    const rmtlHead = {
      text: 'TO BE FILLED BY TESTING SECTION LABORATORY',
      alignment: 'center',
      bold: true,
      margin: [0, 10, 0, 6],
    };

    const physTable = {
      layout: 'tightGrid',
      table: {
        widths: [210, '*'],
        body: [
          two('1. DATE OF TESTING', r.testing_date || meta.date),
          two('2A) WHETHER FOUND BURNT', r.is_burned ? 'YES' : 'NO'),
          two('2B) METER BODY SEAL', r.seal_status),
          two('2C) METER GLASS', r.meter_glass_cover),
          two('2D) TERMINAL BLOCK', r.terminal_block),
          two('2E) METER BODY COVER', r.meter_body),
          two('2F) ANY OTHER', r.other),
        ],
      },
    };

    // --- Test Type Selection ---
    const testTypeInfo = {
      layout: 'tightGrid',
      margin: [0, 8, 0, 0],
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [
            { text: 'TEST TYPE', ...lbl, fillColor: this.theme.labelBg },
            { text: r.test_type || 'NOT SPECIFIED' },
            { text: 'METER TYPE', ...lbl, fillColor: this.theme.labelBg },
            { text: r.meter_type || 'NOT SPECIFIED' }
          ],
        ],
      },
    };

    // --- Shunt Block (conditional) ---
    const shuntBlock = (r.test_type === 'SHUNT' || this.hasShuntData(r)) ? {
      layout: 'tightGrid',
      margin: [0, 8, 0, 0],
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
    } : null;

    // --- Neutral Block (conditional) ---
    const neutralBlock = (r.test_type === 'NEUTRAL' || this.hasNutralData(r)) ? {
      layout: 'tightGrid',
      margin: [0, 8, 0, 0],
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
    } : null;

    // --- Import/Export Block ---
    const importExportBlock = this.buildImportExportBlock(r);

    // --- Additional Technical Readings ---
    const technicalReadings = this.buildTechnicalReadings(r);

    // --- Additional Information Block ---
    const additionalInfo = this.buildAdditionalInfo(r);

    // --- P4 Section ---
    const p4Section = this.buildP4Section(r);

    const testRes = {
      margin: [0, 8, 0, 0],
      text: `4. TEST RESULT : ${r.test_result || this.dotted(15)}`,
    };

    const remark = this.present(r.remark) ? {
      margin: [0, 10, 0, 0],
      stack: [{ text: 'REMARKS', ...lbl }, { text: r.remark || '', margin: [0, 4, 0, 0] }],
    } : null;

    const finalRemarks = this.present(r.final_remarks) ? {
      margin: [0, 10, 0, 0],
      stack: [{ text: 'FINAL REMARKS', ...lbl }, { text: r.final_remarks || '', margin: [0, 4, 0, 0] }],
    } : null;

    const approverRemark = this.present(r.approver_remark) ? {
      margin: [0, 10, 0, 0],
      stack: [{ text: 'APPROVER REMARKS', ...lbl }, { text: r.approver_remark || '', margin: [0, 4, 0, 0] }],
    } : null;

    const sign = {
      margin: [0, 14, 0, 0],
      columns: [
        {
          width: '*',
          stack: [
            { text: 'Tested by', bold: true, alignment: 'center' },
            { text: '____________________________', alignment: 'center' },
            { text: 'TESTING ASSISTANT ', fontSize: 9, alignment: 'center', color: this.theme.subtle },
          ],
        },
        {
          width: '*',
          stack: [
            { text: 'Verified by', bold: true, alignment: 'center' },
            { text: '____________________________', alignment: 'center' },
            { text: 'JUNIOR ENGINEER ', fontSize: 9, alignment: 'center', color: this.theme.subtle },
          ],
        },
        {
          width: '*',
          stack: [
            { text: 'Approved by', bold: true, alignment: 'center' },
            { text: '____________________________', alignment: 'center' },
            { text: 'ASSISTANT ENGINEER ', fontSize: 9, alignment: 'center', color: this.theme.subtle },
          ],
        },
      ],
    };

    const blocks: any[] = [
      titleBand, metaRow, metaRow2, consumerInfo, meterDetails, rmtlHead, physTable, testTypeInfo
    ];

    if (shuntBlock) blocks.push(shuntBlock);
    if (neutralBlock) blocks.push(neutralBlock);
    if (importExportBlock) blocks.push(importExportBlock);
    if (technicalReadings) blocks.push(technicalReadings);
    if (additionalInfo) blocks.push(additionalInfo);
    if (p4Section) blocks.push(p4Section);

    blocks.push(testRes);
    if (remark) blocks.push(remark);
    if (finalRemarks) blocks.push(finalRemarks);
    if (approverRemark) blocks.push(approverRemark);
    blocks.push(sign);

    return blocks;
  }

  // --- Helper Methods for Conditional Blocks ---
  private hasShuntData(r: VigRow): boolean {
    return [
      r.shunt_reading_before_test, r.shunt_reading_after_test,
      r.shunt_ref_start_reading, r.shunt_ref_end_reading,
      r.shunt_current_test, r.shunt_creep_test, r.shunt_dail_test,
      r.shunt_error_percentage
    ].some(this.present);
  }

  private hasNutralData(r: VigRow): boolean {
    return [
      r.nutral_reading_before_test, r.nutral_reading_after_test,
      r.nutral_ref_start_reading, r.nutral_ref_end_reading,
      r.nutral_current_test, r.nutral_creep_test, r.nutral_dail_test,
      r.nutral_error_percentage
    ].some(this.present);
  }

  private hasImportData(r: VigRow): boolean {
    return [
      r.start_reading_import, r.final_reading_import,
      r.difference_import, r.error_percentage_import
    ].some(this.present);
  }

  private buildImportExportBlock(r: VigRow): any {
    const lbl = { bold: true, fillColor: this.theme.labelBg };

    if (r.meter_type === 'NETMETER') {
      // Net meter: show both import and export
      return {
        layout: 'tightGrid',
        margin: [0, 8, 0, 0],
        table: {
          headerRows: 1,
          widths: ['*','*','*','*','*','*'],
          body: [
            [{ text: 'IMPORT/EXPORT READINGS (NET METER)', colSpan: 6, alignment: 'center', bold: true, fillColor: this.theme.labelBg }, {}, {}, {}, {}, {}],
            [
              { text: 'Import Start', ...lbl },
              { text: this.fmtNum(r.start_reading_import) },
              { text: 'Import Final', ...lbl },
              { text: this.fmtNum(r.final_reading_import) },
              { text: 'Import Error %', ...lbl },
              { text: this.fmtNum(r.error_percentage_import) }
            ],
            [
              { text: 'Export Start', ...lbl },
              { text: this.fmtNum(r.start_reading_export) },
              { text: 'Export Final', ...lbl },
              { text: this.fmtNum(r.final_reading_export) },
              { text: 'Export Error %', ...lbl },
              { text: this.fmtNum(r.error_percentage_export) }
            ],
            [
              { text: 'Import Difference', ...lbl },
              { text: this.fmtNum(r.difference_import) },
              { text: 'Export Difference', ...lbl },
              { text: this.fmtNum(r.difference_export) },
              { text: 'Final Difference', ...lbl },
              { text: this.fmtNum(r.final_Meter_Difference) }
            ]
          ]
        }
      };
    }

    if (r.meter_type === 'NON_SMARTMETER' || this.hasImportData(r)) {
      // Non-smart: import only
      return {
        layout: 'tightGrid',
        margin: [0, 8, 0, 0],
        table: {
          headerRows: 1,
          widths: ['*','*','*','*'],
          body: [
            [{ text: 'IMPORT READINGS', colSpan: 4, alignment: 'center', bold: true, fillColor: this.theme.labelBg }, {}, {}, {}],
            [
              { text: 'Start Reading', ...lbl },
              { text: this.fmtNum(r.start_reading_import) },
              { text: 'Final Reading', ...lbl },
              { text: this.fmtNum(r.final_reading_import) }
            ],
            [
              { text: 'Difference', ...lbl },
              { text: this.fmtNum(r.difference_import) },
              { text: 'Error %', ...lbl },
              { text: this.fmtNum(r.error_percentage_import) }
            ]
          ]
        }
      };
    }

    return null;
  }

  private buildTechnicalReadings(r: VigRow): any {
    const hasTechnicalData = [
      r.dail_test_kwh_rsm, r.recorderedbymeter_kwh, r.dial_testby,
      r.meter_removaltime_metercondition
    ].some(this.present);

    if (!hasTechnicalData) return null;

    const lbl = { bold: true, fillColor: this.theme.labelBg };

    return {
      layout: 'tightGrid',
      margin: [0, 8, 0, 0],
      table: {
        headerRows: 1,
        widths: ['*','*','*','*'],
        body: [
          [{ text: 'TECHNICAL READINGS', colSpan: 4, alignment: 'center', bold: true, fillColor: this.theme.labelBg }, {}, {}, {}],
          [
            { text: 'KWH by RSM', ...lbl },
            { text: this.fmtNum(r.dail_test_kwh_rsm) },
            { text: 'KWH by Meter', ...lbl },
            { text: this.fmtNum(r.recorderedbymeter_kwh) }
          ],
          [
            { text: 'Testing Mechanism', ...lbl },
            { text: r.dial_testby || '' },
            { text: 'Meter Condition', ...lbl },
            { text: this.fmtNum(r.meter_removaltime_metercondition) }
          ]
        ]
      }
    };
  }

  private buildAdditionalInfo(r: VigRow): any {
    const hasAdditionalData = [
      r.certificate_number, r.testing_fees, r.fees_mr_no, r.fees_mr_date,
      r.ref_no, r.test_requester_name, r.any_other_remarkny_zone
    ].some(this.present);

    if (!hasAdditionalData) return null;

    const lbl = { bold: true };

    return {
      margin: [0, 8, 0, 0],
      stack: [
        { text: 'ADDITIONAL INFORMATION', ...lbl, margin: [0, 0, 0, 4] },
        {
          layout: 'tightGrid',
          table: {
            widths: [180, '*'],
            body: [
              [{ text: 'Certificate Number', ...lbl, fillColor: this.theme.labelBg }, { text: r.certificate_number || '' }],
              [{ text: 'Testing Fees', ...lbl, fillColor: this.theme.labelBg }, { text: r.testing_fees || '' }],
              [{ text: 'Fees MR No.', ...lbl, fillColor: this.theme.labelBg }, { text: r.fees_mr_no || '' }],
              [{ text: 'Fees MR Date', ...lbl, fillColor: this.theme.labelBg }, { text: r.fees_mr_date || '' }],
              [{ text: 'Reference No.', ...lbl, fillColor: this.theme.labelBg }, { text: r.ref_no || '' }],
              [{ text: 'Test Requester', ...lbl, fillColor: this.theme.labelBg }, { text: r.test_requester_name || '' }],
              [{ text: 'Other Remarks', ...lbl, fillColor: this.theme.labelBg }, { text: r.any_other_remarkny_zone || '' }],
            ],
          },
        },
      ],
    };
  }

  private buildP4Section(r: VigRow): any {
    const hasP4Data = [
      r.p4_division, r.p4_no, r.p4_date, r.p4_metercodition
    ].some(this.present);

    if (!hasP4Data) return null;

    const lbl = { bold: true };

    return {
      margin: [0, 8, 0, 0],
      stack: [
        { text: 'P4 SECTION DETAILS', ...lbl, margin: [0, 0, 0, 4] },
        {
          layout: 'tightGrid',
          table: {
            widths: [180, '*'],
            body: [
              [{ text: 'P4 Division', ...lbl, fillColor: this.theme.labelBg }, { text: r.p4_division || '' }],
              [{ text: 'P4 Number', ...lbl, fillColor: this.theme.labelBg }, { text: r.p4_no || '' }],
              [{ text: 'P4 Date', ...lbl, fillColor: this.theme.labelBg }, { text: r.p4_date || '' }],
              [{ text: 'P4 Meter Condition', ...lbl, fillColor: this.theme.labelBg }, { text: r.p4_metercodition || '' }],
            ],
          },
        },
      ],
    };
  }
}
