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
  report_id?: string; 
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
  contested_by?: string;           // P4 O&M Meter by (Consumer/Zone)
  payment_particulars?: string;    // Particular of payment of Testing Charges
  receipt_no?: string;
  receipt_date?: string;           // YYYY-MM-DD
  condition_at_removal?: string;   // Meter Condition at Removal

  // Device condition & meta
  testing_date?: string;           // YYYY-MM-DD
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

  private join(parts: Array<string | undefined | null>, sep = ' ') {
    return parts.filter(Boolean).join(sep);
  }
  private yesNo(v?: boolean) {
    if (v === true) return 'YES';
    if (v === false) return 'NO';
    return '-';
  }
  private fmtNum(n?: number | null, decimals = 2) {
    if (n === null || n === undefined || n === ('' as any)) return '';
    const num = Number(n);
    if (!isFinite(num)) return '';
    return num.toFixed(decimals);
  }

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

  private statusBox(raw?: string | null) {
    const val = (raw || '').toString().trim();
    if (!val) return { text: '' };

    const upper = val.toUpperCase();
    const isOk = upper === 'OK' || upper === 'PASS' || upper === 'PASSED';

    return {
      text: val,
      alignment: 'center',
      bold: true,
      margin: [0, 1, 0, 1],
      fillColor: isOk ? '#2e7d32' : '#ffb300',
      color: isOk ? '#ffffff' : '#000000'
    };
  }

  // ---------- Core doc builder ----------
  private buildDoc(header: ContestedReportHeader, rows: ContestedReportRow[], images: Record<string, string> = {}): TDocumentDefinitions {
    // One meter per report – take the first row from batch
    const r = rows[0] || ({} as ContestedReportRow);

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

      report_id:
        header.report_id ||
        `CON-${(header.date || '').replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`
    };

    const shuntExists  = this.hasShunt(r);
    const nutralExists = this.hasNutral(r);

    const contentWidth = 595.28 - 18 - 18;

    const consumerSection  = this.sectionConsumer(meta, r);
    const metaPhaseSection = this.sectionPhaseAndBench(meta);
    const zoneLine         = this.sectionZoneLine(meta);
    const meterTopSection  = this.sectionMeterTop(r);
    const labFillTitle     = this.sectionLabFillTitle();
    const meterCondition   = this.sectionMeterCondition(r);
    const testingSection   = this.sectionTestingCombined(r, shuntExists, nutralExists);
    const finalError       = this.sectionFinalError(r);
    const remarksSec       = this.sectionRemarks(r);
    const signSec          = this.sectionSignatures(meta);

    return {
      pageSize: 'A4',
      pageMargins: [18, 80, 18, 34],
      images,
      header: this.headerBar(meta, images, contentWidth),
      footer: (current: number, total: number) => {
        if (total <= 1) {
          return {
            columns: [
              {
                text: 'M.P.P.K.V.V.CO. LTD., INDORE',
                alignment: 'right',
                margin: [0, 0, 18, 0],
                color: this.theme.textSubtle
              }
            ],
            fontSize: 8
          };
        }
        return {
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
        };
      },
      defaultStyle: {
        fontSize: 9,
        color: '#111',
        lineHeight: 1.05
      },
      styles: {
        small: { fontSize: 8.5, color: this.theme.textSubtle },
        sectionTitle: {
          bold: true,
          fontSize: 11,
          color: '#0b2237',
          margin: [0, 6, 0, 3]
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
          hLineWidth: () => 0.8,
          vLineWidth: () => 0.8,
          hLineColor: () => this.theme.grid,
          vLineColor: () => this.theme.grid,
          paddingLeft: () => 3,
          paddingRight: () => 3,
          paddingTop: () => 2,
          paddingBottom: () => 2
        },
        cleanGridTight: {
          hLineWidth: () => 0.7,
          vLineWidth: () => 0.7,
          hLineColor: () => this.theme.grid,
          vLineColor: () => this.theme.grid,
          paddingLeft: () => 2,
          paddingRight: () => 2,
          paddingTop: () => 1,
          paddingBottom: () => 1
        }
      },
      content: [
        // Main title like screenshot
        {
          text: 'CONTESTED METER TEST REPORT',
          style: 'sectionTitle',
          alignment: 'center',
          noWrap: true,
          fontSize: 14,
          margin: [0, 0, 0, 4]
        },

        metaPhaseSection,
        zoneLine,

        consumerSection,
        meterTopSection,
        labFillTitle,
        meterCondition,
        ...(testingSection ? [testingSection] : []),
        finalError,
        remarksSec,
        signSec
      ]
    };
  }

  // ----------------- Header Bar -----------------
  private headerBar(meta: any, images: Record<string, string>, contentWidth: number) {
    const labName = (meta.lab_name || '').toString().toUpperCase();
    const addr    = meta.lab_address || '';
    const mail    = meta.lab_email  || '';
    const phone   = meta.lab_phone  || '';

    return {
      margin: [18, 14, 18, 10],
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
                  text: 'MADHYA PRADESH PASCHIM KHETRA VIDYUT VITARAN COMPANY LIMITED',
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
                  margin: [0, 2, 0, 0],
                  fontSize: 9
                }
              ]
            },

            images['rightLogo']
              ? { image: 'rightLogo', width: 32, alignment: 'right' }
              : { width: 32, text: '' }
          ],
          columnGap: 8
        },
        {
          margin: [0, 6, 0, 0],
          columns: [
            {
              text: `NO: ${meta.report_id || '...............'}`,
              alignment: 'left',
              fontSize: 9
            },
            {
              text: `DATE: ${meta.date || '-'}`,
              alignment: 'right',
              fontSize: 9
            }
          ]
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: contentWidth,
              y2: 0,
              lineWidth: 1
            }
          ],
          margin: [0, 6, 0, 0]
        }
      ]
    };
  }

  // ----------------- Basic helpers for rows -----------------
  private row4(l1: string, v1: any, l2: string, v2: any) {
    return [
      { text: l1, style: 'labelCell' },
      { text: (v1 ?? '').toString(), style: 'valueCell' },
      { text: l2, style: 'labelCell' },
      { text: (v2 ?? '').toString(), style: 'valueCell' }
    ];
  }

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

  // ---------- Phase / Bench / User row (top band under title) ----------
  private sectionPhaseAndBench(meta: any) {
    return {
      margin: [0, 2, 0, 0],
      layout: 'cleanGrid',
      table: {
        widths: ['auto', '*', 'auto', '*', 'auto', '*', 'auto', '*'],
        body: [
          [
            { text: 'PHASE', style: 'labelCell' },
            { text: meta.phase || '-', style: 'valueCell' },

            { text: 'TESTING BENCH', style: 'labelCell' },
            { text: meta.testing_bench || '-', style: 'valueCell' },

            { text: 'TESTING USER', style: 'labelCell' },
            { text: meta.testing_user || '-', style: 'valueCell' },

            { text: 'APPROVING USER', style: 'labelCell' },
            { text: meta.approving_user || '-', style: 'valueCell' }
          ]
        ]
      }
    };
  }

  private sectionZoneLine(meta: any) {
    return {
      margin: [0, 3, 0, 3],
      text: `Name of Zone/DC: ${meta.zone || '-'}`,
      alignment: 'right',
      fontSize: 9
    };
  }

  // ---------- Consumer Details block ----------
  private sectionConsumer(_: any, r: ContestedReportRow) {
    return {
      margin: [0, 2, 0, 0],
      layout: 'cleanGrid',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          this.row4('Name of Consumer', r.consumer_name || '', 'Account / IVRS', r.account_no_ivrs || ''),
          this.row2('Address', r.address || ''),
          this.row2('P4 O&M Meter by (Consumer/Zone)', r.contested_by || ''),
          this.row2('Particular of payment of Testing Charges', r.payment_particulars || ''),
          this.row4('Receipt No', r.receipt_no || '', 'Receipt Date', r.receipt_date || ''),
          this.row2('Meter Condition at Removal', r.condition_at_removal || '')
        ]
      }
    };
  }

  // ---------- Meter top row (Meter No / Make / Capacity / Reading) ----------
  private sectionMeterTop(r: ContestedReportRow) {
    return {
      margin: [0, 2, 0, 0],
      layout: 'cleanGrid',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          this.row4('Meter No.', r.serial || '-', 'Make', r.make || '-'),
          this.row4('Capacity', r.capacity || '-', 'Reading (Removal)', this.fmtNum(r.removal_reading, 2) || '-')
        ]
      }
    };
  }

  private sectionLabFillTitle() {
    return {
      margin: [0, 4, 0, 2],
      text: 'To be filled by Testing Section Laboratory',
      bold: true,
      alignment: 'center',
      fontSize: 9
    };
  }

  // ---------- Meter condition table ----------
  private sectionMeterCondition(r: ContestedReportRow) {
    return {
      margin: [0, 0, 0, 2],
      layout: 'cleanGrid',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          this.row4(
            'Date of Testing',
            r.testing_date || '',
            'Physical Condition of Meter',
            r.physical_condition_of_device || ''
          ),
          this.row4(
            'Whether Found Burnt',
            this.yesNo(r.is_burned),
            'Meter Body Seal',
            r.seal_status || ''
          ),
          this.row4(
            'Meter Glass Cover',
            r.meter_glass_cover || '',
            'Terminal Block',
            r.terminal_block || ''
          ),
          this.row4(
            'Meter Body',
            r.meter_body || '',
            'Any Other',
            r.other || ''
          )
        ]
      }
    };
  }

  // ---------- Combined SHUNT + NEUTRAL table (like screenshot) ----------
  private sectionTestingCombined(r: ContestedReportRow, shuntExists: boolean, nutralExists: boolean) {
    if (!shuntExists && !nutralExists) return null;

    return {
      margin: [0, 4, 0, 0],
      layout: 'cleanGridTight',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [
            {
              text: 'SHUNT',
              colSpan: 2,
              alignment: 'center',
              bold: true,
              fillColor: this.theme.softHeaderBg,
              fontSize: 9
            },
            {},
            {
              text: 'NEUTRAL',
              colSpan: 2,
              alignment: 'center',
              bold: true,
              fillColor: this.theme.softHeaderBg,
              fontSize: 9
            },
            {}
          ],
          [
            { text: 'Before:', style: 'labelCell' },
            { text: this.fmtNum(r.shunt_reading_before_test), style: 'valueCell' },
            { text: 'Before:', style: 'labelCell' },
            { text: this.fmtNum(r.nutral_reading_before_test), style: 'valueCell' }
          ],
          [
            { text: 'After:', style: 'labelCell' },
            { text: this.fmtNum(r.shunt_reading_after_test), style: 'valueCell' },
            { text: 'After:', style: 'labelCell' },
            { text: this.fmtNum(r.nutral_reading_after_test), style: 'valueCell' }
          ],
          [
            { text: 'Ref Start:', style: 'labelCell' },
            { text: this.fmtNum(r.shunt_ref_start_reading), style: 'valueCell' },
            { text: 'Ref Start:', style: 'labelCell' },
            { text: this.fmtNum(r.nutral_ref_start_reading), style: 'valueCell' }
          ],
          [
            { text: 'Ref End:', style: 'labelCell' },
            { text: this.fmtNum(r.shunt_ref_end_reading), style: 'valueCell' },
            { text: 'Ref End:', style: 'labelCell' },
            { text: this.fmtNum(r.nutral_ref_end_reading), style: 'valueCell' }
          ],
          [
            { text: 'Error %:', style: 'labelCell' },
            { text: this.fmtNum(r.shunt_error_percentage), style: 'valueCell' },
            { text: 'Error %:', style: 'labelCell' },
            { text: this.fmtNum(r.nutral_error_percentage), style: 'valueCell' }
          ],
          [
            { text: 'Start Current', style: 'labelCell' },
            this.statusBox(r.shunt_current_test),
            { text: 'Start Current', style: 'labelCell' },
            this.statusBox(r.nutral_current_test)
          ],
          [
            { text: 'Creep Test', style: 'labelCell' },
            this.statusBox(r.shunt_creep_test),
            { text: 'Creep Test', style: 'labelCell' },
            this.statusBox(r.nutral_creep_test)
          ],
          [
            { text: 'Dial Test', style: 'labelCell' },
            this.statusBox(r.shunt_dail_test),
            { text: 'Dial Test', style: 'labelCell' },
            this.statusBox(r.nutral_dail_test)
          ]
        ]
      }
    };
  }

  // ---------- Final Error row ----------
  private sectionFinalError(r: ContestedReportRow) {
    return {
      margin: [0, 4, 0, 0],
      layout: 'cleanGrid',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          this.row2(
            'Final Error % (Import)',
            this.fmtNum(r.error_percentage_import)
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
        body: [
          this.row2('Remarks', r.remark || '')
        ]
      }
    };
  }

  // ---------- Signatures ----------
  private sectionSignatures(meta: any) {
    return {
      margin: [0, 6, 0, 0],
      columns: [
        {
          width: '*',
          stack: [
            { text: '\n\nTested by', alignment: 'center', bold: true },
            { text: '\n____________________________', alignment: 'center' },
            { text: (meta.testing_user || '-').toUpperCase(), alignment: 'center', style: 'small' },
            { text: 'TESTING ASSISTANT', alignment: 'center', style: 'small' }
          ]
        },
        {
          width: '*',
          stack: [
            { text: '\n\nVerified by', alignment: 'center', bold: true },
            { text: '\n____________________________', alignment: 'center' },
            { text: '-'.toUpperCase(), style: 'small', alignment: 'center' },
            { text: 'JUNIOR ENGINEER', alignment: 'center', style: 'small' }
          ]
        },
        {
          width: '*',
          stack: [
            { text: '\n\nApproved by', alignment: 'center', bold: true },
            { text: '\n____________________________', alignment: 'center' },
            { text: (meta.approving_user || '-').toUpperCase(), alignment: 'center', style: 'small' },
            { text: 'ASSISTANT ENGINEER', alignment: 'center', style: 'small' }
          ]
        }
      ]
    };
  }
}
