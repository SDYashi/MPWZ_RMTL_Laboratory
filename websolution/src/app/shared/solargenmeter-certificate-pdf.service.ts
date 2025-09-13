import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

export type GenHeader = {
  location_code?: string | null;
  location_name?: string | null;
  testMethod?: string | null;
  testStatus?: string | null;

  // extra for PDF header/meta
  testing_bench?: string | null;
  testing_user?: string | null;
  date?: string | null;

  // lab info + logos
  lab_name?: string | null;
  lab_address?: string | null;
  lab_email?: string | null;
  lab_phone?: string | null;
  leftLogoUrl?: string | null;
  rightLogoUrl?: string | null;
};

export interface StopDefLabInfo {
  lab_name?: string;
  address_line?: string;
  email?: string;
  phone?: string;
}

export type GenRow = {
  certificate_no?: string | null;
  consumer_name?: string | null;
  address?: string | null;

  meter_make?: string | null;
  meter_sr_no?: string | null;
  meter_capacity?: string | null;

  date_of_testing?: string | null;

  testing_fees?: number | null;
  mr_no?: string | null;
  mr_date?: string | null;
  ref_no?: string | null;

  starting_reading?: number | null;
  final_reading_r?: number | null;
  final_reading_e?: number | null;
  difference?: number | null;

  starting_current_test?: string | null;
  creep_test?: string | null;
  dial_test?: string | null;

  test_result?: string | null;
  remark?: string | null;
};

export interface StopDefMeta {
  zone?: string;
  phase?: string;
  date: string;               // YYYY-MM-DD
  testMethod?: string;
  testStatus?: string;
  approverId?: string | number | null;
  testerName?: string;
  testing_bench?: string;
  testing_user?: string;
  approving_user?: string;
  lab?: StopDefLabInfo;
}

@Injectable({ providedIn: 'root' })
export class SolarGenMeterCertificatePdfService {

  // ---------- public API ----------
  async download(header: GenHeader, rows: GenRow[], fileName = 'SOLAR_GENERATIONMETER_CERTIFICATES.pdf') {
    const doc = await this.buildDocWithLogos(header, rows);
    await new Promise<void>(res => pdfMake.createPdf(doc).download(fileName, () => res()));
  }
  async open(header: GenHeader, rows: GenRow[]) {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).open();
  }
  async print(header: GenHeader, rows: GenRow[]) {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).print();
  }

  // ---------- helpers ----------
  private theme = { grid: '#9aa3ad', subtle: '#6b7280' };

  private fmtTxt(v: unknown) { return (v ?? '-') as string; }
  private fmtNum(n: number | string | null | undefined, digits = 4) {
    if (n === null || n === undefined || n === '') return '';
    const v = typeof n === 'string' ? Number(n) : n;
    if (Number.isNaN(v as number)) return String(n);
    return (v as number).toFixed(digits).replace(/\.?0+$/,'');
  }
  private fmtMoney(n: number | string | null | undefined) {
    if (n === null || n === undefined || n === '') return '';
    const v = typeof n === 'string' ? Number(n) : n;
    if (Number.isNaN(v as number)) return String(n);
    return `${(v as number).toFixed(2).replace(/\.00$/,'')}/-`;
  }
  private fmtDateShort(s?: string | null) {
    if (!s) return '';
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s as string;
    const dd = d.getDate();
    const mm = d.getMonth() + 1;
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  private async buildDocWithLogos(header: GenHeader, rows: GenRow[]) {
    const images: Record<string,string> = {};
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

    const safe = async (key: 'leftLogo'|'rightLogo', url?: string|null) => {
      if (!url) return;
      try { images[key] = isData(url) ? url : await toDataURL(url); } catch {}
    };
    await Promise.all([safe('leftLogo', header.leftLogoUrl), safe('rightLogo', header.rightLogoUrl)]);
    if (!images['leftLogo'] && images['rightLogo']) images['leftLogo'] = images['rightLogo'];
    if (!images['rightLogo'] && images['leftLogo']) images['rightLogo'] = images['leftLogo'];

    return this.buildDoc(header, rows, images);
  }

  // ---------- header + meta band ----------
  private headerBar(meta: any, images: Record<string,string>) {
    // ZERO top margin overall; add left/right padding here so header aligns with body
    return {
      margin: [28, 28, 28, 6],
      columns: [
        images['leftLogo'] ? { image: 'leftLogo', width: 32, margin: [0, 0, 8, 0] } : { width: 32, text: '' },
        {
          width: '*',
          stack: [
            { text: 'MADHYA PRADESH PASCHIM KHETRA VIDYUT VITARAN COMPANY LIMITED', alignment: 'center', bold: true, fontSize: 13 },
            { text: (meta.lab_name || 'REGIONAL METERING TESTING LABORATORY INDORE'), alignment: 'center', bold: true, fontSize: 11, margin: [0, 2, 0, 0] },
            { text: (meta.lab_address || 'MPPKVVCL Near Conference Hall, Polo Ground, Indore (MP) 452003'), alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0] },
            { text: `Email: ${meta.lab_email || '-'} • Phone: ${meta.lab_phone || '-'}`, alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0] }
          ]
        },
        images['rightLogo'] ? { image: 'rightLogo', width: 32, margin: [8, 0, 0, 0] } : { width: 32, text: '' }
      ]
    };
  }

  private metaRow(meta: any) {
    const lbl = { bold: true, fillColor: '#f5f5f5' };
    // EXACTLY six columns per row to avoid NaN widths
    return {
      layout: 'noBorders',
      margin: [28, 0, 28, 8],
      table: {
        widths: ['auto','*','auto','*','auto','*'],
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

  // ---------- sheet table ----------
  private gridLayout = {
    hLineWidth: () => 0.7,
    vLineWidth: () => 0.7,
    hLineColor: () => this.theme.grid,
    vLineColor: () => this.theme.grid,
    paddingLeft: () => 6,
    paddingRight: () => 6,
    paddingTop: () => 3,
    paddingBottom: () => 3,
  };
  private rowLabel(t: string){ return { text: t, bold: true }; }

  private certTable(r: GenRow) {
    const W = [160, '*', 160, '*'] as any;
    const mrText = (() => {
      const no = r.mr_no ?? '';
      const dt = this.fmtDateShort(r.mr_date);
      if (!no && !dt) return '';
      if (no && dt) return `${no} DT ${dt}`;
      return no || dt;
    })();

    return {
      margin: [28, 0, 28, 0],
      layout: this.gridLayout,
      table: {
        widths: W,
        body: [
          [ this.rowLabel('Name of consumer'), { text: this.fmtTxt(r.consumer_name), colSpan: 3 }, {}, {} ],
          [ this.rowLabel('Address'),          { text: this.fmtTxt(r.address),       colSpan: 3 }, {}, {} ],
          [ this.rowLabel('Meter Make'),       { text: this.fmtTxt(r.meter_make),    colSpan: 3 }, {}, {} ],
          [ this.rowLabel('Meter Sr. No.'),    { text: this.fmtTxt(r.meter_sr_no),   colSpan: 3 }, {}, {} ],
          [ this.rowLabel('Meter Capacity'),   { text: this.fmtTxt(r.meter_capacity),colSpan: 3 }, {}, {} ],
          [ this.rowLabel('Testing Fees Rs.'), { text: this.fmtMoney(r.testing_fees), colSpan: 3 }, {}, {} ],
          [ this.rowLabel('M.R. No & Date'),   { text: mrText, colSpan: 3 }, {}, {} ],
          [ this.rowLabel('Ref.'),             { text: this.fmtTxt(r.ref_no), colSpan: 3 }, {}, {} ],
          [ this.rowLabel('Date of Testing'),  { text: this.fmtDateShort(r.date_of_testing), colSpan: 3 }, {}, {} ],
          [ this.rowLabel('Starting Reading'), { text: this.fmtNum(r.starting_reading), colSpan: 3 }, {}, {} ],
          [
            this.rowLabel('Final Reading'),
            { text: `I - ${this.fmtNum(r.final_reading_r)}`, alignment: 'left' },
            { text: 'E -', alignment: 'right' },
            { text: this.fmtNum(r.final_reading_e), alignment: 'left' }
          ],
          [ this.rowLabel('Difference'), { text: this.fmtNum(r.difference), colSpan: 3 }, {}, {} ],
          [ this.rowLabel('Starting Current Test'), { text: this.fmtTxt(r.starting_current_test), colSpan: 3 }, {}, {} ],
          [ this.rowLabel('Creep Test'),            { text: this.fmtTxt(r.creep_test), colSpan: 3 }, {}, {} ],
          [ this.rowLabel('Dial Test'),             { text: this.fmtTxt(r.dial_test), colSpan: 3 }, {}, {} ],
          [ this.rowLabel('Remark'), { text: this.fmtTxt(r.remark), colSpan: 3, margin: [0,12,0,12] }, {}, {} ],
        ]
      }
    };
  }

  private signatureBlock() {
    return {
      margin: [28, 4, 28, 0],
      columns: [
        {
          width: '*',
          stack: [
            { text: '\n\n Tested by', alignment: 'center', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: 'TESTING ASSISTANT (RMTL)', alignment: 'center', color: '#444', fontSize: 9 },
          ],
        },
        {
          width: '*',
          stack: [
            { text: '\n\n Verified by', alignment: 'center', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: 'JUNIOR ENGINEER (RMTL)', alignment: 'center', color: '#444', fontSize: 9 },
          ],
        },
        {
          width: '*',
          stack: [
            { text: '\n\n Approved by', alignment: 'center', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: 'ASSISTANT ENGINEER (RMTL)', alignment: 'center', color: '#444', fontSize: 9 },
          ],
        },
      ]
    };
  }

  private page(r: GenRow, meta: any, images: Record<string,string>) {
    const blocks: any[] = [];
    blocks.push(this.headerBar(meta, images));
    blocks.push(
      { canvas: [{ type: 'line', x1: 28, y1: 0, x2: 567-28, y2: 0, lineWidth: 1 }], margin: [0, 6, 0, 6] },
      { text: 'SOLAR GENERATION METER TEST REPORT', alignment: 'center', bold: true, fontSize: 14, margin: [0, 0, 0, 8] },
      ...(r.certificate_no ? [{ text: `Certificate No: ${r.certificate_no}`, alignment: 'right', bold: true, margin: [28, 0, 28, 8] }] : [])
    );
    blocks.push(this.metaRow(meta));
    blocks.push(this.certTable(r));
    blocks.push(this.signatureBlock());
    return blocks;
  }

  private buildDoc(header: GenHeader, rows: GenRow[], images: Record<string, string>) {
    const meta = {
      zone: (header.location_code ? header.location_code + ' - ' : '') + (header.location_name || ''),
      method: header.testMethod || '-',
      status: header.testStatus || '-',
      bench: header.testing_bench || '-',
      user: header.testing_user || '-',
      date: header.date || new Date().toLocaleDateString(),

      lab_name: header.lab_name || null,
      lab_address: header.lab_address || null,
      lab_email: header.lab_email || null,
      lab_phone: header.lab_phone || null
    };

    const data = (rows || []).filter(r => (r.meter_sr_no || '').trim());
    const content: any[] = [];

    if (!data.length) {
      content.push(...this.page({} as GenRow, meta, images));
    } else {
      data.forEach((r, i) => {
        content.push(...this.page(r, meta, images));
        if (i < data.length - 1) content.push({ text: '', pageBreak: 'after' });
      });
    }

    return {
      pageSize: 'A4',
      // ZERO top margin so the header sits flush to the page top
      pageMargins: [0, 0, 0, 34],
      defaultStyle: { font: 'Roboto', fontSize: 10 },
      images,
      footer: (current: number, total: number) => ({
        margin: [28, 0, 28, 8],
        columns: [
          { text: `Page ${current} of ${total}`, alignment: 'left', fontSize: 9, color: '#666' },
          { text: 'MPPKVVCL • RMTL Indore', alignment: 'right', fontSize: 9, color: '#666' }
        ]
      }),
      info: { title: 'Solar_GenerationMeter_Certificates' },
      content
    } as any;
  }
}
