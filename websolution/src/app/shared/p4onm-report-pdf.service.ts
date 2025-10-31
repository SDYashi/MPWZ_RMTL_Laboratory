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
    await new Promise<void>((resolve) =>
      pdfMake.createPdf(doc).download(name, () => resolve())
    );
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
        images['leftLogo'] = isDataUrl(header.leftLogoUrl)
          ? header.leftLogoUrl
          : await toDataURL(header.leftLogoUrl);
      }
      if (header.rightLogoUrl) {
        images['rightLogo'] = isDataUrl(header.rightLogoUrl)
          ? header.rightLogoUrl
          : await toDataURL(header.rightLogoUrl);
      }
      // mirror fallback
      if (!images['rightLogo'] && images['leftLogo']) images['rightLogo'] = images['leftLogo'];
      if (!images['leftLogo'] && images['rightLogo']) images['leftLogo'] = images['rightLogo'];
    } catch {
      // If logo fetch fails we just don't show them
    }

    return this.buildDoc(header, rows, images);
  }

  // ---------- tiny helpers ----------
  private dotted(n = 12) { return '·'.repeat(n); }
  private join(parts: Array<string | undefined | null>, sep = ' ') { return parts.filter(Boolean).join(sep); }
  private yesNo(v?: boolean) { return v ? 'YES' : 'NO'; }
  private present(v: any) { return v !== undefined && v !== null && v !== ''; }
  private fmtNum(v: number | null | undefined, frac = 2) {
    return this.present(v) ? Number(v).toFixed(frac) : '';
  }

  private badge(val?: string | null) {
    const v = (val || '').toUpperCase();
    const color =
      v === 'OK' || v === 'PASS'
        ? this.theme.ok
        : v === 'FAIL'
          ? this.theme.fail
          : this.theme.na;
    return {
      table: {
        widths: ['*'],
        body: [[{ text: v || 'NA', color: '#fff', alignment: 'center' as const, bold: true }]]
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        fillColor: () => color,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 1,
        paddingBottom: () => 1
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

  // ---------- header / footer ----------
  private headerBar(meta: {
    lab_name: string;
    lab_address: string;
    lab_email: string;
    lab_phone: string;
    contentWidth: number;
    hasLeft: boolean;
    hasRight: boolean;
  }): any {
    return {
      margin: [18, 10, 18, 8],
      stack: [
        {
          columns: [
            meta.hasLeft
              ? { image: 'leftLogo', width: 32, alignment: 'left' as const }
              : { width: 32, text: '' },
            {
              width: '*',
              stack: [
                {
                  text: 'MADHYA PRADESH PASCHIM KSHETRA VIDYUT VITARAN COMPANY LIMITED',
                  alignment: 'center' as const,
                  bold: true,
                  fontSize: 12
                },
                {
                  text: (meta.lab_name || '').toUpperCase(),
                  alignment: 'center' as const,
                  margin: [0, 2, 0, 0],
                  fontSize: 11,
                  color: '#333',
                  bold: true
                },
                {
                  text: meta.lab_address || '-',
                  alignment: 'center' as const,
                  margin: [0, 2, 0, 0],
                  fontSize: 9,
                  color: '#555'
                },
                {
                  text: `Email: ${meta.lab_email || '-'}    Phone: ${meta.lab_phone || '-'}`,
                  alignment: 'center' as const,
                  margin: [0, 2, 0, 0],
                  fontSize: 9,
                  color: '#555'
                }
              ]
            },
            meta.hasRight
              ? { image: 'rightLogo', width: 32, alignment: 'right' as const }
              : { width: 32, text: '' }
          ],
          columnGap: 8
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: meta.contentWidth,
              y2: 0,
              lineWidth: 1
            }
          ],
          margin: [0, 6, 0, 0]
        }
      ]
    };
  }

  private footerDef() {
    return (current: number, total: number) => ({
      columns: [
        {
          text: `Page ${current} of ${total}`,
          alignment: 'left' as const,
          margin: [18, 0, 0, 0],
          color: this.theme.subtleText
        },
        {
          text: 'M.P.P.K.V.V.CO. LTD., INDORE',
          alignment: 'right' as const,
          margin: [0, 0, 18, 0],
          color: this.theme.subtleText
        }
      ],
      fontSize: 8
    });
  }

  // ---------- per-page builder ----------
  private pageForRow(
    r: P4ONMReportRow,
    meta: {
      date: string;
      zone: string;
      phase: string;
      testing_bench: string;
      testing_user: string;
      approving_user: string;
      report_id: string;
    }
  ): any[] {
    const row4 = (l1: string, v1: any, l2: string, v2: any) => ([
      { text: l1, bold: true, fillColor: this.theme.labelBg },
      { text: (v1 ?? '').toString() },
      { text: l2, bold: true, fillColor: this.theme.labelBg },
      { text: (v2 ?? '').toString() }
    ]);

    const row2 = (label: string, value: any) => ([
      { text: label, bold: true, fillColor: this.theme.labelBg },
      { text: (value ?? '').toString(), colSpan: 3 }, {}, {}
    ]);

    // thin rule
    const topRule = {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 540,
          y2: 0,
          lineWidth: 1
        }
      ],
      margin: [0, 6, 0, 6]
    };

    const metaTopLine = {
      margin: [0, 0, 0, 6],
      columns: [
        { text: `NO ${this.dotted(20)}` },
        { text: `DATE ${meta.date}`, alignment: 'right' as const }
      ]
    };

    const reportTitle = {
      text: 'P4 O&M METER TEST REPORT',
      alignment: 'center' as const,
      bold: true,
      margin: [0, 0, 0, 6],
      fontSize: 13
    };

    const infoTable = {
      layout: {
        hLineWidth: () => 1.5,
        vLineWidth: () => 1.5,
        hLineColor: () => this.theme.grid,
        vLineColor: () => this.theme.grid,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 2,
        paddingBottom: () => 2
      },
      margin: [0, 0, 0, 6],
      table: {
        widths: ['auto', '*', 'auto', '*', 'auto', '*', 'auto', '*'],
        body: [[
          { text: 'PHASE', bold: true, fillColor: this.theme.labelBg },
          { text: meta.phase || '-' },
          { text: 'TESTING BENCH', bold: true, fillColor: this.theme.labelBg },
          { text: meta.testing_bench || '-' },
          { text: 'TESTING USER', bold: true, fillColor: this.theme.labelBg },
          { text: meta.testing_user || '-' },
          { text: 'APPROVING USER', bold: true, fillColor: this.theme.labelBg },
          { text: meta.approving_user || '-' }
        ]]
      }
    };

    const rightMeta = {
      columns: [
        { width: '*', text: '' },
        {
          width: 'auto',
          stack: [
            {
              text: `Name of Zone/DC: ${meta.zone || '-'}`,
              color: this.theme.subtleText,
              fontSize: 9,
              alignment: 'right' as const
            }
          ]
        }
      ],
      margin: [0, 0, 0, 8]
    };

    const slip = {
      layout: {
        hLineWidth: () => 1.5,
        vLineWidth: () => 1.5,
        hLineColor: () => this.theme.grid,
        vLineColor: () => this.theme.grid,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 2,
        paddingBottom: () => 2
      },
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
      layout: {
        hLineWidth: () => 1.5,
        vLineWidth: () => 1.5,
        hLineColor: () => this.theme.grid,
        vLineColor: () => this.theme.grid,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 2,
        paddingBottom: () => 2
      },
      margin: [0, 0, 0, 6],
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          row4('Meter No.', r.serial || this.dotted(12), 'Make', r.make || this.dotted(10)),
          row4('Capacity', r.capacity || this.dotted(10), 'Reading (Removal)', this.present(r.removal_reading) ? this.fmtNum(r.removal_reading, 3) : this.dotted(8))
        ]
      }
    };

    const labBlockHead = {
      stack: [
        {
          text: 'To be filled by Testing Section Laboratory',
          alignment: 'center' as const,
          bold: true,
          margin: [0, 0, 0, 6],
          fontSize: 10
        }
      ]
    };

    const rmtlGrid = {
      layout: {
        hLineWidth: () => 1.5,
        vLineWidth: () => 1.5,
        hLineColor: () => this.theme.grid,
        vLineColor: () => this.theme.grid,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 2,
        paddingBottom: () => 2
      },
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

    const shuntGrid = this.hasShunt(r) ? {
      layout: {
        hLineWidth: () => 1.5,
        vLineWidth: () => 1.5,
        hLineColor: () => this.theme.grid,
        vLineColor: () => this.theme.grid,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 2,
        paddingBottom: () => 2
      },
      margin: [0, 0, 0, 6],
      table: {
        headerRows: 1,
        widths: ['*','*','*','*'],
        body: [
          [
            { text: 'SHUNT READINGS', colSpan: 4, alignment: 'center' as const, bold: true, fillColor: this.theme.labelBg },
            {}, {}, {}
          ],
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
            { text: 'Creep Test', bold: true, fillColor: this.theme.labelBg }, this.badge(r.shunt_creep_test)
          ],
          [
            { text: 'Dial Test', bold: true, fillColor: this.theme.labelBg }, this.badge(r.shunt_dail_test),
            { text: '', border: [false,false,false,false] }, { text: '', border: [false,false,false,false] }
          ]
        ]
      }
    } : null;

    const neutralGrid = this.hasNutral(r) ? {
      layout: {
        hLineWidth: () => 1.5,
        vLineWidth: () => 1.5,
        hLineColor: () => this.theme.grid,
        vLineColor: () => this.theme.grid,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 2,
        paddingBottom: () => 2
      },
      margin: [0, 0, 0, 6],
      table: {
        headerRows: 1,
        widths: ['*','*','*','*'],
        body: [
          [
            { text: 'NEUTRAL READINGS', colSpan: 4, alignment: 'center' as const, bold: true, fillColor: this.theme.labelBg },
            {}, {}, {}
          ],
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
            { text: 'Creep Test', bold: true, fillColor: this.theme.labelBg }, this.badge(r.nutral_creep_test)
          ],
          [
            { text: 'Dial Test', bold: true, fillColor: this.theme.labelBg }, this.badge(r.nutral_dail_test),
            { text: '', border: [false,false,false,false] }, { text: '', border: [false,false,false,false] }
          ]
        ]
      }
    } : null;

    // legacy block if anything legacy is present
    const legacyNeeded = [
      r.rsm_kwh, r.meter_kwh, r.error_percentage,
      r.reading_before_test, r.reading_after_test
    ].some(this.present);

    const legacyResults = legacyNeeded ? {
      layout: {
        hLineWidth: () => 1.5,
        vLineWidth: () => 1.5,
        hLineColor: () => this.theme.grid,
        vLineColor: () => this.theme.grid,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 2,
        paddingBottom: () => 2
      },
      margin: [0, 0, 0, 6],
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          row4(
            'Before Test (Legacy)',
            this.fmtNum(r.reading_before_test),
            'After Test (Legacy)',
            this.fmtNum(r.reading_after_test)
          ),
          row4(
            'Dial Test (RSM kWh)',
            this.fmtNum(r.rsm_kwh),
            'Dial Test (Meter kWh)',
            this.fmtNum(r.meter_kwh)
          ),
          row4(
            '% Error (Overall Legacy)',
            this.fmtNum(r.error_percentage),
            '—',
            '—'
          )
        ]
      }
    } : null;

    // final error % and remarks
    const combinedError = this.present(r.error_percentage_import)
      ? {
          layout: {
            hLineWidth: () => 1.5,
            vLineWidth: () => 1.5,
            hLineColor: () => this.theme.grid,
            vLineColor: () => this.theme.grid,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 2,
            paddingBottom: () => 2
          },
          margin: [0, 0, 0, 10],
          table: {
            widths: ['auto', '*'],
            body: [
              [
                { text: 'Final Error % (Import)', bold: true, fillColor: this.theme.labelBg },
                { text: String(r.error_percentage_import ?? '') }
              ]
            ]
          }
        }
      : null;

    const remarksBlock = this.present(r.final_remarks)
      ? {
          layout: {
            hLineWidth: () => 1.5,
            vLineWidth: () => 1.5,
            hLineColor: () => this.theme.grid,
            vLineColor: () => this.theme.grid,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 2,
            paddingBottom: () => 2
          },
          margin: [0, 0, 0, 10],
          table: {
            widths: ['*'],
            body: [
              [{ text: 'Remarks', bold: true, fillColor: this.theme.labelBg }],
              [{ text: r.final_remarks || '', noWrap: false }]
            ]
          }
        }
      : null;

    const signBlock = {
      margin: [0, 8, 0, 0],
      columns: [
        {
          width: '*',
          alignment: 'center' as const,
          stack: [
            { text: 'Tested by', alignment: 'center' as const, bold: true },
            { text: '\n\n____________________________', alignment: 'center' as const },
            {
              text: meta.testing_user || '____________________________',
              alignment: 'center' as const,
              color: this.theme.subtleText,
              fontSize: 9
            },
            {
              text: 'TESTING ASSISTANT',
              alignment: 'center' as const,
              color: this.theme.subtleText,
              fontSize: 9
            }
          ]
        },
        {
          width: '*',
          alignment: 'center' as const,
          stack: [
            { text: 'Verified by', alignment: 'center' as const, bold: true },
            { text: '\n\n____________________________', alignment: 'center' as const },
            {
              text: 'JUNIOR ENGINEER',
              alignment: 'center' as const,
              color: this.theme.subtleText,
              fontSize: 9
            }
          ]
        },
        {
          width: '*',
          alignment: 'center' as const,
          stack: [
            { text: 'Approved by', alignment: 'center' as const, bold: true },
            { text: '\n\n____________________________', alignment: 'center' as const },
            {
              text: meta.approving_user || '____________________________',
              alignment: 'center' as const,
              color: this.theme.subtleText,
              fontSize: 9
            },
            {
              text: 'ASSISTANT ENGINEER',
              alignment: 'center' as const,
              color: this.theme.subtleText,
              fontSize: 9
            }
          ]
        }
      ]
    };

    const blocks: any[] = [
      // topRule,
      metaTopLine,
      reportTitle,
      infoTable,
      rightMeta,
      slip,
      slipMeter,
      labBlockHead,
      rmtlGrid
    ];

    if (shuntGrid) blocks.push(shuntGrid);
    if (neutralGrid) blocks.push(neutralGrid);
    if (combinedError) blocks.push(combinedError);
    if (legacyResults) blocks.push(legacyResults);
    if (remarksBlock) blocks.push(remarksBlock);

    blocks.push(signBlock);
    return blocks;
  }

  // ---------- full doc ----------
  private buildDoc(header: P4ONMReportHeader, rows: P4ONMReportRow[], images: Record<string, string> = {}): TDocumentDefinitions {
    const meta = {
      date: header.date,
      zone: header.zone || this.join([header.location_code, header.location_name], ' - ') || '-',
      phase: header.phase || '-',
      testing_bench: header.testing_bench || '-',
      testing_user: header.testing_user || '-',
      approving_user: header.approving_user || '-',
      lab_name: header.lab_name || '-',
      lab_address: header.lab_address || '-',
      lab_email: header.lab_email || '-',
      lab_phone: header.lab_phone || '-',
      report_id:
        header.report_id ||
        `P4-${header.date.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`
    };

    // build all pages
    const content: any[] = [];
    rows.forEach((r, idx) => {
      content.push(...this.pageForRow(r, {
        date: meta.date,
        zone: meta.zone,
        phase: meta.phase,
        testing_bench: meta.testing_bench,
        testing_user: meta.testing_user,
        approving_user: meta.approving_user,
        report_id: meta.report_id
      }));
      if (idx < rows.length - 1) {
        content.push({ text: '', pageBreak: 'after' });
      }
    });

    const contentWidth = 595.28 - 18 - 18; // A4 - horizontal header margins

    return {
      pageSize: 'A4',
      pageMargins: [18, 92, 18, 34],
      defaultStyle: {
        fontSize: 9.5,
        color: '#111',
        lineHeight: 1.1
      },
      images,
      info: { title: `P4_ONM_${meta.date}` },
      header: this.headerBar({
        lab_name: meta.lab_name,
        lab_address: meta.lab_address,
        lab_email: meta.lab_email,
        lab_phone: meta.lab_phone,
        contentWidth,
        hasLeft: !!images['leftLogo'],
        hasRight: !!images['rightLogo']
      }) as any,
      footer: this.footerDef(),
      content
    };
  }
}
