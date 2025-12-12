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

  testing_bench?: string | null;
  testing_user?: string | null;
  approving_user?: string | null;
  date?: string | null;

  lab_name?: string | null;
  lab_address?: string | null;
  lab_email?: string | null;
  lab_phone?: string | null;

  leftLogoUrl?: string | null;
  rightLogoUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CtReportPdfService {

  async download(header: CtHeader, rows: CtPdfRow[], fileName = this.autoName(header)) {
    const doc = await this.buildDocWithAssets(header, rows);
    await new Promise<void>(res => pdfMake.createPdf(doc).download(fileName, () => res()));
  }

  async open(header: CtHeader, rows: CtPdfRow[]) {
    const doc = await this.buildDocWithAssets(header, rows);
    pdfMake.createPdf(doc).open();
  }

  async print(header: CtHeader, rows: CtPdfRow[]) {
    const doc = await this.buildDocWithAssets(header, rows);
    pdfMake.createPdf(doc).print();
  }

  // ---------------- INTERNALS ----------------

  private theme = {
    grid: '#e6e9ef',
    labelBg: '#f8f9fc',
    textSubtle: '#5d6b7a',
  };

  private today() {
    const d = new Date();
    const off = d.getTime() - d.getTimezoneOffset() * 60000;
    return new Date(off).toISOString().slice(0, 10);
  }

  private fmtMoney(n: any) {
    if (n === null || n === undefined || n === '') return '-';
    const v = Number(n);
    if (Number.isNaN(v)) return String(n);
    return `${v.toFixed(2).replace(/\.00$/, '')}/-`;
  }

  private autoName(header: CtHeader) {
    const d = header.date_of_testing || this.today();
    return `CT_TESTING_${d}.pdf`;
  }

  private async buildDocWithAssets(header: CtHeader, rows: CtPdfRow[]) {
    const images: Record<string, string> = {};

    const isDataUrl = (u?: string | null) =>
      !!u && /^data:image\/[a-zA-Z]+;base64,/.test(u);

    const toDataURL = async (url: string) => {
      const abs = new URL(url, document.baseURI).toString();
      const res = await fetch(abs, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`logo fetch failed ${abs}`);
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
    };

    const tryLoad = async (key: 'leftLogo' | 'rightLogo', src?: string | null) => {
      if (!src) return;
      try {
        images[key] = isDataUrl(src) ? src : await toDataURL(src);
      } catch {
        // ignore
      }
    };

    await Promise.all([
      tryLoad('leftLogo', header.leftLogoUrl),
      tryLoad('rightLogo', header.rightLogoUrl),
    ]);

    if (!images['leftLogo'] && images['rightLogo']) {
      images['leftLogo'] = images['rightLogo'];
    }
    if (!images['rightLogo'] && images['leftLogo']) {
      images['rightLogo'] = images['leftLogo'];
    }

    return this.buildDoc(header, rows, images);
  }

  private buildDoc(header: CtHeader, rows: CtPdfRow[], images: Record<string, string>): TDocumentDefinitions {
    const meta = {
      zone: (header.location_code ? header.location_code + ' - ' : '') + (header.location_name || ''),
      method: header.testMethod || '-',
      status: header.testStatus || '-',
      bench: header.testing_bench || '-',
      user: header.testing_user || '-',
      approver: header.approving_user || '-',
      date: header.date || header.date_of_testing || this.today(),
      lab_name: header.lab_name || '',
      lab_address: header.lab_address || '',
      lab_email: header.lab_email || '',
      lab_phone: header.lab_phone || '',
    };

    const m = 28;

    return {
      pageSize: 'A4',
      // back to smaller bottom margin, because signatures are in content now
      pageMargins: [18, 80, 18, 34],
      images,
      defaultStyle: {
        fontSize: 9,
        lineHeight: 1.1,
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
        th: { bold: true, fontSize: 9, fillColor: this.theme.labelBg },
        kvKey: { bold: true, fillColor: this.theme.labelBg },
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
      header: this.headerBar(meta, images),
   
      // ✅ Footer is now *only* page count + company name
      footer: (current: number, total: number) => ({
        
        columns: [
          {
            text: `Page ${current} of ${total}`,
            alignment: 'left',
            margin: [m, 0, 0, 0],
            color: this.theme.textSubtle
          },
          {
            text: 'M.P.P.K.V.V.CO. LTD., INDORE',
            alignment: 'right',
            margin: [0, 0, m, 0],
            color: this.theme.textSubtle
          }
        ],
        fontSize: 8
      }),

      content: [
     {
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: 540, y2: 0, lineWidth: 0.7 }
      ],
      margin: [0, 4, 0, 2]
    },
        {
          text: 'CT TESTING REPORT',
          alignment: 'center',
          margin: [0, 0, 0, 10],
          fontSize: 12,
          bold: true
        },

        // Meta + Consumer/Request block
        this.metaAndInfoTable(meta, header, m),

        // CT Details
        // { text: 'CT Details', style: 'sectionTitle', noWrap: true },
        this.detailsTable(rows, m),

        // ✅ Approval & signatures pulled up into content
        // { text: 'Approval', style: 'sectionTitle', noWrap: true },
        this.signBlock(meta, header, m)
      ]
    };
  }

  // ---------- HEADER BAR ----------
  private headerBar(meta: any, images: Record<string, string>) {
    return {
      margin: [18, 10, 18, 8],
      columnGap: 8,
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
              text: meta.lab_name,
              alignment: 'center',
              bold: true,
              fontSize: 11,
              margin: [0, 2, 0, 0],
              color: '#333'
            },
            {
              text: meta.lab_address,
              alignment: 'center',
              fontSize: 9,
              margin: [0, 2, 0, 0],
              color: '#555'
            },
            {
              text: `Email: ${meta.lab_email}    Phone: ${meta.lab_phone}`,
              alignment: 'center',
              fontSize: 9,
              margin: [0, 2, 0, 0],
              color: '#555'
            }
          ]
        },

        images['rightLogo']
          ? { image: 'rightLogo', width: 32, alignment: 'right' }
          : { width: 32, text: '' }
      ]
    };
  }

  private metaAndInfoTable(meta: any, h: CtHeader, m: number) {
    const K = (t: string) => ({ text: t, style: 'kvKey' });

    return {
      margin: [m, 0, m, 10],
      layout: 'cleanGrid',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [ K('DC / Zone'),
            meta.zone || '-',
            K('Ref.'),
            h.ref_no || '-'
          ],
          [ K('Method'),
            meta.method || '-',
            K('Status'),
            meta.status || '-'
          ],
          [ K('Bench'),
            meta.bench || '-',
            K('User'),
            meta.user || '-'
          ],
          [ K('Approving User'),
            meta.approver || '-',
            K('Date of Testing'),
            h.date_of_testing || meta.date || '-'
          ],
          [ K('Name of Consumer'),
            h.consumer_name || '-',
            K('Address'),
            h.address || '-'
          ],
          [ K('No. of C.T'),
            h.no_of_ct || '-',
            K('CITY CLASS'),
            h.city_class || '-'
          ],
          [ K('C.T Make'),
            h.ct_make || '-',
            K('M.R. / Txn No.'),
            h.mr_no || '-'
          ],
          [ K('M.R. Date'),
            h.mr_date || '-',
            K('Amount Deposited (₹)'),
            this.fmtMoney(h.amount_deposited)
          ],
          [ K('Primary Current (A)'),
            h.primary_current || '-',
            K('Secondary Current (A)'),
            h.secondary_current || '-'
          ],
        ]
      }
    };
  }

  private detailsTable(rows: CtPdfRow[], m: number) {
    const body: any[] = [[
      { text: '#', style: 'th', alignment: 'center' },
      { text: 'C.T No.', style: 'th' },
      { text: 'Make', style: 'th' },
      { text: 'Cap.', style: 'th' },
      { text: 'Ratio', style: 'th' },
      { text: 'Polarity', style: 'th' },
      { text: 'Remark', style: 'th' }
    ]];

    let i = 1;
    rows
      .filter(r => (r.ct_no || '').trim())
      .forEach(r => {
        body.push([
          { text: String(i++), alignment: 'center' },
          r.ct_no || '-',
          r.make || '-',
          r.cap || '-',
          r.ratio || '-',
          r.polarity || '-',
          r.remark || '-'
        ]);
      });

    return {
      margin: [m, 0, m, 10],
      layout: 'cleanGrid',
      table: {
        headerRows: 1,
        widths: ['auto', '*', '*', 'auto', 'auto', 'auto', '*'],
        body,
        dontBreakRows: true
      }
    };
  }

  private signBlock(meta: any, h: CtHeader, m: number) {
    return {
      margin: [m, 0, m, 0],
      stack: [
        {
          margin: [0, 0, 0, 8],
          text: `Primary Current: ${h.primary_current || ''} Amp    •    Secondary Current: ${h.secondary_current || ''} Amp`,
          alignment: 'center',
          style: 'small'
        },
        {
          columns: [
            {
              width: '*',
              alignment: 'center',
              stack: [
                { text: 'Tested by', bold: true, margin: [0, 4, 0, 0] },
                {
                  canvas: [
                    { type: 'line', x1: 0, y1: 0, x2: 110, y2: 0, lineWidth: 0.7 }
                  ],
                  margin: [0, 4, 0, 2]
                },
                {
                  text: (meta.user || '-').toUpperCase(),
                  style: 'small',
                  alignment: 'center'
                },
                {
                  text: 'TESTING ASSISTANT',
                  style: 'small',
                  alignment: 'center'
                }
              ]
            },
            {
              width: '*',
              alignment: 'center',
              stack: [
                { text: 'Verified by', bold: true, margin: [0, 4, 0, 0] },
                {
                  canvas: [
                    { type: 'line', x1: 0, y1: 0, x2: 110, y2: 0, lineWidth: 0.7 }
                  ],
                  margin: [0, 4, 0, 2]
                },
                {
                  text: '-',
                  style: 'small',
                  alignment: 'center'
                },
                {
                  text: 'JUNIOR ENGINEER',
                  style: 'small',
                  alignment: 'center'
                }
              ]
            },
            {
              width: '*',
              alignment: 'center',
              stack: [
                { text: 'Approved by', bold: true, margin: [0, 4, 0, 0] },
                {
                  canvas: [
                    { type: 'line', x1: 0, y1: 0, x2: 110, y2: 0, lineWidth: 0.7 }
                  ],
                  margin: [0, 4, 0, 2]
                },
                {
                  text: (meta.approver || '-').toUpperCase(),
                  style: 'small',
                  alignment: 'center'
                },
                {
                  text: 'ASSISTANT ENGINEER',
                  style: 'small',
                  alignment: 'center'
                }
              ]
            }
          ]
        }
      ]
    };
  }
}
