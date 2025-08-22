// src/app/services/stopdefective-sheet.service.ts
import { Injectable } from '@angular/core';
import type { TDocumentDefinitions, ContentTable, TableCell } from 'pdfmake/interfaces';

// pdfmake hookup (browser build)
import * as pdfMakeImport from 'pdfmake/build/pdfmake';
import * as pdfFontsImport from 'pdfmake/build/vfs_fonts';
const pdfMake: any = (pdfMakeImport as any);
(pdfMake as any).vfs = (pdfFontsImport as any).pdfMake.vfs;

// If Hindi glyphs show as boxes, add a Devanagari font (e.g. NotoSansDevanagari) to vfs
// and set defaultStyle.font = 'NotoSansDevanagari'.

export interface StopDefectiveRow {
  serial: string;
  make: string;
  capacity: string;
  remark: string;       // tester's remark text ("OK", "W/O DISPLAY", etc.)
  test_result?: string; // optional overall result ("OK"/"PASS"/"FAIL"...)
}

export interface StopDefectiveMeta {
  zone?: string;             // कक्ष/वितरण केंद्र
  phase?: string;            // फेज (e.g., 1Ø / 3Ø)
  date: string;              // yyyy-mm-dd
  testMethod?: string | null;
  testStatus?: string | null;
  approverId?: number | null;
  testerName?: string;
  labName?: string;          // header subtext (e.g., "RMTL, Indore")
}

@Injectable({ providedIn: 'root' })
export class StopDefectiveSheetService {
  /** Decide “OK?” */
  private isOk(r: StopDefectiveRow): boolean {
    const v = `${r.test_result ?? ''} ${r.remark ?? ''}`.toLowerCase();
    return /(^|\b)(ok|pass)(\b|$)/.test(v);
  }

  private resultText(r: StopDefectiveRow): string {
    const t = (r.test_result || '').trim();
    const m = (r.remark || '').trim();
    if (t && m && t.toUpperCase() !== 'OK') return `${t} — ${m}`;
    if (t && (!m || t.toUpperCase() === 'OK')) return t;
    return m || '-';
  }

  private tableBody(rows: StopDefectiveRow[]): TableCell[][] {
    const body: TableCell[][] = [
      [
        { text: 'क्र.', style: 'th', alignment: 'center' },
        { text: 'मीटर नंबर', style: 'th' },
        { text: 'मेक', style: 'th' },
        { text: 'क्षमता', style: 'th' },
        { text: 'परिणाम', style: 'th' },
      ],
    ];

    rows.forEach((r, i) => {
      body.push([
        { text: String(i + 1), alignment: 'center' },
        { text: r.serial || '-' },
        { text: r.make || '-' },
        { text: r.capacity || '-' },
        { text: this.resultText(r) },
      ]);
    });

    return body;
  }

  buildDoc(rows: StopDefectiveRow[], meta: StopDefectiveMeta): TDocumentDefinitions {
    const total = rows.length;
    const okCount = rows.filter((r) => this.isOk(r)).length;
    const defCount = total - okCount;

    const hdrLeft = [
      { text: 'मध्य प्रदेश पश्चिम क्षेत्र विद्युत वितरण कंपनी लिमिटेड', style: 'hindiTitle' },
      { text: meta.labName || 'R.M.T.L., INDORE', style: 'sub' },
    ];

    const hdrRight = [
      { text: `OK + DEF = ${total}`, style: 'badge' },
      { text: `दिनांक: ${meta.date}`, style: 'rightSmall' },
    ];

    const infoGrid: ContentTable = {
      table: {
        widths: ['auto', '*', 'auto', '*', 'auto', '*'],
        body: [
          [
            { text: 'कक्ष/वितरण केंद्र', bold: true },
            { text: meta.zone || '-' },
            { text: 'फेज', bold: true },
            { text: meta.phase || '-' },
            { text: 'परीक्षण दिनांक', bold: true },
            { text: meta.date || '-' },
          ],
          [
            { text: 'Test Method', bold: true }, { text: meta.testMethod || '-' },
            { text: 'Test Status', bold: true }, { text: meta.testStatus || '-' },
            { text: 'Approver ID', bold: true }, { text: meta.approverId ?? '-' },
          ],
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 6, 0, 8],
    };

    return {
      pageSize: 'A4',
      pageMargins: [28, 36, 28, 40],
      defaultStyle: { fontSize: 10 }, // set font: 'NotoSansDevanagari' if you add Devanagari font to vfs
      styles: {
        hindiTitle: { fontSize: 14, bold: true, alignment: 'center' },
        sub: { fontSize: 10, color: '#666', alignment: 'center', margin: [0, 2, 0, 0] },
        badge: { fontSize: 11, bold: true, alignment: 'right' },
        rightSmall: { fontSize: 9, alignment: 'right', margin: [0, 2, 0, 0] },
        th: { bold: true },
        footRole: { fontSize: 10, bold: true, alignment: 'center' },
        footTiny: { fontSize: 9, alignment: 'center', color: '#444' },
      },
      content: [
        {
          columns: [
            { stack: hdrLeft, width: '*' },
            { stack: hdrRight, width: 160 },
          ],
        },

        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 540, y2: 0, lineWidth: 1 }], margin: [0, 6, 0, 6] },

        infoGrid,

        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', '*', '*', '*'],
            body: this.tableBody(rows),
          },
          layout: 'lightHorizontalLines',
        },

        { text: `\nकुल प्रविष्टियाँ: ${total}   •   OK: ${okCount}   •   DEF: ${defCount}`, alignment: 'right' },

        { text: '\n', margin: [0, 6, 0, 0] },

        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'Tested by', style: 'footRole' },
                { text: `\n\n____________________________`, alignment: 'center' },
                { text: meta.testerName || '', style: 'footTiny' },
                { text: 'JUNIOR ENGINEER (RMTL)', style: 'footTiny' },
              ],
            },
            {
              width: '*',
              stack: [
                { text: 'Verified by', style: 'footRole' },
                { text: `\n\n____________________________`, alignment: 'center' },
                { text: 'ASSISTANT ENGINEER (RMTL)', style: 'footTiny' },
              ],
            },
          ],
          margin: [0, 8, 0, 0],
        },
      ],
      footer: (currentPage, pageCount) => ({
        columns: [
          { text: `Page ${currentPage} of ${pageCount}`, alignment: 'left', margin: [28, 0, 0, 0] },
          { text: 'M.P.P.K.V.V.CO. LTD., INDORE', alignment: 'right', margin: [0, 0, 28, 0] },
        ],
        fontSize: 8,
      }),
    };
  }

  /** Public: build & download */
  downloadFromBatch(rows: StopDefectiveRow[], meta: StopDefectiveMeta): void {
    const doc = this.buildDoc(rows, meta);
    const fname = `StopDefective_${meta.date || 'RMTL'}.pdf`;
    pdfMake.createPdf(doc).download(fname);
  }
}
