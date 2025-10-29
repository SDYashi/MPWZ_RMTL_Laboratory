import { Injectable } from '@angular/core';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

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
  approving_user?: string | null;

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
    grid: '#d9dce4',
    subtle: '#5d6b7a',
    labelBg: '#f2f4f8',
    sectionBg: '#eef2f7',
    heading: '#1a1f36'
  };

  private dotted(n = 10) { return '·'.repeat(n); }
  private present(v: any) { return v !== undefined && v !== null && v !== ''; }
  private fmtNum(v: number | null | undefined, frac = 2) {
    return this.present(v) ? Number(v).toFixed(frac).replace(/\.?0+$/,'') : '';
  }

  // ===== PUBLIC API =====
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

  // ===== INTERNALS =====
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
      // fallback: mirror one logo to both slots
      if (!images['leftLogo'] && images['rightLogo']) images['leftLogo'] = images['rightLogo'];
      if (!images['rightLogo'] && images['leftLogo']) images['rightLogo'] = images['leftLogo'];
    } catch {
      // ignore logo load errors
    }

    return this.buildDoc(header, rows, images);
  }

  private tableLayout(): any {
    return {
      hLineWidth: () => 0.6,
      vLineWidth: () => 0.6,
      hLineColor: () => this.theme.grid,
      vLineColor: () => this.theme.grid,
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 2,
      paddingBottom: () => 2
    };
  }

  /**
   * Compact, attractive header for each page.
   * We do: logos left/right, then org name, lab name, lab address,
   * then one row with Email | Phone.
   */
  private headerBar(meta: {
    orgTitle: string;
    lab_name: string;
    lab_address: string;
    lab_email: string;
    lab_phone: string;
  }, images: Record<string,string>, pageWidth: number): Content {

    const logoSize: [number, number] = [40, 40];

    return {
      margin: [18, 10, 18, 8],
      stack: [
        {
          // top row: logos + center stack
          columns: [
            images['leftLogo']
              ? { image: 'leftLogo', fit: logoSize, width: 50, alignment: 'left' }
              : { width: 50, text: '' },

            {
              width: '*',
              stack: [
                {
                  text: meta.orgTitle,
                  alignment: 'center',
                  bold: true,
                  fontSize: 11,
                  color: this.theme.heading,
                  margin: [0, 0, 0, 2]
                },
                {
                  text: (meta.lab_name || '').toUpperCase(),
                  alignment: 'center',
                  bold: true,
                  fontSize: 10,
                  color: '#333',
                  margin: [0, 0, 0, 1]
                },
                {
                  text: meta.lab_address || '',
                  alignment: 'center',
                  fontSize: 9,
                  color: '#444',
                  margin: [0, 0, 0, 2]
                },
                {
                  columns: [
                    {
                      width: '*',
                      text: meta.lab_email ? `Email: ${meta.lab_email}` : '',
                      alignment: 'right',
                      fontSize: 8,
                      color: '#444',
                      margin: [0, 0, 4, 0]
                    },
                    {
                      width: '*',
                      text: meta.lab_phone ? `Phone: ${meta.lab_phone}` : '',
                      alignment: 'left',
                      fontSize: 8,
                      color: '#444',
                      margin: [4, 0, 0, 0]
                    }
                  ]
                }
              ]
            },

            images['rightLogo']
              ? { image: 'rightLogo', fit: logoSize, width: 50, alignment: 'right' }
              : { width: 50, text: '' }
          ],
          columnGap: 8
        },

        // subtle divider under header
        {
          canvas: [{
            type: 'line',
            x1: 0,
            y1: 0,
            x2: pageWidth - 36, // width minus left/right page margins
            y2: 0,
            lineWidth: 1,
            lineColor: this.theme.grid
          }],
          margin: [0, 8, 0, 0]
        }
      ]
    };
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
        body: [[{
          text: v || 'NA',
          color: '#fff',
          alignment: 'center',
          bold: true,
          fontSize: 8
        }]]
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        fillColor: () => color,
        paddingLeft: () => 3,
        paddingRight: () => 3,
        paddingTop: () => 2,
        paddingBottom: () => 2
      },
      width: 44
    };
  }

  private sectionHeading(text: string): Content {
    return {
      margin: [0, 5, 0, 4],
      table: {
        widths: ['*'],
        body: [[{
          text,
          bold: true,
          color: this.theme.heading,
          fillColor: this.theme.sectionBg,
          fontSize: 13,
          margin: [4, 3, 4, 3],
          alignment: 'center'
        }]]
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      }
    };
  }

  private buildDoc(
    header: VigHeader,
    rows: VigRow[],
    images: Record<string, string>
  ): TDocumentDefinitions {

    // build meta block
    const zone =
      (header.location_code ? header.location_code + ' - ' : '') +
      (header.location_name || '');

    const meta = {
      zone,
      method: header.testMethod || '-',
      status: header.testStatus || '-',
      bench: header.testing_bench || '-',
      user: header.testing_user || '-',
      approver: header.approving_user || '-',
      date: header.date || new Date().toISOString().slice(0, 10),

      lab_name: header.lab_name || '',
      lab_address: header.lab_address || '',
      lab_email: header.lab_email || '',
      lab_phone: header.lab_phone || ''
    };

    const pageWidth = 595.28; // A4 width in pdfmake default units
    const usableWidth = pageWidth - 36; // left+right margin 18 each

    const content: Content[] = [];
    const data = (rows || []).filter(r => (r.serial || '').trim());

    data.forEach((r, idx) => {
      content.push(
        ...this.pageForRow(r, meta)
      );
      if (idx < data.length - 1) {
        content.push({ text: '', pageBreak: 'after' });
      }
    });

    return {
      pageSize: 'A4',
      // give modest top margin because header() returns a header we render ourselves
      pageMargins: [18, 100, 18, 40],
      defaultStyle: {
        fontSize: 9,
        color: '#111',
        lineHeight: 1.15
      },
      images,
      info: {
        title: `P4_VIG_${meta.date}`
      },
      header: this.headerBar(
        {
          orgTitle: 'MADHYA PRADESH PASCHIM KSHETRA VIDYUT VITARAN COMPANY LIMITED',
          lab_name: meta.lab_name,
          lab_address: meta.lab_address,
          lab_email: meta.lab_email,
          lab_phone: meta.lab_phone
        },
        images,
        pageWidth
      ) as any,
      footer: (current: number, total: number) => ({
        margin: [18, 0, 18, 16],
        columns: [
          {
            text: `Page ${current} of ${total}`,
            alignment: 'left',
            color: this.theme.subtle,
            fontSize: 8
          },
          {
            text: 'MPPKVVCL • RMTL Indore',
            alignment: 'right',
            color: this.theme.subtle,
            fontSize: 8
          }
        ]
      }),
      content
    };
  }

  private pageForRow(
    r: VigRow,
    meta: {
      zone: string;
      method: string;
      status: string;
      bench: string;
      user: string;
      approver: string;
      date: string;
    }
  ): Content[] {

    const bold = { bold: true };
    const labelCell = (t: string) => ({ text: t, ...bold, fillColor: this.theme.labelBg });

    // reusable row builder for 2-col "Label / Value"
    const twoCol = (label: string, value: any): any[] => [
      labelCell(label),
      { text: value != null ? String(value) : '' }
    ];

    // === SECTION: Report title + meta summary ===
    const titleBand: Content[] = [
      this.sectionHeading('P4 - VIGILANCE / CONTESTED METER TEST REPORT'),
      {
        layout: this.tableLayout(),
        table: {
          widths: ['auto','*','auto','*','auto','*','auto','*'],
          body: [[
            labelCell('Zone / DC'),
            { text: meta.zone || '-' },
            labelCell('Method'),
            { text: meta.method || '-' },
            labelCell('Status'),
            { text: meta.status || '-' },
            labelCell('Bench'),
            { text: meta.bench || '-' }
          ]]
        },
        margin: [0,0,0,2]
      },
      {
        layout: this.tableLayout(),
        table: {
          widths: ['auto','*','auto','*'],
          body: [[
            labelCell('Testing User'),
            { text: meta.user || '-' },
            labelCell('Date'),
            { text: meta.date || '-' }
          ]]
        }
      }
    ];

    // === SECTION: Consumer / seizure info ===
    const consumerBlock: Content[] = [
      this.sectionHeading('1. CONSUMER / SEIZURE DETAILS'),
      {
        layout: this.tableLayout(),
        table: {
          widths: [180, '*'],
          body: [
            twoCol('Name of Consumer', r.consumer_name || ''),
            twoCol('Address', r.address || ''),
            twoCol('Account Number', r.account_number || ''),
            twoCol('Division / Zone', r.division_zone || ''),
            twoCol(
              'Panchanama No. & Date',
              [
                (r.panchanama_no || ''),
                (r.panchanama_no && r.panchanama_date ? ' Dt ' : ''),
                (r.panchanama_date || '')
              ].join('')
            ),
            twoCol(
              'Meter Condition at Removal',
              r.condition_at_removal || ''
            )
          ]
        }
      }
    ];

    // === SECTION: Meter basic info ===
    const meterBlock: Content[] = [
      this.sectionHeading('2. METER DETAILS'),
      {
        layout: this.tableLayout(),
        table: {
          widths: ['*','*','*','*'],
          body: [
            [
              labelCell('Meter No.'),
              labelCell('Make'),
              labelCell('Capacity'),
              labelCell('Reading at Removal')
            ],
            [
              { text: r.serial || '' },
              { text: r.make || '' },
              { text: r.capacity || '' },
              { text: this.fmtNum(r.removal_reading, 3) }
            ]
          ]
        }
      }
    ];

    // === SECTION: Physical condition ===
    const physBlock: Content[] = [
      this.sectionHeading('3. PHYSICAL CONDITION / VISUAL CHECKS'),
      {
        layout: this.tableLayout(),
        table: {
          widths: [180, '*'],
          body: [
            twoCol('Date of Testing', r.testing_date || meta.date),
            twoCol('Whether Found Burnt', r.is_burned ? 'YES' : 'NO'),
            twoCol('Meter Body Seal', r.seal_status || ''),
            twoCol('Meter Glass', r.meter_glass_cover || ''),
            twoCol('Terminal Block', r.terminal_block || ''),
            twoCol('Meter Body Cover', r.meter_body || ''),
            twoCol('Any Other', r.other || '')
          ]
        }
      }
    ];

    // === SECTION: Test type / meter type ===
    const testTypeBlock: Content[] = [
      this.sectionHeading('4. TEST TYPE & METER CATEGORY'),
      {
        layout: this.tableLayout(),
        table: {
          widths: ['auto','*','auto','*'],
          body: [[
            labelCell('Test Type'),
            { text: r.test_type || 'NOT SPECIFIED' },
            labelCell('Meter Type'),
            { text: r.meter_type || 'NOT SPECIFIED' }
          ]]
        }
      }
    ];

    // === SECTION: Shunt test readings ===
    const shuntBlock = this.blockShunt(r);

    // === SECTION: Neutral test readings ===
    const neutralBlock = this.blockNeutral(r);

    // === SECTION: Import / Export (netmeter etc.) ===
    const impExpBlock = this.blockImportExport(r);

    // === SECTION: Technical readings ===
    const techBlock = this.blockTechnical(r);

    // === SECTION: Administrative / extra info ===
    const addlBlock = this.blockAdditionalInfo(r);

    // === SECTION: P4 details ===
    const p4Block = this.blockP4(r);

    // === TEST RESULT / REMARKS / APPROVAL ===
    const resultAndRemarks: Content[] = [
      this.sectionHeading('5. RESULT & REMARKS'),
      {
        margin: [0,2,0,0],
        text: [
          'TEST RESULT: ',
          (r.test_result || this.dotted(15))
        ],
        bold: true,
        fontSize: 10,
        color: this.theme.heading
      },
      r.remark
        ? {
            margin: [0,6,0,0],
            stack: [
              { text: 'Remarks', bold: true },
              { text: r.remark || '', margin: [0,2,0,0] }
            ]
          }
        : { text: '' },
      r.final_remarks
        ? {
            margin: [0,6,0,0],
            stack: [
              { text: 'Final Remarks', bold: true },
              { text: r.final_remarks || '', margin: [0,2,0,0] }
            ]
          }
        : { text: '' },
      r.approver_remark
        ? {
            margin: [0,6,0,0],
            stack: [
              { text: 'Approver Remarks', bold: true },
              { text: r.approver_remark || '', margin: [0,2,0,0] }
            ]
          }
        : { text: '' }
    ];

    // signature section, with tester + approver names
    const signBlock: Content = {
      margin: [0, 12, 0, 0],
      columns: [
        {
          width: '*',
          stack: [
            { text: 'Tested by', bold: true, alignment: 'center' },
            { text: '____________________________', alignment: 'center', margin: [0,4,0,2] },
            { text: meta.user?.toUpperCase() || '', alignment: 'center', fontSize: 9 },
            { text: 'TESTING ASSISTANT', alignment: 'center', fontSize: 8, color: this.theme.subtle }
          ]
        },
        {
          width: '*',
          stack: [
            { text: 'Verified by', bold: true, alignment: 'center' },
            { text: '____________________________', alignment: 'center', margin: [0,4,0,2] },
            { text: 'JUNIOR ENGINEER', alignment: 'center', fontSize: 8, color: this.theme.subtle }
          ]
        },
        {
          width: '*',
          stack: [
            { text: 'Approved by', bold: true, alignment: 'center' },
            { text: '____________________________', alignment: 'center', margin: [0,4,0,2] },
            { text: meta.approver?.toUpperCase() || '', alignment: 'center', fontSize: 9 },
            { text: 'ASSISTANT ENGINEER', alignment: 'center', fontSize: 8, color: this.theme.subtle }
          ]
        }
      ]
    };

    const blocks: Content[] = [
      ...titleBand,
      ...consumerBlock,
      ...meterBlock,
      ...physBlock,
      ...testTypeBlock
    ];

    if (shuntBlock) blocks.push(shuntBlock);
    if (neutralBlock) blocks.push(neutralBlock);
    // if (impExpBlock) blocks.push(impExpBlock);
    if (techBlock) blocks.push(techBlock);
    if (addlBlock) blocks.push(addlBlock);
    if (p4Block) blocks.push(p4Block);

    blocks.push(...resultAndRemarks);
    blocks.push(signBlock);

    return blocks;
  }

  // ===== block builders =====
  private blockShunt(r: VigRow): Content | null {
    const lbl = (t: string) => ({ text: t, bold: true, fillColor: this.theme.labelBg });
    const show =
      r.test_type === 'SHUNT' ||
      this.hasAny([
        r.shunt_reading_before_test,
        r.shunt_reading_after_test,
        r.shunt_ref_start_reading,
        r.shunt_ref_end_reading,
        r.shunt_error_percentage,
        r.shunt_current_test,
        r.shunt_creep_test,
        r.shunt_dail_test
      ]);

    if (!show) return null;

    return {
      stack: [
        this.sectionHeading('SHUNT TEST READINGS'),
        {
          layout: this.tableLayout(),
          table: {
            widths: ['*','*','*','*'],
            body: [
              [
                lbl('Before Test'),
                { text: this.fmtNum(r.shunt_reading_before_test) },
                lbl('After Test'),
                { text: this.fmtNum(r.shunt_reading_after_test) }
              ],
              [
                lbl('Ref Start'),
                { text: this.fmtNum(r.shunt_ref_start_reading) },
                lbl('Ref End'),
                { text: this.fmtNum(r.shunt_ref_end_reading) }
              ],
              [
                lbl('Error % (Shunt)'),
                { text: this.fmtNum(r.shunt_error_percentage) },
                { text: '', border: [false,false,false,false] },
                { text: '', border: [false,false,false,false] }
              ],
              [
                lbl('Starting Current'),
                this.badge(r.shunt_current_test),
                lbl('Creep Test'),
                this.badge(r.shunt_creep_test)
              ],
              [
                lbl('Dial Test'),
                this.badge(r.shunt_dail_test),
                { text: '', border: [false,false,false,false] },
                { text: '', border: [false,false,false,false] }
              ]
            ]
          }
        }
      ]
    };
  }

  private blockNeutral(r: VigRow): Content | null {
    const lbl = (t: string) => ({ text: t, bold: true, fillColor: this.theme.labelBg });
    const show =
      r.test_type === 'NEUTRAL' ||
      this.hasAny([
        r.nutral_reading_before_test,
        r.nutral_reading_after_test,
        r.nutral_ref_start_reading,
        r.nutral_ref_end_reading,
        r.nutral_error_percentage,
        r.nutral_current_test,
        r.nutral_creep_test,
        r.nutral_dail_test
      ]);

    if (!show) return null;

    return {
      stack: [
        this.sectionHeading('NEUTRAL TEST READINGS'),
        {
          layout: this.tableLayout(),
          table: {
            widths: ['*','*','*','*'],
            body: [
              [
                lbl('Before Test'),
                { text: this.fmtNum(r.nutral_reading_before_test) },
                lbl('After Test'),
                { text: this.fmtNum(r.nutral_reading_after_test) }
              ],
              [
                lbl('Ref Start'),
                { text: this.fmtNum(r.nutral_ref_start_reading) },
                lbl('Ref End'),
                { text: this.fmtNum(r.nutral_ref_end_reading) }
              ],
              [
                lbl('Error % (Neutral)'),
                { text: this.fmtNum(r.nutral_error_percentage) },
                { text: '', border: [false,false,false,false] },
                { text: '', border: [false,false,false,false] }
              ],
              [
                lbl('Starting Current'),
                this.badge(r.nutral_current_test),
                lbl('Creep Test'),
                this.badge(r.nutral_creep_test)
              ],
              [
                lbl('Dial Test'),
                this.badge(r.nutral_dail_test),
                { text: '', border: [false,false,false,false] },
                { text: '', border: [false,false,false,false] }
              ]
            ]
          }
        }
      ]
    };
  }

  private blockImportExport(r: VigRow): Content | null {
    // show if netmeter style data or import style data exists
    const showNet = r.meter_type === 'NETMETER';
    const hasImportLike = this.hasAny([
      r.start_reading_import,
      r.final_reading_import,
      r.difference_import,
      r.error_percentage_import
    ]);

    if (!showNet && !hasImportLike) return null;

    const lbl = (t: string) => ({ text: t, bold: true, fillColor: this.theme.labelBg });

    if (showNet) {
      // full import/export block
      return {
        stack: [
          this.sectionHeading('IMPORT / EXPORT READINGS (NET METER)'),
          {
            layout: this.tableLayout(),
            table: {
              headerRows: 1,
              widths: ['*','*','*','*','*','*'],
              body: [
                [
                  lbl('Import Start'),
                  { text: this.fmtNum(r.start_reading_import) },
                  lbl('Import Final'),
                  { text: this.fmtNum(r.final_reading_import) },
                  lbl('Import Error %'),
                  { text: this.fmtNum(r.error_percentage_import) }
                ],
                [
                  lbl('Export Start'),
                  { text: this.fmtNum(r.start_reading_export) },
                  lbl('Export Final'),
                  { text: this.fmtNum(r.final_reading_export) },
                  lbl('Export Error %'),
                  { text: this.fmtNum(r.error_percentage_export) }
                ],
                [
                  lbl('Import Diff'),
                  { text: this.fmtNum(r.difference_import) },
                  lbl('Export Diff'),
                  { text: this.fmtNum(r.difference_export) },
                  lbl('Final Diff'),
                  { text: this.fmtNum(r.final_Meter_Difference) }
                ]
              ]
            }
          }
        ]
      };
    }

    // import-only style
    return {
      stack: [
        this.sectionHeading('IMPORT READINGS'),
        {
          layout: this.tableLayout(),
          table: {
            headerRows: 1,
            widths: ['*','*','*','*'],
            body: [
              [
                lbl('Start Reading'),
                { text: this.fmtNum(r.start_reading_import) },
                lbl('Final Reading'),
                { text: this.fmtNum(r.final_reading_import) }
              ],
              [
                lbl('Difference'),
                { text: this.fmtNum(r.difference_import) },
                lbl('Error %'),
                { text: this.fmtNum(r.error_percentage_import) }
              ]
            ]
          }
        }
      ]
    };
  }

  private blockTechnical(r: VigRow): Content | null {
    const show = this.hasAny([
      r.dail_test_kwh_rsm,
      r.recorderedbymeter_kwh,
      r.dial_testby,
      r.meter_removaltime_metercondition
    ]);
    if (!show) return null;

    const lbl = (t: string) => ({ text: t, bold: true, fillColor: this.theme.labelBg });

    return {
      stack: [
        this.sectionHeading('TECHNICAL READINGS'),
        {
          layout: this.tableLayout(),
          table: {
            widths: ['*','*','*','*'],
            body: [
              [
                lbl('kWh by RSM'),
                { text: this.fmtNum(r.dail_test_kwh_rsm) },
                lbl('kWh by Meter'),
                { text: this.fmtNum(r.recorderedbymeter_kwh) }
              ],
              [
                lbl('Testing Mechanism'),
                { text: r.dial_testby || '' },
                lbl('Meter Condition'),
                { text: this.fmtNum(r.meter_removaltime_metercondition) }
              ]
            ]
          }
        }
      ]
    };
  }

  private blockAdditionalInfo(r: VigRow): Content | null {
    const show = this.hasAny([
      r.certificate_number,
      r.testing_fees,
      r.fees_mr_no,
      r.fees_mr_date,
      r.ref_no,
      r.test_requester_name,
      r.any_other_remarkny_zone
    ]);
    if (!show) return null;

    const lbl = (t: string) => ({ text: t, bold: true, fillColor: this.theme.labelBg });

    return {
      stack: [
        this.sectionHeading('ADDITIONAL INFORMATION'),
        {
          layout: this.tableLayout(),
          table: {
            widths: [180, '*'],
            body: [
              [ lbl('Certificate Number'), { text: r.certificate_number || '' } ],
              [ lbl('Testing Fees'),       { text: r.testing_fees || '' } ],
              [ lbl('Fees MR No.'),       { text: r.fees_mr_no || '' } ],
              [ lbl('Fees MR Date'),      { text: r.fees_mr_date || '' } ],
              [ lbl('Reference No.'),     { text: r.ref_no || '' } ],
              [ lbl('Test Requester'),    { text: r.test_requester_name || '' } ],
              [ lbl('Other Remarks'),     { text: r.any_other_remarkny_zone || '' } ]
            ]
          }
        }
      ]
    };
  }

  private blockP4(r: VigRow): Content | null {
    const show = this.hasAny([
      r.p4_division,
      r.p4_no,
      r.p4_date,
      r.p4_metercodition
    ]);
    if (!show) return null;

    const lbl = (t: string) => ({ text: t, bold: true, fillColor: this.theme.labelBg });

    return {
      stack: [
        this.sectionHeading('P4 DETAILS'),
        {
          layout: this.tableLayout(),
          table: {
            widths: [180, '*'],
            body: [
              [ lbl('P4 Division'),        { text: r.p4_division || '' } ],
              [ lbl('P4 Number'),          { text: r.p4_no || '' } ],
              [ lbl('P4 Date'),            { text: r.p4_date || '' } ],
              [ lbl('P4 Meter Condition'), { text: r.p4_metercodition || '' } ]
            ]
          }
        }
      ]
    };
  }

  private hasAny(arr: any[]): boolean {
    return arr.some(v => this.present(v));
  }
}
