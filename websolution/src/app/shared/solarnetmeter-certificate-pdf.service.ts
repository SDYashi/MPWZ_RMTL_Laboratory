import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

type TDocument = any;

export type SolarHeader = {
  location_code?: string | null;
  location_name?: string | null;
  testMethod?: string | null;
  testStatus?: string | null;

  testing_bench?: string | null;
  testing_user?: string | null;
  date?: string | null;

  lab_name?: string | null;
  lab_address?: string | null;
  lab_email?: string | null;
  lab_phone?: string | null;
  leftLogoUrl?: string | null;
  rightLogoUrl?: string | null;
};

export type SolarRow = {
  certificate_no?: string;
  consumer_name?: string;
  address?: string;

  meter_make?: string;
  meter_sr_no?: string;
  meter_capacity?: string;

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

@Injectable({ providedIn: 'root' })
export class SolarNetMeterCertificatePdfService {

  async download(header: SolarHeader, rows: SolarRow[], fileName = 'SOLAR_NETMETER_TESTREPORT.pdf') {
    const doc = await this.buildDocWithLogos(header, rows);
    await new Promise<void>(res => pdfMake.createPdf(doc).download(fileName, () => res()));
  }
  async open(header: SolarHeader, rows: SolarRow[]) {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).open();
  }
  async print(header: SolarHeader, rows: SolarRow[]) {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).print();
  }

  // ---------- bulk helpers added (generate separate or merged PDFs) ----------
  /**
   * Generate and download multiple PDFs (one file per report).
   * Input: array of { header, rows, fileName? }
   */
  async generateAllSeparate(reports: { header: SolarHeader; rows: SolarRow[]; fileName?: string }[]) {
    for (const r of reports) {
      try {
        const doc = await this.buildDocWithLogos(r.header, r.rows);
        await new Promise<void>((res, rej) => {
          try {
            pdfMake.createPdf(doc).download(r.fileName || 'report.pdf', () => res());
          } catch (e) {
            try { pdfMake.createPdf(doc).open(); res(); } catch (err) { rej(err); }
          }
        });
      } catch (err) {
        console.error('Failed to generate report', err);
      }
    }
  }

  /**
   * Merge pages of multiple reports into a single PDF and download it.
   * This builds each report (to resolve logos) then concatenates their `content` arrays.
   */
  async mergeAndDownloadAll(
    reports: { header: SolarHeader; rows: SolarRow[] }[],
    fileName = 'ALL_SOLAR_NETMETER_CERTIFICATES.pdf'
  ) {
    const builtDocs: any[] = [];
    for (const r of reports) {
      try {
        const doc = await this.buildDocWithLogos(r.header, r.rows);
        builtDocs.push(doc);
      } catch (err) {
        console.error('Failed to build doc for header', r.header, err);
      }
    }

    if (!builtDocs.length) {
      throw new Error('No documents could be built');
    }

    const mergedImages: Record<string,string> = {};
    const mergedContent: any[] = [];

    builtDocs.forEach((d, idx) => {
      // merge images; later docs overwrite earlier keys on collisions (practical and simple)
      Object.assign(mergedImages, d.images || {});

      if (Array.isArray(d.content)) {
        d.content.forEach((block: any) => mergedContent.push(block));
        if (idx < builtDocs.length - 1) mergedContent.push({ text: '', pageBreak: 'after' });
      }
    });

    const mergedDoc: any = {
      pageSize: builtDocs[0].pageSize || 'A4',
      pageMargins: builtDocs[0].pageMargins || [0, 0, 0, 30],
      defaultStyle: builtDocs[0].defaultStyle || { font: 'Roboto', fontSize: 10, color: '#111' },
      images: mergedImages,
      footer: builtDocs[0].footer,
      info: { title: fileName },
      content: mergedContent
    };

    return await new Promise<void>((res, rej) => {
      try {
        pdfMake.createPdf(mergedDoc).download(fileName, () => res());
      } catch (e) {
        try { pdfMake.createPdf(mergedDoc).open(); res(); } catch (err) { rej(err); }
      }
    });
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

  private async buildDocWithLogos(header: SolarHeader, rows: SolarRow[]): Promise<TDocument> {
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
      try { images[key] = isData(url) ? url : await toDataURL(url); } catch (err) { console.warn('Logo fetch failed for', url, err); }
    };
    await Promise.all([safe('leftLogo', header.leftLogoUrl), safe('rightLogo', header.rightLogoUrl)]);
    if (!images['leftLogo'] && images['rightLogo']) images['leftLogo'] = images['rightLogo'];
    if (!images['rightLogo'] && images['leftLogo']) images['rightLogo'] = images['leftLogo'];

    return this.buildDoc(header, rows, images);
  }

  // ---------- header block (fixed: now uses meta + images) ----------
  private titleBar(meta: any, images: Record<string,string>) {
    const logoSize = 30;
    const labName = (meta.lab_name || '').toUpperCase();
    const address = (meta.lab_address || '').toUpperCase();
    const email = (meta.lab_email || '').toUpperCase();
    const phone = (meta.lab_phone || '').toUpperCase();

    return {
      margin: [28, 10, 28, 8],
      columns: [
        images['leftLogo'] ? { image: 'leftLogo', width: logoSize } : { width: logoSize, text: '' },
        {
          width: '*',
          stack: [
            { text: 'MADHYA PRADESH PASCHIM KHETRA VIDYUT VITARAN COMPANY LIMITED', alignment: 'center', bold: true, fontSize: 13 },
            { text: labName, alignment: 'center', color: '#444', margin: [0, 2, 0, 0], fontSize: 12 },
            { text: address, alignment: 'center', color: '#666', margin: [0, 2, 0, 0], fontSize: 10 },
            { text: `Email: ${email} • Phone: ${phone}`, alignment: 'center', color: '#666', margin: [0, 2, 0, 0], fontSize: 10 }
          ]
        },
        images['rightLogo'] ? { image: 'rightLogo', width: logoSize, alignment: 'right' } : { width: logoSize, text: '' }
      ]
    };
  }

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

  private certTable(r: SolarRow) {
    const W = [160, '*', 160, '*'] as any;

    const mrText = (() => {
      const no = this.fmtTxt(r.mr_no);
      const dt = this.fmtDateShort(r.mr_date);
      if (!no && !dt) return '';
      if (no && dt) return `${no} DT ${dt}`;
      return no || dt;
    })();

    return {
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
      columns: [
        {
          width: '*',
          stack: [
            { text: '\n\n Tested by', alignment: 'center', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: 'TESTING ASSISTANT', alignment: 'center', color: '#444', fontSize: 9 },
          ],
        },
        {
          width: '*',
          stack: [
            { text: '\n\n Verified by', alignment: 'center', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: 'JUNIOR ENGINEER', alignment: 'center', color: '#444', fontSize: 9 },
          ],
        },
        {
          width: '*',
          stack: [
            { text: '\n\n Approved by', alignment: 'center', bold: true },
            { text: '\n\n____________________________', alignment: 'center' },
            { text: 'ASSISTANT ENGINEER', alignment: 'center', color: '#444', fontSize: 9 },
          ],
        },
      ],
      margin: [0, 12, 0, 0]
    };
  }
  private metaRow(meta: any) {
    const lbl = { bold: true, fillColor: '#f5f5f5' };
    return {
       layout: this.gridLayout,
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

  private page(r: SolarRow, meta: any, images: Record<string,string>) {
    const blocks: any[] = [];
    blocks.push(this.titleBar(meta, images));

    if (r.certificate_no) {
      blocks.push(
        { text: 'SOLAR NET METER TEST REPORT', alignment: 'center', bold: true, fontSize: 14, margin: [0, 0, 0, 6] },
        { text: 'CERTIFICATE FOR A.C. SINGLE/THREE PHASE METER', alignment: 'center', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
        { text: `Certificate No: ${r.certificate_no}`, alignment: 'right', margin: [28, 0, 28, 6], bold: true });
    }
    blocks.push(   
        { text: 'SOLAR NET METER TEST REPORT', alignment: 'center', bold: true, fontSize: 14, margin: [0, 0, 0, 6] },
        { text: 'CERTIFICATE FOR A.C. SINGLE/THREE PHASE METER', alignment: 'center', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
        { text: `Certificate No: ${r.certificate_no}`, alignment: 'right', margin: [28, 0, 28, 6], bold: true },
        this.metaRow(meta),
        { margin: [28, 4, 28, 0], stack: [ this.certTable(r) ] },
      { margin: [28, 0, 28, 0], stack: [ this.signatureBlock() ] }
    );
    
    return blocks;
  }

  private buildDoc(header: SolarHeader, rows: SolarRow[], images: Record<string, string>) {
    const meta = {
      zone: (header.location_code ? header.location_code + ' - ' : '') + (header.location_name || ''),
      method: header.testMethod || '-',
      status: header.testStatus || '-',
      bench: header.testing_bench || '-',
      user: header.testing_user || '-',
      date: header.date || new Date().toISOString(),
      lab_name: header.lab_name || '',
      lab_address: header.lab_address || '',
      lab_email: header.lab_email || '',
      lab_phone: header.lab_phone || '',
    };

    const data = (rows || []).filter(r => !!(r?.meter_sr_no && String(r.meter_sr_no).trim())) as SolarRow[];
    const content: any[] = [];

    data.forEach((r, i) => {
      content.push(...this.page(r, meta, images));
      if (i < data.length - 1) content.push({ text: '', pageBreak: 'after' });
    });

    if (!data.length) {
      content.push(...this.page({} as SolarRow, meta, images));
    }

    return {
      pageSize: 'A4',
      pageMargins: [0, 0, 0, 30],
      defaultStyle: { font: 'Roboto', fontSize: 10, color: '#111' },
      images,
      footer: (currentPage: number, pageCount: number) => ({
        margin: [28, 0, 28, 8],
        columns: [
          { text: `Page ${currentPage} of ${pageCount}`, alignment: 'left', fontSize: 9, color: '#666' },
          { text: 'R.M.T.L. Indore', alignment: 'right', fontSize: 9, color: '#666' }
        ]
      }),
      content
    } as any;
  }
}
