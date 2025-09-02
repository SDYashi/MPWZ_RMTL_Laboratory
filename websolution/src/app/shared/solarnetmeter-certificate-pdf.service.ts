import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

export type SolarHeader = {
  location_code?: string | null;
  location_name?: string | null;
  testMethod?: string | null;
  testStatus?: string | null;
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

  private header(meta: { zone: string; method: string; status: string }) {
    return {
      margin: [40, 16, 40, 6],
      stack: [
        {
          columns: [
            { width: 16, text: '' },
            {
              width: '*',
              stack: [
                { text: 'MADHYA PRADESH PASCHIM KHETRA VIDYUT VITARAN CO. LTD.', bold: true, alignment: 'center', fontSize: 11 },
                { text: 'REMOTE METERING TESTING LABORATORY, INDORE', bold: true, alignment: 'center', fontSize: 11, margin: [0, 2, 0, 0] },
                { text: 'MPPKVVCL Near Conference Hall, Polo Ground, Indore – 452003 (MP)', alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0] },
                { text: 'Email: aermtlindore@gmail.com   |   Ph: 0731-29978514', alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0] },
              ]
            },
            { width: 16, text: '' }
          ]
        },
        { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#c7c7c7' }], margin: [0, 2, 0, 0] },
        {
          text: `DC/Zone: ${meta.zone || '-'}    •    Test Method: ${meta.method || '-'}    •    Test Status: ${meta.status || '-'}`,
          alignment: 'center',
          fontSize: 9,
          color: '#555',
          margin: [0, 6, 0, 0]
        }
      ]
    };
  }

  private page(r: SolarRow) {
    const sectionHeader = { bold: true, fontSize: 12, margin: [0, 10, 0, 6], decoration: 'underline' };
    const label = { bold: true, fillColor: '#f5f5f5', margin: [0, 2, 0, 2] };
    const value = { margin: [0, 2, 0, 2] };
    const noBorders = 'noBorders';

    const blocks: any[] = [
      { text: 'SOLAR NET METER TEST REPORT', alignment: 'center', bold: true, fontSize: 14, margin: [0, 5, 0, 0] },
    ];

    if (r.certificate_no) {
      blocks.push({ text: `Certificate No: ${r.certificate_no}`, alignment: 'right', bold: true, margin: [0, 0, 0, 8] });
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
        margin: [0, 0, 0, 12]
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
        margin: [0, 0, 0, 12]
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
        margin: [0, 0, 0, 12]
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
        layout: { defaultBorder: false, fillColor: (i: number) => (i % 2 === 0 ? '#f9f9f9' : null) },
        margin: [0, 0, 0, 18]
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

  private buildDoc(header: SolarHeader, rows: SolarRow[]) {
    const meta = {
      zone: (header.location_code ? header.location_code + ' - ' : '') + (header.location_name || ''),
      method: header.testMethod || '',
      status: header.testStatus || ''
    };

    const data = rows.filter(r => (r.meter_sr_no || '').trim());
    const content: any[] = [];

    if (data.length > 1) {
      content.push(
        { text: 'SOLAR NET METER TEST REPORTS', alignment: 'center', bold: true, fontSize: 16, margin: [0, 140, 0, 10] },
        { text: `Batch Summary • Generated on ${new Date().toLocaleDateString()}`, alignment: 'center', fontSize: 10, margin: [0, 0, 0, 16] },
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
      content.push(...this.page(r));
      if (i < data.length - 1) content.push({ text: '', pageBreak: 'after' });
    });

    return {
      pageSize: 'A4',
      pageMargins: [40, 110, 40, 60],
      defaultStyle: { font: 'Roboto', fontSize: 10 },
      header: () => this.header(meta),
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

  download(header: SolarHeader, rows: SolarRow[]) {
    const doc = this.buildDoc(header, rows);
    pdfMake.createPdf(doc).download('SOLAR_NETMETER_CERTIFICATES.pdf');
  }
}
