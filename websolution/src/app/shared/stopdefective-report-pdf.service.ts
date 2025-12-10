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
  date: string; // YYYY-MM-DD
  testMethod?: string;
  testStatus?: string;

  testing_bench?: string;
  testing_user?: string;
  approving_user?: string;

  lab?: StopDefLabInfo;
}
export interface PdfLogos {
  leftLogoUrl?: string;
  rightLogoUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class StopDefectiveReportPdfService {
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

  // ---- PDF blocks ----

  /** Top banner with logos, company line, lab line, contacts, and a bottom rule */
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
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: meta.contentWidth,
              y2: 0,
              lineWidth: 1
            }
          ],
          margin: [0, 6, 0, 0]
        }
      ]
    } as any;
  }

  /** Test Meta (Zone, Phase, etc.) — compact grid */
  private metaTable(meta: StopDefMeta): Content {
    const K = (t: string) => ({
      text: t,
      bold: true,
      fillColor: this.theme.labelBg
    });

    return {
      margin: [28, 0, 28, 10],
      layout: {
        hLineWidth: () => 1.2,
        vLineWidth: () => 1.2,
        hLineColor: () => this.theme.grid,
        vLineColor: () => this.theme.grid,
        // ↓↓↓ reduced padding to fit more content per page
        paddingLeft: () => 2,
        paddingRight: () => 2,
        paddingTop: () => 1,
        paddingBottom: () => 1,
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

  /** Main STOP/DEFECTIVE table of meters */
  private detailsTable(rows: StopDefRow[]): Content {
    const body: TableCell[][] = [[
      { text: '#', bold: true, fillColor: this.theme.labelBg, alignment: 'center' as const },
      { text: 'METER NUMBER', bold: true, fillColor: this.theme.labelBg },
      { text: 'MAKE', bold: true, fillColor: this.theme.labelBg },
      { text: 'CAPACITY', bold: true, fillColor: this.theme.labelBg },
      { text: 'TEST RESULT / REMARK', bold: true, fillColor: this.theme.labelBg }
    ]];

    rows.forEach((r, i) => {
      body.push([
        { text: String(i + 1), alignment: 'center' as const },
        { text: r.serial || '-' },
        { text: r.make || '-' },
        { text: r.capacity || '-' },
        { text: this.resultText(r) }
      ]);
    });

    return {
      margin: [28, 0, 28, 8],
      layout: {
        fillColor: (rowIdx: number) =>
          rowIdx > 0 && rowIdx % 2 === 1 ? '#fafafa' : undefined,
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.8,
        hLineColor: () => this.theme.grid,
        vLineColor: () => this.theme.grid,
        // ↓↓↓ reduced padding to fit more rows per page
        paddingLeft: () => 2,
        paddingRight: () => 2,
        paddingTop: () => 1,
        paddingBottom: () => 1,
      } as any,
      table: {
        headerRows: 1,
        widths: ['auto', '*', '*', '*', '*'],
        body,
        dontBreakRows: true
      }
    };
  }

  /** Signatures block */
  private signBlock(meta: StopDefMeta): Content {
    const testingUser = (meta.testing_user || '-').toUpperCase();
    const approvingUser = (meta.approving_user || '-').toUpperCase();

    return {
      margin: [28, 10, 28, 0],
      columns: [
        {
          width: '*',
          alignment: 'center' as const,
          stack: [
            { text: '\n\nTested by', bold: true, alignment: 'center' as const },
            {
              text: '\n-----------------------------',
              fontSize: 8.5,
              color: this.theme.textSubtle,
              alignment: 'center' as const
            },
            {
              text: '\n\n' + testingUser,
              fontSize: 8.5,
              color: this.theme.textSubtle,
              alignment: 'center' as const
            },
            {
              text: 'TESTING ASSISTANT',
              fontSize: 8.5,
              color: this.theme.textSubtle,
              alignment: 'center' as const
            }
          ]
        },
        {
          width: '*',
          alignment: 'center' as const,
          stack: [
            { text: '\n\nVerified by', bold: true, alignment: 'center' as const },
            {
              text: '\n-----------------------------',
              fontSize: 8.5,
              color: this.theme.textSubtle,
              alignment: 'center' as const
            },
             {
              text: '-',
              fontSize: 8.5,
              color: this.theme.textSubtle,
              alignment: 'center' as const
            },
            {
              text: 'JUNIOR ENGINEER',
              fontSize: 8.5,
              color: this.theme.textSubtle,
              alignment: 'center' as const
            }
          ]
        },
        {
          width: '*',
          alignment: 'center' as const,
          stack: [
            { text: '\n\nApproved by', bold: true, alignment: 'center' as const },
            {
              text: '\n-----------------------------',
              fontSize: 8.5,
              color: this.theme.textSubtle,
              alignment: 'center' as const
            },
            {
              text: '\n\n' + approvingUser,
              fontSize: 8.5,
              color: this.theme.textSubtle,
              alignment: 'center' as const
            },
            {
              text: 'ASSISTANT ENGINEER',
              fontSize: 8.5,
              color: this.theme.textSubtle,
              alignment: 'center' as const
            }
          ]
        }
      ]
    } as any;
  }

  // ---- main doc builder ----
  private buildDoc(
    rows: StopDefRow[],
    meta: StopDefMeta,
    imagesDict: Record<string, string> = {}
  ): TDocumentDefinitions {
    const total = rows.length;
    const okCount = rows.filter(r => this.isOk(r)).length;
    const defCount = total - okCount;

    const labName =
      meta.lab?.lab_name || '';
    const labAddress =
      meta.lab?.address_line || '';
    const labEmail =
      (meta.lab?.email || '').trim();
    const labPhone =
      (meta.lab?.phone || '').trim();

    const contentWidth = 595.28 - 18 - 18; // A4 width minus horizontal header margins

    return {
      pageSize: 'A4',
      pageMargins: [18, 92, 18, 34],
      defaultStyle: { fontSize: 9, lineHeight: 1.5, color: '#111' },
      info: { title: `STOP_DEFECTIVE_${meta.date}` },
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

      // ↓↓↓ Footer now shows "Page X of Y" only if more than 1 page
      footer: (currentPage: number, pageCount: number) => {
        if (pageCount <= 1) {
          return {
            columns: [
              {
                text: 'M.P.P.K.V.V. CO. LTD., INDORE',
                alignment: 'right',
                margin: [0, 0, 18, 0],
                color: this.theme.textSubtle
              }
            ],
            fontSize: 8
          };
        }
        return {
          columns: [
            {
              text: `Page ${currentPage} of ${pageCount}`,
              alignment: 'left',
              margin: [18, 0, 0, 0],
              color: this.theme.textSubtle
            },
            {
              text: 'M.P.P.K.V.V. CO. LTD., INDORE',
              alignment: 'right',
              margin: [0, 0, 18, 0],
              color: this.theme.textSubtle
            }
          ],
          fontSize: 8
        };
      },

      content: [
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: contentWidth, y2: 0, lineWidth: 1 }],
          margin: [0, 0, 0, 8]
        },
        { text: 'STOP / DEFECTIVE TEST REPORT', bold: true, fontSize: 14, alignment: 'center' as const },
        this.metaTable(meta),

        this.detailsTable(rows),

        {
          text: `TOTAL: ${total}   •   OK: ${okCount}   •   DEF: ${defCount}`,
          alignment: 'right',
          margin: [18, 2, 18, 0],
          fontSize: 9,
          color: '#000'
        },

        this.signBlock(meta)
      ]
    };
  }

  // ---- public API ----
  async download(rows: StopDefRow[], meta: StopDefMeta, logos?: PdfLogos): Promise<void> {
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
    const fname = `STOP_DEFECTIVE_${meta.date}.pdf`;

    return new Promise<void>((resolve) => {
      try {
        pdfMake.createPdf(doc).download(fname, () => resolve());
      } catch {
        resolve();
      }
    });
  }

  async open(rows: StopDefRow[], meta: StopDefMeta, logos?: PdfLogos): Promise<void> {
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
      // ignore logo fetch errors in preview
    }

    const doc = this.buildDoc(rows, meta, imagesDict);
    pdfMake.createPdf(doc).open();
  }
}
