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

  // Fees
  testing_fees?: number | null;
  mr_no?: string | null;
  mr_date?: string | null;
  ref_no?: string | null;

  // Legacy single-track
  starting_reading?: number | null;
  final_reading_r?: number | null;
  final_reading_e?: number | null;
  difference?: number | null;

  // Import
  start_reading_import?: number | null;
  final_reading__import?: number | null;
  difference__import?: number | null;

  import_ref_start_reading?: number | null;
  import_ref_end_reading?: number | null;
  error_percentage_import?: number | null;

  // Export
  start_reading_export?: number | null;
  final_reading_export?: number | null;
  difference_export?: number | null;

  export_ref_start_reading?: number | null;
  export_ref_end_reading?: number | null;
  error_percentage_export?: number | null;

  // Final Δ (I − E)
  final_Meter_Difference?: number | null;

  // SHUNT channel
  shunt_reading_before_test?: number | null;
  shunt_reading_after_test?: number | null;
  shunt_ref_start_reading?: number | null;
  shunt_ref_end_reading?: number | null;
  shunt_error_percentage?: number | null;

  // NUTRAL channel
  nutral_reading_before_test?: number | null;
  nutral_reading_after_test?: number | null;
  nutral_ref_start_reading?: number | null;
  nutral_ref_end_reading?: number | null;
  nutral_error_percentage?: number | null;

  // Qualitative tests / remarks
  starting_current_test?: string | null;
  creep_test?: string | null;
  dial_test?: string | null;

  test_result?: string | null;
  remark?: string | null;
  final_remark?: string | null;
};

@Injectable({ providedIn: 'root' })
export class SolarNetMeterCertificatePdfService {
  // ---- theme ----
  private theme = {
    grid: '#9aa3ad',
    subtle: '#6b7280',
    lightFill: '#f5f5f5'
  };

  // ---- public API ----
  async download(header: SolarHeader, rows: SolarRow[], fileName = 'SOLAR_NETMETER_TESTREPORT.pdf') {
    const doc = await this.buildDocWithLogos(header, rows);
    await new Promise<void>(res =>
      pdfMake.createPdf(doc).download(fileName, () => res())
    );
  }

  async open(header: SolarHeader, rows: SolarRow[]) {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).open();
  }

  async print(header: SolarHeader, rows: SolarRow[]) {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).print();
  }

  async generateAllSeparate(
    reports: { header: SolarHeader; rows: SolarRow[]; fileName?: string }[]
  ) {
    for (const r of reports) {
      try {
        const doc = await this.buildDocWithLogos(r.header, r.rows);
        await new Promise<void>((res, rej) => {
          try {
            pdfMake.createPdf(doc).download(r.fileName || 'report.pdf', () => res());
          } catch (e) {
            try {
              pdfMake.createPdf(doc).open();
              res();
            } catch (err) { rej(err); }
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
        builtDocs.push(await this.buildDocWithLogos(r.header, r.rows));
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
        if (idx < builtDocs.length - 1) {
          mergedContent.push({ text: '', pageBreak: 'after' });
        }
      }
    });

    const mergedDoc: any = {
      pageSize: builtDocs[0].pageSize || 'A4',
      pageMargins: builtDocs[0].pageMargins || [0, 0, 0, 34],
      defaultStyle: builtDocs[0].defaultStyle || {
        fontSize: 10,
        color: '#111',
        lineHeight: 1.15
      },
      images: mergedImages,
      footer: builtDocs[0].footer,
      info: { title: fileName },
      content: mergedContent
    };

    return await new Promise<void>((res, rej) => {
      try {
        pdfMake.createPdf(mergedDoc).download(fileName, () => res());
      } catch (e) {
        try {
          pdfMake.createPdf(mergedDoc).open();
          res();
        } catch (err) { rej(err); }
      }
    });
  }

  // ---- format helpers ----
  private fmtTxt(v: unknown) {
    if (v === undefined || v === null || v === '') return '';
    return String(v);
  }
  private fmtNum(n: number | string | null | undefined, digits = 4) {
    if (n === null || n === undefined || n === '') return '';
    const v = typeof n === 'string' ? Number(n) : n;
    if (Number.isNaN(v as number)) return String(n);
    return (v as number).toFixed(digits).replace(/\.?0+$/, '');
  }
  private fmtNum2(n: number | string | null | undefined) {
    if (n === null || n === undefined || n === '') return '';
    const v = typeof n === 'string' ? Number(n) : n;
    if (Number.isNaN(v as number)) return String(n);
    return (v as number).toFixed(2).replace(/\.00$/, '');
  }
  private fmtMoney(n: number | string | null | undefined) {
    if (n === null || n === undefined || n === '') return '';
    const v = typeof n === 'string' ? Number(n) : n;
    if (Number.isNaN(v as number)) return String(n);
    return `${(v as number).toFixed(2).replace(/\.00$/, '')}/-`;
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

  // ---- layout helper ----
private gridLayout() {
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


  // ---- logo fetch ----
  private async buildDocWithLogos(header: SolarHeader, rows: SolarRow[]): Promise<TDocument> {
    const images: Record<string,string> = {};
    const isData = (u?: string | null) =>
      !!u && /^data:image\/[a-zA-Z]+;base64,/.test(u || '');

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
      try {
        images[key] = isData(url) ? url : await toDataURL(url);
      } catch (err) {
        console.warn('Logo fetch failed for', url, err);
      }
    };

    await Promise.all([
      safe('leftLogo', header.leftLogoUrl),
      safe('rightLogo', header.rightLogoUrl)
    ]);

    // mirror if only one
    if (!images['leftLogo'] && images['rightLogo']) {
      images['leftLogo'] = images['rightLogo'];
    }
    if (!images['rightLogo'] && images['leftLogo']) {
      images['rightLogo'] = images['leftLogo'];
    }

    return this.buildDoc(header, rows, images);
  }

  // ---- header / meta / cert / signature blocks ----
private headerBar(meta: any, images: Record<string,string>) {
  const logoBox = { fit: [28, 28] as [number, number] };

  return {
    margin: [28, 16, 28, 4], // was [28,28,28,6]
    stack: [
      {
        columns: [
          images['leftLogo']
            ? { image: 'leftLogo', ...logoBox, alignment: 'left' as const, margin: [0, 0, 6, 0] }
            : { width: 28, text: '' },

          {
            width: '*',
            stack: [
              {
                text: 'MADHYA PRADESH PASCHIM KHETRA VIDYUT VITARAN COMPANY LIMITED',
                alignment: 'center' as const,
                bold: true,
                fontSize: 12, // was 13
                lineHeight: 1.1
              },
              {
                text: (meta.lab_name || '').toUpperCase(),
                alignment: 'center' as const,
                bold: true,
                fontSize: 10, // was 11
                margin: [0, 1, 0, 0],
                color: '#444',
                lineHeight: 1.1
              },
              {
                text: (meta.lab_address || '').toUpperCase(),
                alignment: 'center' as const,
                fontSize: 8.5, // was 9
                margin: [0, 1, 0, 0],
                color: '#666',
                lineHeight: 1.1
              },
              {
                text: `Email: ${(meta.lab_email || '-').toUpperCase()} • Phone: ${(meta.lab_phone || '-').toUpperCase()}`,
                alignment: 'center' as const,
                fontSize: 8.5, // was 9
                margin: [0, 1, 0, 0],
                color: '#666',
                lineHeight: 1.1
              }
            ]
          },

          images['rightLogo']
            ? { image: 'rightLogo', ...logoBox, alignment: 'right' as const, margin: [6, 0, 0, 0] }
            : { width: 28, text: '' }
        ],
        columnGap: 6
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 567 - 56,
            y2: 0,
            lineWidth: 0.8
          }
        ],
        margin: [0, 4, 0, 4] // smaller divider spacing
      }
    ]
  };
}


private metaRow(meta: any) {
  const lblCell = {
    bold: true,
    fillColor: this.theme.lightFill,
    fontSize: 8,
    lineHeight: 1.05
  };

  const valCell = {
    fontSize: 8,
    lineHeight: 1.05
  };

  return {
    layout: this.gridLayout(),
    margin: [28, 0, 28, 4], // was bottom 8
    table: {
      widths: ['auto','*','auto','*','auto','*'],
      body: [
        [
          { text: 'DC/Zone', ...lblCell },
          { text: meta.zone || '-', ...valCell },

          { text: 'Method', ...lblCell },
          { text: meta.method || '-', ...valCell },

          { text: 'Status', ...lblCell },
          { text: meta.status || '-', ...valCell }
        ],
        [
          { text: 'Bench', ...lblCell },
          { text: meta.bench || '-', ...valCell },

          { text: 'User', ...lblCell },
          { text: meta.user || '-', ...valCell },

          { text: 'Date', ...lblCell },
          { text: this.fmtDateShort(meta.date) || '-', ...valCell }
        ]
      ]
    }
  };
}


  private rowLabel(t: string){ return { text: t, bold: true }; }

private certTable(r: SolarRow) {
  const W = [90, '*', 90, '*'] as any;

  const mrText = (() => {
    const no = this.fmtTxt(r.mr_no);
    const dt = this.fmtDateShort(r.mr_date);
    if (!no && !dt) return '';
    if (no && dt) return `${no} DT ${dt}`;
    return no || dt;
  })();

  const body: any[] = [
    [
      this.rowLabel('Name of Consumer'),
      { text: this.fmtTxt(r.consumer_name) },
      this.rowLabel('Meter Make'),
      { text: this.fmtTxt(r.meter_make) }
    ],
    [
      this.rowLabel('Address'),
      { text: this.fmtTxt(r.address), colSpan: 3 }, {}, {}
    ],
    [
      this.rowLabel('Meter Sr. No.'),
      { text: this.fmtTxt(r.meter_sr_no) },
      this.rowLabel('Capacity'),
      { text: this.fmtTxt(r.meter_capacity) }
    ],
    [
      this.rowLabel('Testing Fees (Rs.)'),
      { text: this.fmtMoney(r.testing_fees) },
      this.rowLabel('M.R. No & Date'),
      { text: mrText }
    ],
    [
      this.rowLabel('Ref.'),
      { text: this.fmtTxt(r.ref_no) },
      this.rowLabel('Date of Testing'),
      { text: this.fmtDateShort(r.date_of_testing) }
    ]
  ];

  // IMPORT / EXPORT / NET blocks grouped into tighter summary rows:
  const hasImport =
    r.difference__import!=null ||
    r.start_reading_import!=null ||
    r.final_reading__import!=null ||
    r.import_ref_start_reading!=null ||
    r.import_ref_end_reading!=null ||
    r.error_percentage_import!=null;

  const hasExport =
    r.difference_export!=null ||
    r.start_reading_export!=null ||
    r.final_reading_export!=null ||
    r.export_ref_start_reading!=null ||
    r.export_ref_end_reading!=null ||
    r.error_percentage_export!=null;

  if (hasImport || hasExport || r.final_Meter_Difference!=null) {
    body.push(
      [
        { text:'ENERGY RESULTS', colSpan:4, fillColor:'#f8fafc', bold:true, alignment:'center' as const },
        {}, {}, {}
      ]
    );

    if (hasImport) {
      body.push(
        [
          this.rowLabel('Import Start/Final'),
          { text: `${this.fmtNum(r.start_reading_import)} / ${this.fmtNum(r.final_reading__import)}` },
          this.rowLabel('Import Ref S/F'),
          { text: `${this.fmtNum(r.import_ref_start_reading)} / ${this.fmtNum(r.import_ref_end_reading)}` }
        ],
        [
          this.rowLabel('Import Δ / Err%'),
          { text: `${this.fmtNum(r.difference__import)} / ${this.fmtNum2(r.error_percentage_import)}` },
          { text:'', colSpan:2 }, {}
        ]
      );
    }

    if (hasExport) {
      body.push(
        [
          this.rowLabel('Export Start/Final'),
          { text: `${this.fmtNum(r.start_reading_export)} / ${this.fmtNum(r.final_reading_export)}` },
          this.rowLabel('Export Ref S/F'),
          { text: `${this.fmtNum(r.export_ref_start_reading)} / ${this.fmtNum(r.export_ref_end_reading)}` }
        ],
        [
          this.rowLabel('Export Δ / Err%'),
          { text: `${this.fmtNum(r.difference_export)} / ${this.fmtNum2(r.error_percentage_export)}` },
          { text:'', colSpan:2 }, {}
        ]
      );
    }

    if (r.final_Meter_Difference!=null) {
      body.push([
        this.rowLabel('Final Difference (I − E)'),
        { text: this.fmtNum(r.final_Meter_Difference) },
        { text:'', colSpan:2 }, {}
      ]);
    }
  }

  // SHUNT / NUTRAL grouped
  const shMeterStart = r.shunt_reading_before_test;
  const shMeterFinal = r.shunt_reading_after_test;
  const shRefStart   = r.shunt_ref_start_reading;
  const shRefFinal   = r.shunt_ref_end_reading;
  const shMeterDelta = (shMeterStart!=null && shMeterFinal!=null)
    ? Number(shMeterFinal) - Number(shMeterStart)
    : null;
  const shRefDelta   = (shRefStart!=null && shRefFinal!=null)
    ? Number(shRefFinal) - Number(shRefStart)
    : null;

  const nuMeterStart = r.nutral_reading_before_test;
  const nuMeterFinal = r.nutral_reading_after_test;
  const nuRefStart   = r.nutral_ref_start_reading;
  const nuRefFinal   = r.nutral_ref_end_reading;
  const nuMeterDelta = (nuMeterStart!=null && nuMeterFinal!=null)
    ? Number(nuMeterFinal) - Number(nuMeterStart)
    : null;
  const nuRefDelta   = (nuRefStart!=null && nuRefFinal!=null)
    ? Number(nuRefFinal) - Number(nuRefStart)
    : null;

  const hasShunt =
    shMeterStart!=null || shMeterFinal!=null ||
    shRefStart!=null || shRefFinal!=null ||
    r.shunt_error_percentage!=null;

  const hasNutral =
    nuMeterStart!=null || nuMeterFinal!=null ||
    nuRefStart!=null || nuRefFinal!=null ||
    r.nutral_error_percentage!=null;

  if (hasShunt || hasNutral) {
    body.push(
      [
        { text:'SHUNT / NUTRAL RESULTS', colSpan:4, fillColor:'#f8fafc', bold:true, alignment:'center' as const },
        {}, {}, {}
      ]
    );

    if (hasShunt) {
      body.push(
        [
          this.rowLabel('SHUNT Mtr S/F'),
          { text: `${this.fmtNum(shMeterStart)} / ${this.fmtNum(shMeterFinal)}` },
          this.rowLabel('SHUNT Ref S/F'),
          { text: `${this.fmtNum(shRefStart)} / ${this.fmtNum(shRefFinal)}` }
        ],
        [
          this.rowLabel('SHUNT Δ Mtr / Ref'),
          { text: `${this.fmtNum(shMeterDelta)} / ${this.fmtNum(shRefDelta)}` },
          this.rowLabel('SHUNT Err %'),
          { text: this.fmtNum2(r.shunt_error_percentage) }
        ]
      );
    }

    if (hasNutral) {
      body.push(
        [
          this.rowLabel('NUTRAL Mtr S/F'),
          { text: `${this.fmtNum(nuMeterStart)} / ${this.fmtNum(nuMeterFinal)}` },
          this.rowLabel('NUTRAL Ref S/F'),
          { text: `${this.fmtNum(nuRefStart)} / ${this.fmtNum(nuRefFinal)}` }
        ],
        [
          this.rowLabel('NUTRAL Δ Mtr / Ref'),
          { text: `${this.fmtNum(nuMeterDelta)} / ${this.fmtNum(nuRefDelta)}` },
          this.rowLabel('NUTRAL Err %'),
          { text: this.fmtNum2(r.nutral_error_percentage) }
        ]
      );
    }
  }

  // qualitative / remarks squeezed
  body.push(
    [
      this.rowLabel('Start Curr Test'),
      { text: this.fmtTxt(r.starting_current_test) },
      this.rowLabel('Creep Test'),
      { text: this.fmtTxt(r.creep_test) }
    ],
    [
      this.rowLabel('Dial Test'),
      { text: this.fmtTxt(r.dial_test) },
      this.rowLabel('Test Result'),
      { text: this.fmtTxt(r.test_result), bold: true }
    ],
    [
      this.rowLabel('Remark'),
      { text: this.fmtTxt(r.remark ?? r.final_remark), colSpan: 3, margin: [0,6,0,6] },
      {},
      {}
    ]
  );

  return {
    layout: this.gridLayout(),
    table: {
      widths: W,
      body
    },
    fontSize: 9,
    lineHeight: 1.05
  };
}


private signatureBlock() {
  const roleStyle = {
    alignment: 'center' as const,
    color: this.theme.subtle,
    fontSize: 8,
    lineHeight: 1.05
  };

  return {
    margin: [28, 8, 28, 0], // was [28,14,28,0]
    columns: [
      {
        width: '*',
        stack: [
          { text: 'Tested by', alignment: 'center' as const, bold: true, fontSize: 9 },
          { text: '____________________', alignment: 'center' as const, margin: [0,4,0,2] },
          { text: 'TESTING ASSISTANT', ...roleStyle }
        ]
      },
      {
        width: '*',
        stack: [
          { text: 'Verified by', alignment: 'center' as const, bold: true, fontSize: 9 },
          { text: '____________________', alignment: 'center' as const, margin: [0,4,0,2] },
          { text: 'JUNIOR ENGINEER', ...roleStyle }
        ]
      },
      {
        width: '*',
        stack: [
          { text: 'Approved by', alignment: 'center' as const, bold: true, fontSize: 9 },
          { text: '____________________', alignment: 'center' as const, margin: [0,4,0,2] },
          { text: 'ASSISTANT ENGINEER', ...roleStyle }
        ]
      }
    ],
    columnGap: 8
  };
}


private page(r: SolarRow, meta: any, images: Record<string,string>) {
  const blocks: any[] = [];

  blocks.push(this.headerBar(meta, images));

  blocks.push(
    {
      text: 'SOLAR NET METER TEST REPORT',
      alignment: 'center' as const,
      bold: true,
      fontSize: 12, // was 14
      margin: [0, 0, 0, 2],
      lineHeight: 1.1
    },
    {
      text: 'CERTIFICATE FOR A.C. SINGLE/THREE PHASE METER',
      alignment: 'center' as const,
      bold: true,
      fontSize: 10, // was 11
      margin: [0, 0, 0, 2],
      lineHeight: 1.1
    },
    ...(r.certificate_no
      ? [{
          text: `Certificate No: ${r.certificate_no || '-'}`,
          alignment: 'right' as const,
          margin: [28, 0, 28, 4],
          bold: true,
          fontSize: 9,
          lineHeight: 1.05
        }]
      : [])
  );

  blocks.push(this.metaRow(meta));

  blocks.push({
    margin: [28, 2, 28, 0],
    stack: [ this.certTable(r) ]
  });

  blocks.push(this.signatureBlock());

  return blocks;
}


private buildDoc(header: SolarHeader, rows: SolarRow[], images: Record<string, string>) {
  const meta = {
    zone:
      (header.location_code ? header.location_code + ' - ' : '') +
      (header.location_name || ''),
    method: header.testMethod || '-',
    status: header.testStatus || '-',
    bench: header.testing_bench || '-',
    user: header.testing_user || '-',
    date: header.date || new Date().toISOString().slice(0,10),

    lab_name: header.lab_name || '',
    lab_address: header.lab_address || '',
    lab_email: header.lab_email || '',
    lab_phone: header.lab_phone || ''
  };

  const data = (rows || []).filter(
    r => !!(r?.meter_sr_no && String(r.meter_sr_no).trim())
  );

  const content: any[] = [];
  if (!data.length) {
    content.push(...this.page({} as SolarRow, meta, images));
  } else {
    data.forEach((r, i) => {
      content.push(...this.page(r, meta, images));
      if (i < data.length - 1) {
        content.push({ text: '', pageBreak: 'after' });
      }
    });
  }

  return {
    pageSize: 'A4',
    pageMargins: [0, 0, 0, 24], // was [0,0,0,34], smaller bottom
    defaultStyle: {
      fontSize: 9,     // was 10
      color: '#111',
      lineHeight: 1.05 // was 1.15
    },
    images,
    footer: (currentPage: number, pageCount: number) => ({
      margin: [28, 0, 28, 4], // was [28,0,28,8]
      columns: [
        {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: 'left' as const,
          fontSize: 8,
          color: '#666',
          lineHeight: 1.05
        },
        {
          text: 'R.M.T.L. Indore',
          alignment: 'right' as const,
          fontSize: 8,
          color: '#666',
          lineHeight: 1.05
        }
      ]
    }),
    info: { title: 'Solar_NetMeter_Certificates' },
    content
  } as any;
}

}
