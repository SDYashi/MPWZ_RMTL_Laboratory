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

  // meta / lab info / logos
  testing_bench?: string | null;
  testing_user?: string | null;
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

  // -------- internals --------

  private async buildDocWithAssets(header: CtHeader, rows: CtPdfRow[]) {
    const images: Record<string, string> = {};
    const isData = (u?: string | null) => !!u && /^data:image\/[a-zA-Z]+;base64,/.test(u || '');
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
    const safe = async (key: 'leftLogo' | 'rightLogo', url?: string | null) => {
      if (!url) return;
      try { images[key] = isData(url) ? url : await toDataURL(url); } catch { /* ignore */ }
    };

    await Promise.all([
      safe('leftLogo', header.leftLogoUrl),
      safe('rightLogo', header.rightLogoUrl),
    ]);
    if (!images['leftLogo'] && images['rightLogo']) images['leftLogo'] = images['rightLogo'];
    if (!images['rightLogo'] && images['leftLogo']) images['rightLogo'] = images['leftLogo'];

    return this.buildDoc(header, rows, images);
  }

  private buildDoc(header: CtHeader, rows: CtPdfRow[], images: Record<string, string>): TDocumentDefinitions {
    const meta = {
      zone: (header.location_code ? header.location_code + ' - ' : '') + (header.location_name || ''),
      method: header.testMethod || '-',
      status: header.testStatus || '-',
      bench: header.testing_bench || '-',
      user: header.testing_user || '-',
      date: header.date || header.date_of_testing || this.today(),

      lab_name: header.lab_name || 'REGIONAL METERING TESTING LABORATORY, INDORE',
      lab_address: header.lab_address || 'MPPKVVCL Near Conference Hall, Polo Ground, Indore (MP) 452003',
      lab_email: header.lab_email || '-',
      lab_phone: header.lab_phone || '-',
    };

    const m = 28;

    const doc: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [0, 0, 0, m],
      defaultStyle: { fontSize: 9, lineHeight: 1.1, color: '#111' },
      styles: {
        th: { bold: true, fontSize: 9 },
        kvKey: { bold: true, fillColor: '#f5f5f5' },
        tiny: { fontSize: 9, color: '#444' },
      },
      images,
      content: [
        this.headerBar(meta, images, m),
        { text: 'CT TESTING TEST REPORT', alignment: 'center', margin: [0, 6, 0, 10], fontSize: 12, bold: true },

        // --- Meta table (as requested: metaBand in table) ---
        this.metaTable(meta, m),

        // --- Consumer / Request info as a single clean table ---
        this.infoTable(header, m),

        // --- CT Details table ---
        this.detailsTable(rows, m),

        // --- Signature block (still simple) ---
        ...this.signBlock(header, m),
      ],
      footer: (current: number, total: number) => ({
        columns: [
          { text: `Page ${current} of ${total}`, alignment: 'left', margin: [m, 0, 0, 0] },
          { text: 'M.P.P.K.V.V.CO. LTD., INDORE', alignment: 'right', margin: [0, 0, m, 0] }
        ],
        fontSize: 8,
        color: '#666'
      }),
      info: { title: 'CT_Testing_TestReport' }
    };

    // NOTE: QR code removed completely (as you requested)
    return doc;
  }

  // -------- blocks --------

  private headerBar(meta: any, images: Record<string, string>, m: number) {
    return {
      margin: [m, m, m, 4],
      columns: [
        images['leftLogo'] ? { image: 'leftLogo', width: 32, margin: [0, 0, 8, 0] } : { width: 32, text: '' },
        {
          width: '*',
          stack: [
            { text: 'MADHYA PRADESH PASCHIM KHETRA VIDYUT VITARAN COMPANY LIMITED', alignment: 'center', bold: true, fontSize: 12 },
            { text: meta.lab_name, alignment: 'center', bold: true, fontSize: 11, margin: [0, 2, 0, 0] },
            { text: meta.lab_address, alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0], color: '#555' },
            { text: `Email: ${meta.lab_email} • Phone: ${meta.lab_phone}`, alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0], color: '#555' }
          ]
        },
        images['rightLogo'] ? { image: 'rightLogo', width: 32, margin: [8, 0, 0, 0] } : { width: 32, text: '' }
      ]
    };
  }

  /** metaBand as a proper table (key–value, two rows) */
  private metaTable(meta: any, m: number) {
    const K = (t: string) => ({ text: t, style: 'kvKey' });
    return {
      margin: [m, 0, m, 10],
      layout: 'lightHorizontalLines',
      table: {
        widths: ['auto', '*', 'auto', '*', 'auto', '*'],
        body: [
          [K('DC/Zone'), meta.zone || '-', K('Method'), meta.method || '-', K('Status'), meta.status || '-' ],
          [K('Bench'),   meta.bench || '-', K('User'),   meta.user || '-',   K('Date'),   meta.date   || '-' ],
        ]
      }
    };
  }

  /** All consumer/request header info in a single light table */
  private infoTable(h: CtHeader, m: number) {
    const K = (t: string) => ({ text: t, style: 'kvKey' });
    return {
      margin: [m, 0, m, 10],
      layout: 'lightHorizontalLines',
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [K('Name of consumer'), h.consumer_name || '-', K('Ref.'), h.ref_no || '-' ],
          [K('Address'), h.address || '-', K('No. of C.T'), h.no_of_ct || '-' ],
          [K('CITY CLASS'), h.city_class || '-', K('C.T Make'), h.ct_make || '-' ],
          [K('M.R. / Txn No.'), h.mr_no || '-', K('M.R. Date'), h.mr_date || '-' ],
          [K('Amount Deposited (₹)'), this.fmtMoney(h.amount_deposited), K('Date of Testing'), h.date_of_testing || '-' ],
          [K('Primary Current (A)'), h.primary_current || '-', K('Secondary Current (A)'), h.secondary_current || '-' ],
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
      { text: 'Remark', style: 'th' },
    ]];

    let i = 1;
    rows.filter(r => (r.ct_no || '').trim()).forEach(r => {
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
      margin: [m, 0, m, 8],
      style: 'tableTight',
      layout: 'lightHorizontalLines',
      table: {
        headerRows: 1,
        widths: ['auto', '*', '*', 'auto', 'auto', 'auto', '*'],
        body,
        dontBreakRows: true
      }
    };
  }

  private signBlock(h: CtHeader, m: number) {
    return [
      { text: `Primary Current: ${h.primary_current || ''} Amp    •    Secondary Current: ${h.secondary_current || ''} Amp`, style: 'tiny', margin:[0,2,0,8], alignment:'center' },
      {
        columns: [
          {
            width: '*', alignment: 'center',
            stack: [
              { text: '\n\nTested by' },
              { text: '\n____________________________', alignment: 'center' },
              { text: 'TESTING ASSISTANT (RMTL)', style: 'tiny' },
            ],
          },
          {
            width: '*', alignment: 'center',
            stack: [
              { text: '\n\nVerified by' },
              { text: '\n____________________________', alignment: 'center' },
              { text: 'JUNIOR ENGINEER (RMTL)', style: 'tiny' },
            ],
          },
          {
            width: '*', alignment: 'center',
            stack: [
              { text: '\n\nApproved by' },
              { text: '\n____________________________', alignment: 'center' },
              { text: 'ASSISTANT ENGINEER (RMTL)', style: 'tiny' },
            ],
          },
        ],
        margin: [m, 0, m, 0]
      }
    ];
  }

  // -------- utils --------

  private fmtMoney(n: any) {
    if (n === null || n === undefined || n === '') return '-';
    const v = Number(n); if (Number.isNaN(v)) return String(n);
    return `${v.toFixed(2).replace(/\.00$/, '')}/-`;
  }
  private today() { return new Date().toLocaleDateString(); }
  private autoName(header: CtHeader) {
    const d = header.date_of_testing || new Date().toISOString().slice(0, 10);
    return `CT_TESTING_${d}.pdf`;
  }
}
