// src/app/shared/stopdefective-report-pdf.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  private logoCache = new Map<string, string>();

  private resolveUrl(url: string): string {
    try {
      if (!url) return url;
      if (url.startsWith('data:')) return url;
      if (/^https?:\/\//i.test(url)) return new URL(url).toString();
      if (!isPlatformBrowser(this.platformId)) return url;
      return new URL(url, (document?.baseURI || '/')).toString();
    } catch {
      return url;
    }
  }

  private async urlToDataUrl(url: string): Promise<string> {
    if (!url) throw new Error('Empty URL');
    if (!isPlatformBrowser(this.platformId)) throw new Error('Not in browser');
    if (url.startsWith('data:')) return url;

    const resolved = this.resolveUrl(url);
    const cached = this.logoCache.get(resolved);
    if (cached) return cached;

    const res = await fetch(resolved, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
    const blob = await res.blob();

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    this.logoCache.set(resolved, dataUrl);
    return dataUrl;
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

  private headerBar(meta: {
    orgLine: string;
    labLine: string;
    addressLine?: string;
    email?: string;
    phone?: string;
    logoWidth: number;
    logoHeight: number;
    hasLeft: boolean;
    hasRight: boolean;
    pageWidth: number;
    contentWidth: number;
  }) {
    const addr = (meta.addressLine || '').trim();
    const email = (meta.email || '').trim();
    const phone = (meta.phone || '').trim();

    // Keep it compact so pdfmake avoids wrapping across pages
    const contactLine =
      (email || phone)
        ? `Email: ${email || '-'}${email && phone ? '   •   ' : ''}Phone: ${phone || '-'}`
        : '';

    const sepLine: Content = {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: meta.contentWidth, y2: 0, lineWidth: 1 }],
      margin: [0, 6, 0, 0]
    } as Content;

    return {
      margin: [28, 8, 28, 6],
      stack: [
        {
          columns: [
            meta.hasLeft ? { image: 'leftLogo', width: meta.logoWidth, height: meta.logoHeight } : { width: meta.logoWidth, text: '' },
            {
              width: '*',
              stack: [
                { text: meta.orgLine, alignment: 'center', bold: true, fontSize: 12 },
                { text: meta.labLine, alignment: 'center', bold: true, fontSize: 11, margin: [0, 2, 0, 0] },
                ...(addr ? [{ text: addr, alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0], noWrap: false }] : []),
                ...(contactLine ? [{ text: contactLine, alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0] }] : [])
              ]
            },
            meta.hasRight ? { image: 'rightLogo', width: meta.logoWidth, height: meta.logoHeight } : { width: meta.logoWidth, text: '' }
          ],
          columnGap: 10
        },
        sepLine
      ]
    } as Content;
  }

  private buildDoc(
    rows: StopDefRow[],
    meta: StopDefMeta,
    imagesDict: Record<string, string> = {}
  ): TDocumentDefinitions {
    const total   = rows.length;
    const okCount = rows.filter(r => this.isOk(r)).length;
    const defCount = total - okCount;

    const labName  = (meta.lab?.lab_name || '').trim();
    const address1 = (meta.lab?.address_line || '').trim();
    const email    = (meta.lab?.email || '').trim() || undefined;
    const phone    = (meta.lab?.phone || '').trim() || undefined;

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

    const contentWidth = 595.28 - 28 - 28; // A4 width - margins

    const makeHeader = () => this.headerBar({
      orgLine: 'MADHYA PRADESH PASCHIM KHETRA VIDYUT VITARAN COMPANY LIMITED',
      labLine: labName || '—',
      addressLine: address1 || undefined,
      email,
      phone,
      logoWidth: 36,
      logoHeight: 36,
      hasLeft: !!imagesDict['leftLogo'],
      hasRight: !!imagesDict['rightLogo'],
      pageWidth: 595.28,
      contentWidth,
    });

    const infoTable: Content = {
      layout: {
        fillColor: (_row: number, col: number) => (col % 2 === 0 ? '#f6f8fa' : undefined),
        hLineWidth: () => 0.4,
        vLineWidth: () => 0.4,
        hLineColor: () => '#e5e7eb',
        vLineColor: () => '#e5e7eb',
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 4,
        paddingBottom: () => 4,
      } as any,
      table: {
        widths: ['auto','*','auto','*'],
        body: [
          [{ text: 'ZONE/DC', style: 'kv' }, (meta.zone || '-') as any,
           { text: 'PHASE', style: 'kv' }, (meta.phase || '-') as any],

          [{ text: 'TESTING DATE', style: 'kv' }, meta.date,
           { text: 'TEST METHOD', style: 'kv' }, (meta.testMethod || '-') as any],

          [{ text: 'TEST STATUS', style: 'kv' }, (meta.testStatus || '-') as any,
           { text: 'APPROVING USER', style: 'kv' }, (meta.approving_user || '-') as any ],

          [{ text: 'TESTING BENCH', style: 'kv' }, (meta.testing_bench || '-') as any,
           { text: 'TESTING USER', style: 'kv' }, (meta.testing_user || '-') as any],
        ]
      }
    };

    return {
      pageSize: 'A4',
      pageMargins: [28, 92, 28, 28],
      defaultStyle: { fontSize: 10 },
      info: { title: `Stop-Defective_${meta.date}` },
      images: imagesDict,
      styles: {
        th: { bold: true },
        kv: { bold: true, fontSize: 10, color: '#111827' },
        badge: { bold: true, fontSize: 10 },
        sectionTitle: { bold: true, fontSize: 13, alignment: 'center' }
      },
      header: makeHeader as any,
      content: [
        { text: 'STOP / DEFECTIVE TEST REPORT', style: 'sectionTitle', margin: [0, 0, 0, 8] },

        infoTable,

        {
          layout: {
            fillColor: (rowIndex: number) => (rowIndex > 0 && rowIndex % 2 ? '#fafafa' : undefined),
            hLineColor: () => '#e5e7eb',
            vLineColor: () => '#e5e7eb',
          } as any,
          table: { headerRows: 1, widths: ['auto','*','*','*','*'], body: tableBody },
          margin: [0, 10, 0, 0]
        },

        { text: `\nTOTAL: ${total}   •   OK: ${okCount}   •   DEF: ${defCount}`, alignment: 'right', margin: [0, 2, 0, 0] },

        { text: '\n' },

        {
          columns: [
            {
              width: '*',
              stack: [
                { text: '\n\nTested by', alignment: 'center', bold: true },
                { text: '\n\n____________________________', alignment: 'center' },
                { text: (meta.testing_user || meta.testerName || ''), alignment: 'center', color: '#444' },
                { text: 'TESTING ASSISTANT', alignment: 'center', color: '#444', fontSize: 9 },
              ],
            },
            {
              width: '*',
              stack: [
                { text: '\n\nVerified by', alignment: 'center', bold: true },
                { text: '\n\n____________________________', alignment: 'center' },
                { text: 'JUNIOR ENGINEER', alignment: 'center', color: '#444', fontSize: 9 },
              ],
            },
            {
              width: '*',
              stack: [
                { text: '\n\nApproved by', alignment: 'center', bold: true },
                { text: '\n\n____________________________', alignment: 'center' },
                { text: (meta.approving_user || ''), alignment: 'center', color: '#444' },
                { text: 'ASSISTANT ENGINEER', alignment: 'center', color: '#444', fontSize: 9 },
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

  async download(rows: StopDefRow[], meta: StopDefMeta, logos?: PdfLogos): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const imagesDict: Record<string, string> = {};
    try {
      if (logos?.leftLogoUrl) imagesDict['leftLogo'] = await this.urlToDataUrl(logos.leftLogoUrl);
      if (logos?.rightLogoUrl) imagesDict['rightLogo'] = await this.urlToDataUrl(logos.rightLogoUrl);
      else if (imagesDict['leftLogo']) imagesDict['rightLogo'] = imagesDict['leftLogo'];
    } catch (e) {
      // If one logo fails, continue gracefully without logos
      delete imagesDict['leftLogo'];
      delete imagesDict['rightLogo'];
      console.warn('Logo load failed:', e);
    }

    const doc = this.buildDoc(rows, meta, imagesDict);
    const fname = `StopDefective_${meta.date}.pdf`;
    return new Promise<void>((resolve) => {
      try {
        pdfMake.createPdf(doc).download(fname);
      } finally {
        resolve();
      }
    });
  }

  async open(rows: StopDefRow[], meta: StopDefMeta, logos?: PdfLogos): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const imagesDict: Record<string, string> = {};
    try {
      if (logos?.leftLogoUrl) imagesDict['leftLogo'] = await this.urlToDataUrl(logos.leftLogoUrl);
      if (logos?.rightLogoUrl) imagesDict['rightLogo'] = await this.urlToDataUrl(logos.rightLogoUrl);
      else if (imagesDict['leftLogo']) imagesDict['rightLogo'] = imagesDict['leftLogo'];
    } catch {}
    const doc = this.buildDoc(rows, meta, imagesDict);
    pdfMake.createPdf(doc).open();
  }
}
