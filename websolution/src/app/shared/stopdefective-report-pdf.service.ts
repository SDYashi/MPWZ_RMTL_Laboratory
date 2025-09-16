// src/app/shared/stopdefective-report-pdf.service.ts
import { Injectable } from '@angular/core';
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

export interface StopDefLabInfo {
  lab_name?: string;
  address_line?: string;
  email?: string;
  phone?: string;
}
export interface StopDefRow {
  serial: string;
  make?: string;
  capacity?: string;
  remark?: string;
  test_result?: string;
}
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
export interface PdfLogos {
  leftLogoUrl?: string;   // e.g. '/assets/icons/wzlogo.png'
  rightLogoUrl?: string;  // optional; if omitted we reuse left
}

@Injectable({ providedIn: 'root' })
export class StopDefectiveReportPdfService {

  // Normalize '/assets/...' to absolute and convert to dataURL for pdfmake
  private async urlToDataUrl(url: string): Promise<string> {
    const absolute = new URL(url, document.baseURI).toString();
    const res = await fetch(absolute);
    if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private isOk(row: StopDefRow): boolean {
    const t = `${row.test_result ?? ''} ${row.remark ?? ''}`.toLowerCase();
    return /\bok\b|\bpass\b/.test(t);
  }
  private resultText(row: StopDefRow): string {
    const t = (row.test_result || '').trim();
    const m = (row.remark || '').trim();
    if (t && m && t.toUpperCase() !== 'OK') return `${t} — ${m}`;
    if (t && (!m || t.toUpperCase() === 'OK')) return t;
    return m || '-';
  }

  private buildDoc(
    rows: StopDefRow[],
    meta: StopDefMeta,
    imagesDict: Record<string, string> = {}
  ): TDocumentDefinitions {
    const total = rows.length;
    const okCount = rows.filter(r => this.isOk(r)).length;
    const defCount = total - okCount;

    const labName  = meta.lab?.lab_name || 'REMOTE METERING TESTING LABORATORY INDORE';
    const address1 = meta.lab?.address_line || 'MPPKVVCL Near Conference Hall, Polo Ground, Indore (MP) 452003';
    const email    = meta.lab?.email || 'testinglabwzind@gmail.com';
    const phone    = meta.lab?.phone || '0731-2997802';

    // Data table
    const tableBody: TableCell[][] = [[
      { text: 'S.No', style: 'th', alignment: 'center' },
      { text: 'METER NUMBER', style: 'th' },
      { text: 'MAKE', style: 'th' },
      { text: 'CAPACITY', style: 'th' },
      { text: 'TEST RESULT', style: 'th' },
    ]];
    rows.forEach((r, i) => {
      tableBody.push([
        { text: String(i + 1), alignment: 'center' },
        { text: r.serial || '-' },
        { text: r.make || '-' },
        { text: r.capacity || '-' },
        { text: this.resultText(r) },
      ]);
    });

    // Header with optional logos
    const headerRow: Content = {
      columns: [
        imagesDict['leftLogo'] ? { image: 'leftLogo', width: 30 } : { text: '' },
        {
          width: '*',
          stack: [
            { text: 'MADHYA PRADESH PASCHIM KSHETRA VIDYUT VITARAN COMPANY LIMITED', alignment: 'center', bold: true, fontSize: 13 },
            { text: labName, alignment: 'center', color: '#666', margin: [0, 2, 0, 0], fontSize: 12 },
            { text: `${address1}\nEmail: ${email} • Phone: ${phone}`, alignment: 'center', color: '#666', margin: [0, 2, 0, 0], fontSize: 10 }
          ]
        },
        imagesDict['rightLogo'] ? { image: 'rightLogo', width: 30, alignment: 'right' } : { text: '' }
      ],
      margin: [0,0,0,2]
    };

// 2-pair (2 columns) header info table (labels shaded)
const infoTable: Content = {
  layout: {
    fillColor: (_row: number, col: number) => (col % 2 === 0 ? '#f6f8fa' : undefined),
    hLineWidth: () => 0.4,
    vLineWidth: () => 0.4,
    hLineColor: () => '#e5e7eb',
    vLineColor: () => '#e5e7eb',
    padding: [2, 4, 2, 4],
    minHeight: 25,
  } as any,
  table: {
    widths: ['auto','*','auto','*'],
    body: [
      [{ text: 'ZONE/DC', style: 'kv' }, (meta.zone || '-') as any,
       { text: 'PHASE', style: 'kv' }, (meta.phase || '-') as any],

      [{ text: 'TESTING DATE', style: 'kv' }, meta.date,
       { text: 'TEST METHOD', style: 'kv' }, (meta.testMethod || '-') as any],

      // approver_id removed — keep row balanced with an empty 2nd pair
      [{ text: 'TEST STATUS', style: 'kv' }, (meta.testStatus || '-') as any,
      { text: 'APPROVING USER', style: 'kv' }, (meta.approving_user || '-') as any ],

      [{ text: 'TESTING BENCH', style: 'kv' }, (meta.testing_bench || '-') as any,
       { text: 'TESTING USER', style: 'kv' }, (meta.testing_user || '-') as any],
    ]
  }
};


    return {
      pageSize: 'A4',
      pageMargins: [28, 28, 28, 34],
      defaultStyle: { fontSize: 10 },
      info: { title: `Stop-Defective_${meta.date}` },
      images: imagesDict,
      styles: {
        th: { bold: true },
        kv: { bold: true, fontSize: 10, color: '#111827' }, // label cells
        badge: { bold: true, fontSize: 10 },
        sectionTitle: { bold: true, fontSize: 14, alignment: 'center' }
      },
      content: [
        headerRow,
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 540, y2: 0, lineWidth: 1 }], margin: [0, 6, 0, 6] },
        { text: 'STOP DEFECTIVE TEST REPORT', style: 'sectionTitle', margin: [0, 0, 0, 8] },

        infoTable,

        {
          layout: {
            fillColor: (rowIndex: number) => (rowIndex > 0 && rowIndex % 2 ? '#fafafa' : undefined),
            hLineColor: () => '#e5e7eb',
            vLineColor: () => '#e5e7eb',
          } as any,
          table: { headerRows: 1, widths: ['auto','*','*','*','*'], body: tableBody }
        },

        { text: `\nTOTAL: ${total}   •   OK: ${okCount}   •   DEF: ${defCount}`, alignment: 'right', margin: [0, 2, 0, 0] },

        { text: '\n' },

        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'Tested by', alignment: 'center', bold: true },
                { text: '\n\n____________________________', alignment: 'center' },
                { text: (meta.testing_user || meta.testerName || ''), alignment: 'center', color: '#444' },
                { text: 'TESTING ASSISTANT (RMTL)', alignment: 'center', color: '#444', fontSize: 9 },
              ],
            },
            {
              width: '*',
              stack: [
                { text: 'Verified by', alignment: 'center', bold: true },
                { text: '\n\n____________________________', alignment: 'center' },
                // { text: (meta.testerName || ''), alignment: 'center', color: '#444' },
                { text: 'JUNIOR ENGINEER (RMTL)', alignment: 'center', color: '#444', fontSize: 9 },
              ],
            },
            {
              width: '*',
              stack: [
                { text: 'Approved by', alignment: 'center', bold: true },
                { text: '\n\n____________________________', alignment: 'center' },
                // { text: (meta.approving_user || ''), alignment: 'center', color: '#444' },
                { text: 'ASSISTANT ENGINEER (RMTL)', alignment: 'center', color: '#444', fontSize: 9 },
              ],
            },
          ],
          margin: [0, 8, 0, 0]
        },
      ],
      footer: (currentPage, pageCount) => ({
        columns: [
          { text: `Page ${currentPage} of ${pageCount}`, alignment: 'left', margin: [28, 0, 0, 0] },
          { text: 'M.P.P.K.V.V. CO. LTD., INDORE', alignment: 'right', margin: [0, 0, 28, 0] },
        ],
        fontSize: 8
      })
    };
  }

  // Public API: accept rows + meta + optional logos
  async download(rows: StopDefRow[], meta: StopDefMeta, logos?: PdfLogos): Promise<void> {
    const imagesDict: Record<string, string> = {};

    try {
      if (logos?.leftLogoUrl) {
        imagesDict['leftLogo'] = await this.urlToDataUrl(logos.leftLogoUrl);
      }
      if (logos?.rightLogoUrl) {
        imagesDict['rightLogo'] = await this.urlToDataUrl(logos.rightLogoUrl);
      } else if (imagesDict['leftLogo']) {
        // reuse left if right not provided
        imagesDict['rightLogo'] = imagesDict['leftLogo'];
      }
    } catch (e) {
      // If any logo fails to load, just skip both so header renders cleanly
      delete imagesDict['leftLogo'];
      delete imagesDict['rightLogo'];
      console.warn('Logo load failed:', e);
    }

    const doc = this.buildDoc(rows, meta, imagesDict);
    const fname = `StopDefective_${meta.date}.pdf`;
    return new Promise<void>((resolve) => {
      pdfMake.createPdf(doc).download(fname, () => resolve());
    });
  }
}
