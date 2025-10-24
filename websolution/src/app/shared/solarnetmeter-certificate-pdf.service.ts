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
  // Core identity
  certificate_no?: string;
  consumer_name?: string;
  address?: string;

  meter_make?: string;
  meter_sr_no?: string;
  meter_capacity?: string;

  date_of_testing?: string | null;

  // Fees
  testing_fees?: number | null;
  mr_no?: string | null;
  mr_date?: string | null;
  ref_no?: string | null;

  // Legacy single-track (kept for compatibility)
  starting_reading?: number | null;
  final_reading_r?: number | null;
  final_reading_e?: number | null;
  difference?: number | null;

  // NEW: Import readings + reference + error
  start_reading_import?: number | null;
  final_reading__import?: number | null;      // backend name preserved
  difference__import?: number | null;

  import_ref_start_reading?: number | null;
  import_ref_end_reading?: number | null;
  error_percentage_import?: number | null;

  // NEW: Export readings + reference + error
  start_reading_export?: number | null;
  final_reading_export?: number | null;
  difference_export?: number | null;

  export_ref_start_reading?: number | null;
  export_ref_end_reading?: number | null;
  error_percentage_export?: number | null;

  // NEW: Final difference (I − E)
  final_Meter_Difference?: number | null;

  // NEW: SHUNT channel (meter vs reference)
  shunt_reading_before_test?: number | null;
  shunt_reading_after_test?: number | null;
  shunt_ref_start_reading?: number | null;
  shunt_ref_end_reading?: number | null;
  shunt_error_percentage?: number | null;

  // NEW: NUTRAL channel (meter vs reference)
  nutral_reading_before_test?: number | null;
  nutral_reading_after_test?: number | null;
  nutral_ref_start_reading?: number | null;
  nutral_ref_end_reading?: number | null;
  nutral_error_percentage?: number | null;

  // Qualitative tests + result/remarks
  starting_current_test?: string | null;
  creep_test?: string | null;
  dial_test?: string | null;

  test_result?: string | null;
  remark?: string | null;
  final_remark?: string | null;
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

  // ---------- bulk helpers ----------
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

    if (!builtDocs.length) throw new Error('No documents could be built');

    const mergedImages: Record<string,string> = {};
    const mergedContent: any[] = [];

    builtDocs.forEach((d, idx) => {
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
  private fmtNum2(n: number | string | null | undefined) {
    if (n === null || n === undefined || n === '') return '';
    const v = typeof n === 'string' ? Number(n) : n;
    if (Number.isNaN(v as number)) return String(n);
    return (v as number).toFixed(2).replace(/\.00$/,'');
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
    const dd = d.getDate().toString().padStart(2,'0');
    const mm = (d.getMonth() + 1).toString().padStart(2,'0');
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

  // ---------- header blocks ----------
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
          { text: 'Date',    ...lbl }, { text: this.fmtDateShort(meta.date) || '-' },
        ]]
      }
    };
  }

  // ---------- certificate table ----------
  private certTable(r: SolarRow) {
    const W = [160, '*', 160, '*'] as any;

    const mrText = (() => {
      const no = this.fmtTxt(r.mr_no);
      const dt = this.fmtDateShort(r.mr_date);
      if (!no && !dt) return '';
      if (no && dt) return `${no} DT ${dt}`;
      return no || dt;
    })();

    const body: any[] = [
      [ this.rowLabel('Name of consumer'), { text: this.fmtTxt(r.consumer_name), colSpan: 3 }, {}, {} ],
      [ this.rowLabel('Address'),          { text: this.fmtTxt(r.address),       colSpan: 3 }, {}, {} ],
      [ this.rowLabel('Meter Make'),       { text: this.fmtTxt(r.meter_make),    colSpan: 3 }, {}, {} ],
      [ this.rowLabel('Meter Sr. No.'),    { text: this.fmtTxt(r.meter_sr_no),   colSpan: 3 }, {}, {} ],
      [ this.rowLabel('Meter Capacity'),   { text: this.fmtTxt(r.meter_capacity),colSpan: 3 }, {}, {} ],
      [ this.rowLabel('Testing Fees Rs.'), { text: this.fmtMoney(r.testing_fees), colSpan: 3 }, {}, {} ],
      [ this.rowLabel('M.R. No & Date'),   { text: mrText, colSpan: 3 }, {}, {} ],
      [ this.rowLabel('Ref.'),             { text: this.fmtTxt(r.ref_no), colSpan: 3 }, {}, {} ],
      [ this.rowLabel('Date of Testing'),  { text: this.fmtDateShort(r.date_of_testing), colSpan: 3 }, {}, {} ],
    ];

    // --- Legacy single track (optional)
    if (r.starting_reading!=null || r.final_reading_r!=null || r.final_reading_e!=null || r.difference!=null) {
      body.push(
        [ this.rowLabel('Starting Reading'), { text: this.fmtNum(r.starting_reading), colSpan: 3 }, {}, {} ],
        [
          this.rowLabel('Final Reading'),
          { text: `I - ${this.fmtNum(r.final_reading_r)}`, alignment: 'left' },
          { text: 'E -', alignment: 'right' },
          { text: this.fmtNum(r.final_reading_e), alignment: 'left' }
        ],
        [ this.rowLabel('Difference'), { text: this.fmtNum(r.difference), colSpan: 3 }, {}, {} ],
      );
    }

    // --- IMPORT block (Meter Δ, Ref start/final, Error%)
    if (
      r.difference__import!=null || r.start_reading_import!=null || r.final_reading__import!=null ||
      r.import_ref_start_reading!=null || r.import_ref_end_reading!=null || r.error_percentage_import!=null
    ) {
      body.push(
        [{ text:'', colSpan:4, fillColor:'#f8fafc' }, {}, {}, {}],
        [ this.rowLabel('Import — Meter Start/Final'),
          { text: `${this.fmtNum(r.start_reading_import)} / ${this.fmtNum(r.final_reading__import)}`, colSpan: 3 }, {}, {} ],
        [ this.rowLabel('Import Δ (Meter)'), { text: this.fmtNum(r.difference__import), colSpan: 3 }, {}, {} ],
        [ this.rowLabel('Import — Ref Start/Final'),
          { text: `${this.fmtNum(r.import_ref_start_reading)} / ${this.fmtNum(r.import_ref_end_reading)}`, colSpan: 3 }, {}, {} ],
        [ this.rowLabel('Import Error %'), { text: this.fmtNum2(r.error_percentage_import), colSpan: 3 }, {}, {} ],
      );
    }

    // --- EXPORT block (Meter Δ, Ref start/final, Error%)
    if (
      r.difference_export!=null || r.start_reading_export!=null || r.final_reading_export!=null ||
      r.export_ref_start_reading!=null || r.export_ref_end_reading!=null || r.error_percentage_export!=null
    ) {
      body.push(
        [{ text:'', colSpan:4, fillColor:'#f8fafc' }, {}, {}, {}],
        [ this.rowLabel('Export — Meter Start/Final'),
          { text: `${this.fmtNum(r.start_reading_export)} / ${this.fmtNum(r.final_reading_export)}`, colSpan: 3 }, {}, {} ],
        [ this.rowLabel('Export Δ (Meter)'), { text: this.fmtNum(r.difference_export), colSpan: 3 }, {}, {} ],
        [ this.rowLabel('Export — Ref Start/Final'),
          { text: `${this.fmtNum(r.export_ref_start_reading)} / ${this.fmtNum(r.export_ref_end_reading)}`, colSpan: 3 }, {}, {} ],
        [ this.rowLabel('Export Error %'), { text: this.fmtNum2(r.error_percentage_export), colSpan: 3 }, {}, {} ],
      );
    }

    // --- Final Δ I − E
    if (r.final_Meter_Difference!=null) {
      body.push([ this.rowLabel('Final Difference (I − E)'), { text: this.fmtNum(r.final_Meter_Difference), colSpan: 3 }, {}, {} ]);
    }

    // --- SHUNT (optional)
    const shMeterStart = r.shunt_reading_before_test;
    const shMeterFinal = r.shunt_reading_after_test;
    const shRefStart   = r.shunt_ref_start_reading;
    const shRefFinal   = r.shunt_ref_end_reading;
    const shMeterDelta = (shMeterStart!=null && shMeterFinal!=null) ? (Number(shMeterFinal) - Number(shMeterStart)) : null;
    const shRefDelta   = (shRefStart!=null && shRefFinal!=null) ? (Number(shRefFinal) - Number(shRefStart)) : null;

    if (shMeterStart!=null || shMeterFinal!=null || shRefStart!=null || shRefFinal!=null || r.shunt_error_percentage!=null) {
      body.push(
        [{ text:'', colSpan:4, fillColor:'#f8fafc' }, {}, {}, {}],
        [ this.rowLabel('SHUNT — Meter Start/Final'),
          { text: `${this.fmtNum(shMeterStart)} / ${this.fmtNum(shMeterFinal)}`, colSpan: 3 }, {}, {} ],
        [ this.rowLabel('SHUNT Δ (Meter)'),
          { text: this.fmtNum(shMeterDelta), colSpan: 3 }, {}, {} ],
        [ this.rowLabel('SHUNT — Ref Start/Final'),
          { text: `${this.fmtNum(shRefStart)} / ${this.fmtNum(shRefFinal)}`, colSpan: 3 }, {}, {} ],
        [ this.rowLabel('SHUNT Δ (Ref)'),
          { text: this.fmtNum(shRefDelta), colSpan: 3 }, {}, {} ],
        [ this.rowLabel('SHUNT Error %'), { text: this.fmtNum2(r.shunt_error_percentage), colSpan: 3 }, {}, {} ],
      );
    }

    // --- NUTRAL (optional)
    const nuMeterStart = r.nutral_reading_before_test;
    const nuMeterFinal = r.nutral_reading_after_test;
    const nuRefStart   = r.nutral_ref_start_reading;
    const nuRefFinal   = r.nutral_ref_end_reading;
    const nuMeterDelta = (nuMeterStart!=null && nuMeterFinal!=null) ? (Number(nuMeterFinal) - Number(nuMeterStart)) : null;
    const nuRefDelta   = (nuRefStart!=null && nuRefFinal!=null) ? (Number(nuRefFinal) - Number(nuRefStart)) : null;

    if (nuMeterStart!=null || nuMeterFinal!=null || nuRefStart!=null || nuRefFinal!=null || r.nutral_error_percentage!=null) {
      body.push(
        [{ text:'', colSpan:4, fillColor:'#f8fafc' }, {}, {}, {}],
        [ this.rowLabel('NUTRAL — Meter Start/Final'),
          { text: `${this.fmtNum(nuMeterStart)} / ${this.fmtNum(nuMeterFinal)}`, colSpan: 3 }, {}, {} ],
        [ this.rowLabel('NUTRAL Δ (Meter)'),
          { text: this.fmtNum(nuMeterDelta), colSpan: 3 }, {}, {} ],
        [ this.rowLabel('NUTRAL — Ref Start/Final'),
          { text: `${this.fmtNum(nuRefStart)} / ${this.fmtNum(nuRefFinal)}`, colSpan: 3 }, {}, {} ],
        [ this.rowLabel('NUTRAL Δ (Ref)'),
          { text: this.fmtNum(nuRefDelta), colSpan: 3 }, {}, {} ],
        [ this.rowLabel('NUTRAL Error %'), { text: this.fmtNum2(r.nutral_error_percentage), colSpan: 3 }, {}, {} ],
      );
    }

    // qualitative & remark
    body.push(
      [ this.rowLabel('Starting Current Test'), { text: this.fmtTxt(r.starting_current_test), colSpan: 3 }, {}, {} ],
      [ this.rowLabel('Creep Test'),            { text: this.fmtTxt(r.creep_test),          colSpan: 3 }, {}, {} ],
      [ this.rowLabel('Dial Test'),             { text: this.fmtTxt(r.dial_test),           colSpan: 3 }, {}, {} ],
      [ this.rowLabel('Remark'), { text: this.fmtTxt(r.remark ?? r.final_remark), colSpan: 3, margin: [0,12,0,12] }, {}, {} ],
      [ this.rowLabel('Test Result'), { text: this.fmtTxt(r.test_result), colSpan: 3 }, {}, {} ],
    );

    return {
      layout: this.gridLayout,
      table: { widths: W, body }
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

  private page(r: SolarRow, meta: any, images: Record<string,string>) {
    const blocks: any[] = [];
    blocks.push(this.titleBar(meta, images));
    blocks.push(
      { text: 'SOLAR NET METER TEST REPORT', alignment: 'center', bold: true, fontSize: 14, margin: [0, 0, 0, 6] },
      { text: 'CERTIFICATE FOR A.C. SINGLE/THREE PHASE METER', alignment: 'center', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
      { text: `Certificate No: ${r.certificate_no || '-'}`, alignment: 'right', margin: [28, 0, 28, 6], bold: true },
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
