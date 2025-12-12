// src/app/shared/newmeter-report-pdf.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

export interface NewMeterLabInfo {
  lab_name?: string;
  address_line?: string;
  email?: string;
  phone?: string;
}

export interface NewMeterRow {
  serial_number: string;
  make?: string;
  capacity?: string;
  test_result?: string;
  remark?: string;
}

export interface NewMeterMeta {
  zone?: string;
  phase?: string;
  date: string; // YYYY-MM-DD
  testMethod?: string;
  testStatus?: string;

  testing_bench?: string;
  testing_user?: string;
  approving_user?: string;

  lab?: NewMeterLabInfo;
}

export interface PdfLogos {
  leftLogoUrl?: string;
  rightLogoUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class NewMeterReportPdfService {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  private logoCache = new Map<string, string>();

  // ---------- Theme & helpers ----------
  private theme = {
    grid: '#e6e9ef',
    labelBg: '#f8f9fc',
    softHeaderBg: '#eef7ff',
    textSubtle: '#5d6b7a',
  };

  // ---- asset helpers ----
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

  // ---- row helpers ----
  private isPass(row: NewMeterRow): boolean {
    const t = `${row.test_result ?? ''} ${row.remark ?? ''}`.toLowerCase();
    return /\bok\b|\bpass\b/.test(t);
  }

  private resultText(row: NewMeterRow): string {
    const t = (row.test_result || '').trim();
    const m = (row.remark || '').trim();
    if (t && m && t.toUpperCase() !== 'OK') return `${t} — ${m}`;
    if (t && (!m || t.toUpperCase() === 'OK')) return t;
    return m || '-';
  }

  // ---- PDF blocks ----

  /** Top banner with logos, company line, lab line, contacts */
  private headerBar(meta: {
    orgLine: string;
    labName: string;
    labAddress?: string;
    labEmail?: string;
    labPhone?: string;
    contentWidth: number;
    hasLeft: boolean;
    hasRight: boolean;
  }): Content {
    const contactLine =
      (meta.labEmail || meta.labPhone)
        ? `Email: ${meta.labEmail || '-'}    Phone: ${meta.labPhone || '-'}` 
        : '';

    return {
      margin: [18, 10, 18, 8],
      stack: [
        {
          columns: [
            meta.hasLeft
              ? { image: 'leftLogo', width: 32, alignment: 'left' as const }
              : { width: 32, text: '' },

            {
              width: '*',
              stack: [
                {
                  text: meta.orgLine,
                  alignment: 'center' as const,
                  bold: true,
                  fontSize: 12
                },
                {
                  text: meta.labName || '-',
                  alignment: 'center' as const,
                  bold: true,
                  fontSize: 11,
                  margin: [0, 2, 0, 0],
                  color: '#333'
                },
                ...(meta.labAddress
                  ? [{
                      text: meta.labAddress,
                      alignment: 'center' as const,
                      fontSize: 9,
                      margin: [0, 2, 0, 0],
                      color: '#555'
                    }]
                  : []),
                ...(contactLine
                  ? [{
                      text: contactLine,
                      alignment: 'center' as const,
                      fontSize: 9,
                      margin: [0, 2, 0, 0],
                      color: '#555'
                    }]
                  : [])
              ]
            },

            meta.hasRight
              ? { image: 'rightLogo', width: 32, alignment: 'right' as const }
              : { width: 32, text: '' }
          ],
          columnGap: 8
        }
      ]
    } as any;
  }

  /** Test Meta (Zone, Phase, etc.) — compact grid */
  private metaTable(meta: NewMeterMeta): Content {
    const K = (t: string) => ({
      text: t,
      bold: true,
      fillColor: this.theme.labelBg
    });

    return {
      margin: [28, 0, 28, 10],
      layout: {
        hLineWidth: () => 1.5,
        vLineWidth: () => 1.5,
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
          [
            K('Zone / DC'),
            meta.zone || '-',
            K('Phase'),
            meta.phase || '-'
          ],
          [
            K('Testing Date'),
            meta.date || '-',
            K('Test Method'),
            meta.testMethod || '-'
          ],
          [
            K('Test Status'),
            meta.testStatus || '-',
            K('Testing Bench'),
            meta.testing_bench || '-'
          ],
          [
            K('Testing User'),
            meta.testing_user || '-',
            K('Approving User'),
            meta.approving_user || '-'
          ]
        ]
      }
    };
  }

  /** Main NEW METER summary table (aligned with other reports) */
  private detailsTable(rows: NewMeterRow[]): Content {
    const body: TableCell[][] = [[
      { text: '#', bold: true, fillColor: this.theme.labelBg, alignment: 'center' as const },
      { text: 'METER NUMBER', bold: true, fillColor: this.theme.labelBg },
      { text: 'MAKE', bold: true, fillColor: this.theme.labelBg },
      { text: 'CAPACITY', bold: true, fillColor: this.theme.labelBg },
      { text: 'RESULT / REMARK', bold: true, fillColor: this.theme.labelBg }
    ]];

    rows.forEach((r, i) => {
      body.push([
        { text: String(i + 1), alignment: 'center' as const },
        { text: r.serial_number || '-' },
        { text: r.make || '-' },
        { text: r.capacity || '-' },
        { text: this.resultText(r) }
      ]);
    });

    return {
      margin: [28, 0, 28, 8],
      fontSize: 8,
      layout: {
        fillColor: (rowIdx: number) =>
          rowIdx > 0 && rowIdx % 2 === 1 ? '#fafafa' : undefined,
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.8,
        hLineColor: () => this.theme.grid,
        vLineColor: () => this.theme.grid,
        paddingLeft: () => 3,
        paddingRight: () => 3,
        paddingTop: () => 1.5,
        paddingBottom: () => 1.5
      } as any,
      table: {
        headerRows: 1,
        widths: ['auto', '*', '*', '*', '*'],
        body,
        dontBreakRows: true
      }
    };
  }

  /** Summary line: TOTAL / PASS/OK / OTHERS */
  private totalsSummary(rows: NewMeterRow[]): Content {
    const total = rows.length;
    const passCount = rows.filter(r => this.isPass(r)).length;
    const otherCount = total - passCount;

    return {
      text: `TOTAL: ${total}   •   PASS/OK: ${passCount}   •   OTHERS: ${otherCount}`,
      alignment: 'right',
      margin: [18, 2, 18, 0],
      fontSize: 8.5,
      color: '#000'
    };
  }

  /** Signature block – used in footer (like other services) */
  private signBlock(meta: NewMeterMeta): Content {
    const line = {
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: 110, y2: 0, lineWidth: 0.7 }
      ],
      margin: [0, 4, 0, 2]
    };

    return {
      margin: [0, 0, 0, 2],
      columns: [
        // Tested By
        {
          width: '*',
          alignment: 'center' as const,
          stack: [
            { text: 'Tested by', bold: true, fontSize: 8 },
            line,
            {
              text: (meta.testing_user || '-').toUpperCase(),
              fontSize: 7.5,
              color: this.theme.textSubtle,
              margin: [0, 2, 0, 1]
            },
            { text: 'TESTING ASSISTANT', fontSize: 7, color: this.theme.textSubtle }
          ]
        },

        // Verified By
        {
          width: '*',
          alignment: 'center' as const,
          stack: [
            { text: 'Verified by', bold: true, fontSize: 8 },
            line,
            {
              text: '',
              fontSize: 7.5,
              color: this.theme.textSubtle,
              margin: [0, 2, 0, 1]
            },
            { text: 'JUNIOR ENGINEER', fontSize: 7, color: this.theme.textSubtle }
          ]
        },

        // Approved By
        {
          width: '*',
          alignment: 'center' as const,
          stack: [
            { text: 'Approved by', bold: true, fontSize: 8 },
            line,
            {
              text: (meta.approving_user || '-').toUpperCase(),
              fontSize: 7.5,
              color: this.theme.textSubtle,
              margin: [0, 2, 0, 1]
            },
            { text: 'ASSISTANT ENGINEER', fontSize: 7, color: this.theme.textSubtle }
          ]
        }
      ]
    } as any;
  }

  // ---- main doc builder ----
  private buildDoc(
    rows: NewMeterRow[],
    meta: NewMeterMeta,
    imagesDict: Record<string, string> = {}
  ): TDocumentDefinitions {
    const labName = meta.lab?.lab_name || '';
    const labAddress = meta.lab?.address_line || '';
    const labEmail = (meta.lab?.email || '').trim();
    const labPhone = (meta.lab?.phone || '').trim();

    const contentWidth = 595.28 - 18 - 18; // A4 width minus horizontal header margins

    return {
      pageSize: 'A4',
      // match other services: more bottom space for footer sig block
      pageMargins: [18, 92, 18, 80],
      defaultStyle: { fontSize: 8, lineHeight: 1.3, color: '#111' },
      info: { title: `NEW_METER_${meta.date}` },
      images: imagesDict,
      styles: {
        sectionTitle: {
          bold: true,
          fontSize: 11,
          color: '#070707ff',
          alignment: 'center',
          margin: [0, 0, 0, 8]
        }
      },
      header: this.headerBar({
        orgLine: 'MADHYA PRADESH PASCHIM KHETRA VIDYUT VITARAN COMPANY LIMITED',
        labName,
        labAddress,
        labEmail,
        labPhone,
        contentWidth,
        hasLeft: !!imagesDict['leftLogo'],
        hasRight: !!imagesDict['rightLogo']
      }) as any,

      // Footer: Signature block + page no + company name (same pattern as others)
      footer: (currentPage: number, pageCount: number) => {
        return {
          margin: [18, 4, 18, 10],
          stack: [
            this.signBlock(meta),
            {
              margin: [0, 6, 0, 0],
              columns: [
                {
                  text: `Page ${currentPage} of ${pageCount}`,
                  alignment: 'left',
                  color: this.theme.textSubtle,
                  fontSize: 8
                },
                {
                  text: 'MPPKVVCL INDORE',
                  alignment: 'right',
                  color: this.theme.textSubtle,
                  fontSize: 8
                }
              ]
            }
          ]
        } as any;
      },

      content: [
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: contentWidth, y2: 0, lineWidth: 1 }],
          margin: [0, 0, 0, 8]
        },
        {
          text: 'NEW METER TEST REPORT',
          bold: true,
          fontSize: 14,
          alignment: 'center' as const
        },
        this.metaTable(meta),
        this.detailsTable(rows),
        this.totalsSummary(rows)
      ]
    };
  }

  // ---- public API ----
  async download(rows: NewMeterRow[], meta: NewMeterMeta, logos?: PdfLogos): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const imagesDict: Record<string, string> = {};
    try {
      if (logos?.leftLogoUrl) {
        imagesDict['leftLogo'] = await this.urlToDataUrl(logos.leftLogoUrl);
      }
      if (logos?.rightLogoUrl) {
        imagesDict['rightLogo'] = await this.urlToDataUrl(logos.rightLogoUrl);
      } else if (imagesDict['leftLogo']) {
        imagesDict['rightLogo'] = imagesDict['leftLogo'];
      }
    } catch (e) {
      delete imagesDict['leftLogo'];
      delete imagesDict['rightLogo'];
      console.warn('Logo load failed:', e);
    }

    const doc = this.buildDoc(rows, meta, imagesDict);
    const fname = `NEW_METER_${meta.date}.pdf`;

    return new Promise<void>((resolve) => {
      try {
        pdfMake.createPdf(doc).download(fname, () => resolve());
      } catch {
        resolve();
      }
    });
  }

  async open(rows: NewMeterRow[], meta: NewMeterMeta, logos?: PdfLogos): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const imagesDict: Record<string, string> = {};
    try {
      if (logos?.leftLogoUrl) {
        imagesDict['leftLogo'] = await this.urlToDataUrl(logos.leftLogoUrl);
      }
      if (logos?.rightLogoUrl) {
        imagesDict['rightLogo'] = await this.urlToDataUrl(logos.rightLogoUrl);
      } else if (imagesDict['leftLogo']) {
        imagesDict['rightLogo'] = imagesDict['leftLogo'];
      }
    } catch {
      // ignore logo errors in preview
    }

    const doc = this.buildDoc(rows, meta, imagesDict);
    pdfMake.createPdf(doc).open();
  }
}
