import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

export type SolarHeader = {
  location_code?: string | null;
  location_name?: string | null;
  testMethod?: string | null;
  testStatus?: string | null;

  // PDF header extras
  testing_bench?: string | null;
  testing_user?: string | null;
  date?: string | null;

  // Lab info + logos
  lab_name?: string | null;
  lab_address?: string | null;
  lab_email?: string | null;
  lab_phone?: string | null;
  leftLogoUrl?: string | null;   // http/https/relative OR data URL
  rightLogoUrl?: string | null;  // http/https/relative OR data URL
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

type TDocument = any;

@Injectable({ providedIn: 'root' })
export class SolarNetMeterCertificatePdfService {

  async download(header: SolarHeader, rows: SolarRow[], fileName = 'SOLAR_NETMETER_CERTIFICATES.pdf'): Promise<void> {
    const doc = await this.buildDocWithLogos(header, rows);
    await new Promise<void>(resolve => pdfMake.createPdf(doc).download(fileName, () => resolve()));
  }
  async open(header: SolarHeader, rows: SolarRow[]) {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).open();
  }
  async print(header: SolarHeader, rows: SolarRow[]) {
    const doc = await this.buildDocWithLogos(header, rows);
    pdfMake.createPdf(doc).print();
  }

  // -------------------- internals --------------------
  private theme = {
    grid: '#e6e9ef',
    subtle: '#5d6b7a',
    labelBg: '#f5f5f7'
  };

  private async buildDocWithLogos(header: SolarHeader, rows: SolarRow[]): Promise<TDocument> {
    const images: Record<string, string> = {};
    const isData = (u?: string | null) => !!u && /^data:image\/[a-zA-Z]+;base64,/.test(u || '');

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
        images['leftLogo'] = isData(header.leftLogoUrl) ? header.leftLogoUrl! : await toDataURL(header.leftLogoUrl!);
      }
      if (header.rightLogoUrl) {
        images['rightLogo'] = isData(header.rightLogoUrl) ? header.rightLogoUrl! : await toDataURL(header.rightLogoUrl!);
      }
      // mirror if only one logo is provided
      if (!images['leftLogo'] && images['rightLogo']) images['leftLogo'] = images['rightLogo'];
      if (!images['rightLogo'] && images['leftLogo']) images['rightLogo'] = images['leftLogo'];
    } catch {
      // ignore logo errors
    }

    return this.buildDoc(header, rows, images);
  }

  private headerBar(meta: any, images: Record<string, string>) {
    const logoBox: [number, number] = [42, 42];
    return {
      margin: [40, 16, 40, 6],
      columns: [
        images['leftLogo'] ? { image: 'leftLogo', fit: logoBox, margin: [0, 0, 10, 0] } : { width: logoBox[0], text: '' },
        {
          width: '*',
          stack: [
            { text: 'MADHYA PRADESH PASCHIM KHETRA VIDYUT VITARAN CO. LTD.', bold: true, alignment: 'center', fontSize: 11 },
            { text: meta.lab_name , bold: true, alignment: 'center', fontSize: 11, margin: [0, 2, 0, 0] },
            { text: meta.lab_address , alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0] },
            { text: `Email: ${meta.lab_email || '-'}   |   Ph: ${meta.lab_phone || '-'}`, alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0] },
          ]
        },
        images['rightLogo'] ? { image: 'rightLogo', fit: logoBox, margin: [10, 0, 0, 0] } : { width: logoBox[0], text: '' }
      ]
    };
  }

  private metaRow(meta: any) {
    const lbl = { bold: true, fillColor: this.theme.labelBg };
    return {
      layout: 'noBorders',
      margin: [0, 6, 0, 10],
      table: {
        widths: ['auto', '*', 'auto', '*', 'auto', '*'],
        body: [[
          { text: 'DC/Zone', ...lbl }, { text: meta.zone || '-' },
          { text: 'Method',  ...lbl }, { text: meta.method || '-' },
          { text: 'Status',  ...lbl }, { text: meta.status || '-' },
        ],
        [
          { text: 'Bench',   ...lbl }, { text: meta.bench || '-' },
          { text: 'User',    ...lbl }, { text: meta.user || '-' },
          { text: 'Date',    ...lbl }, { text: meta.date || '-' },
        ]]
      }
    };
  }

  private page(r: SolarRow, meta: any) {
    const sectionHeader = { bold: true, fontSize: 12, margin: [0, 8, 0, 6], decoration: 'underline' };
    const label = { bold: true, fillColor: '#f5f5f5', margin: [0, 2, 0, 2] };
    const value = { margin: [0, 2, 0, 2] };
    const noBorders = 'noBorders';

    const blocks: any[] = [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#c7c7c7' }], margin: [0, 4, 0, 6] },
      { text: 'SOLAR NET METER TEST REPORT', alignment: 'center', bold: true, fontSize: 14, margin: [0, 0, 0, 6] },
      this.metaRow(meta),
    ];

    if (r.certificate_no) {
      blocks.push({ text: `Certificate No: ${r.certificate_no}`, alignment: 'right', bold: true, margin: [0, 0, 0, 6] });
    }

    // Consumer & Meter
    blocks.push(
      { text: 'Consumer & Meter Information', ...sectionHeader },
      {
        table: {
          widths: ['30%', '70%'],
          body: [
            [{ text: 'Consumer Name', ...label }, { text: r.consumer_name || '-', ...value }],
            [{ text: 'Address', ...label }, { text: r.address || '-', ...value }],
            [{ text: 'Meter Make', ...label }, { text: r.meter_make || '-', ...value }],
            [{ text: 'Serial Number', ...label }, { text: r.meter_sr_no || '-', ...value }],
            [{ text: 'Capacity', ...label }, { text: r.meter_capacity || '-', ...value }],
          ]
        },
        layout: { defaultBorder: false, fillColor: (i: number) => (i % 2 === 0 ? '#f9f9f9' : null) },
        margin: [0, 0, 0, 10]
      }
    );

    // Testing details
    blocks.push(
      { text: 'Testing Details', ...sectionHeader },
      {
        table: {
          widths: ['30%', '35%', '35%'],
          body: [
            [{ text: 'Date of Testing', ...label }, { text: r.date_of_testing || '-', ...value, colSpan: 2 }, {}],
            [{ text: 'Testing Fees', ...label }, { text: r.testing_fees != null ? `₹${r.testing_fees}` : '-', ...value, colSpan: 2 }, {}],
            [{ text: 'M.R. Details', ...label }, { text: `No: ${r.mr_no || '-'}`, ...value }, { text: `Date: ${r.mr_date || '-'}`, ...value }],
            [{ text: 'Reference No.', ...label }, { text: r.ref_no || '-', ...value, colSpan: 2 }, {}],
          ]
        },
        layout: { defaultBorder: false, fillColor: (i: number) => (i % 2 === 0 ? '#f9f9f9' : null) },
        margin: [0, 0, 0, 10]
      }
    );

    // Readings
    blocks.push(
      { text: 'Meter Readings', ...sectionHeader },
      {
        table: {
          widths: ['30%', '23%', '23%', '24%'],
          body: [
            [{ text: 'Reading Type', ...label }, { text: 'Value', ...label, alignment: 'center' }, { text: 'Final Reading', ...label, alignment: 'center', colSpan: 2 }, {}],
            [{ text: 'Starting Reading', ...label }, { text: r.starting_reading ?? '-', ...value, alignment: 'center' }, { text: 'R:', ...label, alignment: 'right' }, { text: r.final_reading_r ?? '-', ...value, alignment: 'center' }],
            [{ text: 'Difference', ...label }, { text: r.difference ?? '-', ...value, alignment: 'center' }, { text: 'E:', ...label, alignment: 'right' }, { text: r.final_reading_e ?? '-', ...value, alignment: 'center' }],
          ]
        },
        layout: { defaultBorder: false, fillColor: (i: number) => (i % 2 === 0 ? '#f9f9f9' : null) },
        margin: [0, 0, 0, 10]
      }
    );

    // Results
    blocks.push(
      { text: 'Test Results', ...sectionHeader },
      {
        table: {
          widths: ['30%', '70%'],
          body: [
            [{ text: 'Starting Current Test', ...label }, { text: r.starting_current_test || '-', ...value }],
            [{ text: 'Creep Test', ...label }, { text: r.creep_test || '-', ...value }],
            [{ text: 'Dial Test', ...label }, { text: r.dial_test || '-', ...value }],
            [{ text: 'Overall Result', ...label }, { text: r.test_result || '-', ...value, bold: true }],
            [{ text: 'Remarks', ...label }, { text: r.remark || '-', ...value }],
          ]
        },
        layout: { defaultBorder: false, fillColor: (i: number) => (i === 0 ? '#f0f3f8' : i % 2 === 0 ? '#fafafa' : null) },
        margin: [0, 0, 0, 16]
      }
    );

    // Signatures
    blocks.push({
      table: {
        widths: ['25%', '25%', '25%', '25%'],
        body: [
          [
            { text: 'Tested by', bold: true, alignment: 'center' },
            { text: 'Verified by', bold: true, alignment: 'center' },
            { text: 'Checked by', bold: true, alignment: 'center' },
            { text: 'Approved by', bold: true, alignment: 'center' }
          ],
          [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 1 }] },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 1 }] },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 1 }] },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 1 }] }
          ],
          [
            { text: 'Testing Assistant (RMTL)', fontSize: 9, italics: true, alignment: 'center' },
            { text: 'Junior Engineer (RMTL)', fontSize: 9, italics: true, alignment: 'center' },
            { text: 'Assistant Engineer (RMTL)', fontSize: 9, italics: true, alignment: 'center' },
            { text: 'Executive Engineer', fontSize: 9, italics: true, alignment: 'center' }
          ]
        ]
      },
      layout: noBorders
    });

    return blocks;
  }

  private buildDoc(header: SolarHeader, rows: SolarRow[], images: Record<string, string>) {
    const meta = {
      zone: (header.location_code ? header.location_code + ' - ' : '') + (header.location_name || ''),
      method: header.testMethod || '-',
      status: header.testStatus || '-',
      bench: header.testing_bench || '-',
      user: header.testing_user || '-',
      date: header.date || new Date().toLocaleDateString(),
      lab_name: header.lab_name || '-',
      lab_address: header.lab_address || '-',
      lab_email: header.lab_email || '-',
      lab_phone: header.lab_phone ||'-',
    };

    const data = (rows || []).filter(r => (r.meter_sr_no || '').trim());
    const content: any[] = [];

    if (data.length > 1) {
      content.push(
        { text: 'SOLAR NET METER TEST REPORTS', alignment: 'center', bold: true, fontSize: 16, margin: [0, 120, 0, 10] },
        { text: `Batch Summary • Generated on ${meta.date}`, alignment: 'center', fontSize: 10, margin: [0, 0, 0, 16] },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', '*'],
            body: [
              [{ text: 'Serial Number', bold: true }, { text: 'Consumer Name', bold: true }, { text: 'Result', bold: true }],
              ...data.map(r => [r.meter_sr_no || '-', r.consumer_name || '-', r.test_result || '-'])
            ]
          },
          layout: { fillColor: (i: number) => (i === 0 ? '#e9edf5' : i % 2 === 0 ? '#fafafa' : null) }
        },
        { text: '', pageBreak: 'after' }
      );
    }

    data.forEach((r, i) => {
      content.push(...this.page(r, meta));
      if (i < data.length - 1) content.push({ text: '', pageBreak: 'after' });
    });

    return {
      pageSize: 'A4',
      pageMargins: [40, 110, 40, 60],
      defaultStyle: { font: 'Roboto', fontSize: 10 },
      images,
      header: this.headerBar(meta, images),
      footer: (currentPage: number, pageCount: number) => ({
        margin: [40, 0, 40, 8],
        columns: [
          { text: `Page ${currentPage} of ${pageCount}`, alignment: 'left', fontSize: 9, color: '#666' },
          { text: 'MPPKVVCL • RMTL Indore', alignment: 'right', fontSize: 9, color: '#666' }
        ]
      }),
      info: {
        title: 'Solar_NetMeter_Certificate',
        author: 'MPPKVVCL Indore',
        subject: 'Solar Net Meter Test Report'
      },
      content
    } as any;
  }
}
