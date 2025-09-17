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

  // PDF meta / lab info / logos
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
  async download(header: CtHeader, rows: CtPdfRow[], fileName = 'CT_TESTING_TestReport.pdf') {
    const doc = await this.buildDocWithLogos(header, rows);
    await new Promise<void>(res => pdfMake.createPdf(doc).download(fileName, () => res()));
  }
  async open(header: CtHeader, rows: CtPdfRow[]) {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).open();
  }
  async print(header: CtHeader, rows: CtPdfRow[]) {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).print();
  }

  private fmtMoney(n: any) {
    if (n === null || n === undefined || n === '') return '';
    const v = Number(n); if (Number.isNaN(v)) return String(n);
    return `${v.toFixed(2).replace(/\.00$/, '')}/-`;
  }

  private async buildDocWithLogos(header: CtHeader, rows: CtPdfRow[]) {
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
      try { images[key] = isData(url) ? url : await toDataURL(url); } catch {}
    };
    await Promise.all([
      safe('leftLogo', header.leftLogoUrl),
      safe('rightLogo', header.rightLogoUrl)
    ]);
    if (!images['leftLogo'] && images['rightLogo']) images['leftLogo'] = images['rightLogo'];
    if (!images['rightLogo'] && images['leftLogo']) images['rightLogo'] = images['leftLogo'];

    return this.buildDoc(header, rows, images);
  }

  private headerBar(meta: any, images: Record<string, string>) {
    return {
      margin: [28, 28, 28, 6],
      columns: [
        images['leftLogo'] ? { image: 'leftLogo', width: 32, margin: [0, 0, 8, 0] } : { width: 32, text: '' },
        {
          width: '*',
          stack: [
            { text: 'MADHYA PRADESH PASCHIM KHETRA VIDYUT VITARAN COMPANY LIMITED', alignment: 'center', bold: true, fontSize: 12 },
            { text: (meta.lab_name || 'REGIONAL METERING TESTING LABORATORY, INDORE'), alignment: 'center', bold: true, fontSize: 11, margin: [0, 2, 0, 0] },
            { text: (meta.lab_address || 'MPPKVVCL Near Conference Hall, Polo Ground, Indore (MP) 452003'), alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0] },
            { text: `Email: ${meta.lab_email || '-'} • Phone: ${meta.lab_phone || '-'}`, alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0] }
          ]
        },
        images['rightLogo'] ? { image: 'rightLogo', width: 32, margin: [8, 0, 0, 0] } : { width: 32, text: '' }
      ]
    };
  }

  private metaBand(meta: any) {
    const lbl = { bold: true, fillColor: '#f5f5f5' };
    return {
      layout: 'noBorders',
      margin: [28, 0, 28, 8],
      table: {
        widths: ['auto', '*', 'auto', '*', 'auto', '*'],
        body: [[
          { text: 'DC/Zone', ...lbl }, { text: meta.zone || '-' },
          { text: 'Method',  ...lbl }, { text: meta.method || '-' },
          { text: 'Status',  ...lbl }, { text: meta.status || '-' },
        ], [
          { text: 'Bench',   ...lbl }, { text: meta.bench || '-' },
          { text: 'User',    ...lbl }, { text: meta.user || '-' },
          { text: 'Date',    ...lbl }, { text: meta.date || '-' },
        ]]
      }
    };
  }

  private infoTable(h: CtHeader) {
    const two = (label: string, value: any) =>
      ([{ text: label, style: 'lbl' }, { text: (value ?? '').toString(), style: 'val' }]);

    return {
      style: 'tableTight',
      layout: 'lightHorizontalLines',
      table: {
        widths: [160, '*'],
        body: [
          two('Name of consumer', h.consumer_name),
          two('Address', h.address),
          two('No. of C.T', h.no_of_ct),
          two('CITY CLASS', h.city_class),
          two('Ref.', h.ref_no),
          two('C.T Make', h.ct_make),
          two('M.R. / Txn & Date', `${h.mr_no || ''}${h.mr_no && h.mr_date ? '  DT  ' : ''}${h.mr_date || ''}`),
          two('Amount Deposited (₹)', this.fmtMoney(h.amount_deposited)),
          two('Date of Testing', h.date_of_testing),
        ]
      },
      margin: [28, 8, 28, 6]
    };
  }

  private detailsTable(rows: CtPdfRow[]) {
    const body: any[] = [[
      { text: '#', style: 'th', alignment: 'center' },
      { text: 'C.T No.', style: 'th' },
      { text: 'Make', style: 'th' },
      { text: 'Cap.', style: 'th' },
      { text: 'Ratio', style: 'th' },
      { text: 'Polarity', style: 'th' },
      { text: 'Remark', style: 'th' },
    ]];

    rows.filter(r => (r.ct_no || '').trim()).forEach((r, i) => {
      body.push([
        { text: String(i + 1), alignment: 'center' },
        r.ct_no || '-',
        r.make || '-',
        r.cap || '-',
        r.ratio || '-',
        r.polarity || '-',
        r.remark || '-'
      ]);
    });

    return {
      style: 'tableTight',
      layout: 'lightHorizontalLines',
      table: {
        headerRows: 1,
        widths: ['auto', '*', '*', 'auto', 'auto', 'auto', '*'],
        body,
        dontBreakRows: true
      },
      margin: [28, 0, 28, 6]
    };
  }

  private signBlock(h: CtHeader) {
    return [
      { text: `Primary Current: ${h.primary_current || ''} Amp    •    Secondary Current: ${h.secondary_current || ''} Amp`, style: 'tiny', margin:[0,2,0,8], alignment:'center' },
      {
        columns: [
          {
            width: '*', alignment: 'center',
            stack: [
              { text: '\n\nTested by', style: 'footRole' },
              { text: '\n____________________________', alignment: 'center' },
              { text: 'TESTING ASSISTANT (RMTL)', style: 'footTiny' },
            ],
          },
          {
            width: '*', alignment: 'center',
            stack: [
              { text: '\n\nVerified by', style: 'footRole' },
              { text: '\n____________________________', alignment: 'center' },
              { text: 'JUNIOR ENGINEER (RMTL)', style: 'footTiny' },
            ],
          },
          {
            width: '*', alignment: 'center',
            stack: [
              { text: '\n\nApproved by', style: 'footRole' },
              { text: '\n____________________________', alignment: 'center' },
              { text: 'ASSISTANT ENGINEER (RMTL)', style: 'footTiny' },
            ],
          },
        ],
        margin: [28, 0, 28, 0]
      }
    ];
  }

  private buildDoc(header: CtHeader, rows: CtPdfRow[], images: Record<string, string>): TDocumentDefinitions {
    const meta = {
      zone: (header.location_code ? header.location_code + ' - ' : '') + (header.location_name || ''),
      method: header.testMethod || '-',
      status: header.testStatus || '-',
      bench: header.testing_bench || '-',
      user: header.testing_user || '-',
      date: header.date || header.date_of_testing || new Date().toLocaleDateString(),
      lab_name: header.lab_name || null,
      lab_address: header.lab_address || null,
      lab_email: header.lab_email || null,
      lab_phone: header.lab_phone || null
    };

    return {
      pageSize: 'A4',
      pageMargins: [0, 0, 0, 28], // flush to top
      defaultStyle: { fontSize: 9, lineHeight: 1.05 },
      styles: {
        lbl: { bold: true, fontSize: 9, color: '#111' },
        val: { fontSize: 9, color: '#111' },
        th: { bold: true, fontSize: 9 },
        tableTight: { fontSize: 9 },
        footRole: { fontSize: 9, bold: true },
        footTiny: { fontSize: 8, color: '#444' },
        tiny: { fontSize: 9, color: '#333' }
      },
      images,
      content: [
        this.headerBar(meta, images),
        { canvas: [{ type: 'line', x1: 28, y1: 0, x2: 567 - 28, y2: 0, lineWidth: 1 }], margin: [0, 6, 0, 6] },
        { text: 'CT TESTING TEST REPORT', alignment: 'center', margin: [0, 0, 0, 2], fontSize: 12, bold: true },
        this.metaBand(meta),
        this.infoTable(header),
        this.detailsTable(rows),
        ...this.signBlock(header),
      ],
      footer: (current:number, total:number) => ({
        columns: [
          { text: `Page ${current} of ${total}`, alignment: 'left', margin: [28, 0, 0, 0] },
          { text: 'M.P.P.K.V.V.CO. LTD., INDORE', alignment: 'right', margin: [0, 0, 28, 0] }
        ],
        fontSize: 8
      }),
      info: { title: 'CT_Testing_TestReport' }
    } as any;
  }
}
