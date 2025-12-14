import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

(pdfMake as any).vfs = pdfFonts.vfs;

export interface PqLabInfo {
  lab_name?: string;
  address_line?: string;
  email?: string;
  phone?: string;
}

export interface PqMeterRow {
  serial_number: string;
  make?: string;
  capacity?: string;
  remark?: string;
  test_result?: string;
}

export interface PqMeterMeta {
  zone?: string;
  phase?: string;
  date: string; // YYYY-MM-DD
  testMethod?: string;
  testStatus?: string;
  testing_bench?: string;
  testing_user?: string;
  approving_user?: string;
  lab?: PqLabInfo;
}

export interface PdfLogos {
  leftLogoUrl?: string;
  rightLogoUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class PqMeterReportPdfService {
  contentWidth = 595.28 - 18 - 18; // A4 width minus header margins
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  private logoCache = new Map<string, string>();
  private theme = { grid: '#e6e9ef', labelBg: '#f8f9fc', textSubtle: '#5d6b7a' };

  private S(v: any): string {
    return (v ?? '').toString().trim();
  }

  private resolveUrl(url: string): string {
    try {
      if (!url) return url;
      if (url.startsWith('data:')) return url;
      if (/^https?:\/\//i.test(url)) return new URL(url).toString();
      if (!isPlatformBrowser(this.platformId)) return url;
      return new URL(url, document?.baseURI || '/').toString();
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

  private resultText(row: PqMeterRow): string {
    const t = this.S(row.test_result);
    const m = this.S(row.remark);
    if (t && m && t.toUpperCase() !== 'OK') return `${t} — ${m}`;
    if (t && (!m || t.toUpperCase() === 'OK')) return t;
    return m || '-';
  }

  // FIX: header now prints lab name/address/email/phone
  private headerBar(meta: {
    orgLine: string;
    titleLine: string;
    labName: string;
    labAddress?: string;
    labEmail?: string;
    labPhone?: string;
    hasLeft: boolean;
    hasRight: boolean;
  }): Content {
    const email = this.S(meta.labEmail);
    const phone = this.S(meta.labPhone);
    const contactLine = email || phone ? `Email: ${email || '-'}    Phone: ${phone || '-'}` : '';

    return {
      margin: [18, 10, 18, 6],
      stack: [
        {
          columns: [
            meta.hasLeft ? { image: 'leftLogo', width: 34, alignment: 'left' as const } : { width: 34, text: '' },

            {
              width: '*',
              stack: [
                { text: meta.orgLine, alignment: 'center', bold: true, fontSize: 12 },
                { text: meta.labName || '-', alignment: 'center', bold: true, fontSize: 11, margin: [0, 2, 0, 0] },
                ...(meta.labAddress
                  ? [{ text: meta.labAddress, alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0], color: '#555' }]
                  : []),
                ...(contactLine
                  ? [{ text: contactLine, alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0], color: '#555' }]
                  : []),
                { text: meta.titleLine, alignment: 'center', bold: true, fontSize: 13, margin: [0, 6, 0, 0] }
              ]
            },

            meta.hasRight ? { image: 'rightLogo', width: 34, alignment: 'right' as const } : { width: 34, text: '' }
          ],
          columnGap: 8
        },
         { canvas: [{ type: 'line', x1: 0, y1: 0, x2: this.contentWidth, y2: 0, lineWidth: 1 }], margin: [0, 0, 0, 8] }
      ]
    } as any;
  }

  private metaTable(meta: PqMeterMeta): Content {
    const K = (t: string) => ({ text: t, bold: true, fillColor: this.theme.labelBg });

    const safe = {
      zone: this.S(meta.zone) || '-',
      phase: this.S(meta.phase) || '-',
      date: this.S(meta.date) || '-',
      testMethod: this.S(meta.testMethod) || '-',
      testStatus: this.S(meta.testStatus) || '-',
      testing_bench: this.S(meta.testing_bench) || '-',
      testing_user: this.S(meta.testing_user) || '-',
      approving_user: this.S(meta.approving_user) || '-'
    };

    return {
      margin: [28, 0, 28, 10],
      layout: {
        hLineWidth: () => 1.2,
        vLineWidth: () => 1.2,
        hLineColor: () => this.theme.grid,
        vLineColor: () => this.theme.grid,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 2,
        paddingBottom: () => 2
      } as any,
      table: {
        widths: ['auto', '*', 'auto', '*'],
        body: [
          [K('Zone / DC'), safe.zone, K('Phase'), safe.phase],
          [K('Testing Date'), safe.date, K('Test Method'), safe.testMethod],
          [K('Test Status'), safe.testStatus, K('Testing Bench'), safe.testing_bench],
          [K('Testing User'), safe.testing_user, K('Approving User'), safe.approving_user]
        ]
      }
    };
  }

  // FIX: better column widths + wrapping + trimming
  private detailsTable(rows: PqMeterRow[]): Content {
    const body: TableCell[][] = [
      [
        { text: '#', bold: true, fillColor: this.theme.labelBg, alignment: 'center' as const },
        { text: 'PQ METER NUMBER', bold: true, fillColor: this.theme.labelBg },
        { text: 'MAKE', bold: true, fillColor: this.theme.labelBg },
        { text: 'CAPACITY', bold: true, fillColor: this.theme.labelBg },
        { text: 'TEST RESULT / REMARK', bold: true, fillColor: this.theme.labelBg }
      ]
    ];

    rows.forEach((r, i) => {
      const sr = this.S(r.serial_number) || '-';
      const mk = this.S(r.make) || '-';
      const cap = this.S(r.capacity) || '-';

      body.push([
        { text: String(i + 1), alignment: 'center' as const },
        { text: sr, noWrap: false as any },
        { text: mk, noWrap: false as any },
        { text: cap, noWrap: false as any },
        { text: this.resultText(r), noWrap: false as any }
      ]);
    });

    return {
      margin: [28, 0, 28, 8],
      fontSize: 8,
      layout: {
        fillColor: (rowIdx: number) => (rowIdx > 0 && rowIdx % 2 === 1 ? '#fafafa' : undefined),
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.8,
        hLineColor: () => this.theme.grid,
        vLineColor: () => this.theme.grid,
        paddingLeft: () => 3,
        paddingRight: () => 3,
        paddingTop: () => 2,
        paddingBottom: () => 2
      } as any,
      table: {
        headerRows: 1,
        widths: [18, 125, 90, 70, '*'], // FIX
        body,
        dontBreakRows: true
      }
    };
  }

  private signBlock(meta: PqMeterMeta): Content {
    const line = {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 110, y2: 0, lineWidth: 0.7 }],
      margin: [0, 4, 0, 2]
    };

    return {
      margin: [0, 0, 0, 2],
      columns: [
        {
          width: '*',
          alignment: 'center',
          stack: [
            { text: 'Tested by', bold: true, fontSize: 8 },
            line,
            { text: (this.S(meta.testing_user) || '-').toUpperCase(), fontSize: 7.5, color: this.theme.textSubtle, margin: [0, 2, 0, 1] },
            { text: 'TESTING ASSISTANT', fontSize: 7, color: this.theme.textSubtle }
          ]
        },
        {
          width: '*',
          alignment: 'center',
          stack: [
            { text: 'Verified by', bold: true, fontSize: 8 },
            line,
            { text: '', fontSize: 7.5, color: this.theme.textSubtle, margin: [0, 2, 0, 1] },
            { text: 'JUNIOR ENGINEER', fontSize: 7, color: this.theme.textSubtle }
          ]
        },
        {
          width: '*',
          alignment: 'center',
          stack: [
            { text: 'Approved by', bold: true, fontSize: 8 },
            line,
            { text: (this.S(meta.approving_user) || '-').toUpperCase(), fontSize: 7.5, color: this.theme.textSubtle, margin: [0, 2, 0, 1] },
            { text: 'ASSISTANT ENGINEER', fontSize: 7, color: this.theme.textSubtle }
          ]
        }
      ]
    } as any;
  }

  private buildDoc(rows: PqMeterRow[], meta: PqMeterMeta, imagesDict: Record<string, string> = {}): TDocumentDefinitions {
    const contentWidth = 595.28 - 18 - 18;

    const labName = this.S(meta.lab?.lab_name);
    const labAddress = this.S(meta.lab?.address_line);
    const labEmail = this.S(meta.lab?.email);
    const labPhone = this.S(meta.lab?.phone);

    const safeRows = (rows || []).map((r) => ({
      serial_number: this.S(r.serial_number),
      make: this.S(r.make) || '-',
      capacity: this.S(r.capacity) || '-',
      test_result: this.S(r.test_result) || '-',
      remark: this.S(r.remark)
    }));

    return {
      pageSize: 'A4',
      pageMargins: [18, 110, 18, 80],
      defaultStyle: { fontSize: 8, lineHeight: 1.3, color: '#111' },
      info: { title: `PQ_METER_${this.S(meta.date)}` },
      images: imagesDict,

      header: this.headerBar({
        orgLine: 'MADHYA PRADESH PASCHIM KHETRA VIDYUT VITARAN COMPANY LIMITED',
        titleLine: 'PQ METER TEST REPORT',
        labName: labName || '-',          // FIX
        labAddress: labAddress || undefined,
        labEmail: labEmail || undefined,
        labPhone: labPhone || undefined,
        hasLeft: !!imagesDict['leftLogo'],
        hasRight: !!imagesDict['rightLogo']
      }) as any,

      footer: (currentPage: number, pageCount: number) =>
        ({
          margin: [18, 4, 18, 10],
          stack: [
            this.signBlock(meta),
            {
              margin: [0, 6, 0, 0],
              columns: [
                { text: `Page ${currentPage} of ${pageCount}`, alignment: 'left', color: this.theme.textSubtle, fontSize: 8 },
                { text: 'MPPKVVCL INDORE', alignment: 'right', color: this.theme.textSubtle, fontSize: 8 }
              ]
            }
          ]
        }) as any,

      content: [
        this.metaTable(meta),
        this.detailsTable(safeRows)
      ]
    };
  }

  async download(rows: PqMeterRow[], meta: PqMeterMeta, logos?: PdfLogos): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const imagesDict: Record<string, string> = {};
    try {
      if (logos?.leftLogoUrl) imagesDict['leftLogo'] = await this.urlToDataUrl(logos.leftLogoUrl);
      if (logos?.rightLogoUrl) imagesDict['rightLogo'] = await this.urlToDataUrl(logos.rightLogoUrl);
      else if (imagesDict['leftLogo']) imagesDict['rightLogo'] = imagesDict['leftLogo'];
    } catch {
      delete imagesDict['leftLogo'];
      delete imagesDict['rightLogo'];
    }

    const doc = this.buildDoc(rows, meta, imagesDict);
    const fname = `PQ_METER_${this.S(meta.date) || 'REPORT'}.pdf`;

    return new Promise<void>((resolve) => {
      try {
        pdfMake.createPdf(doc).download(fname, () => resolve());
      } catch {
        resolve();
      }
    });
  }

  async open(rows: PqMeterRow[], meta: PqMeterMeta, logos?: PdfLogos): Promise<void> {
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
