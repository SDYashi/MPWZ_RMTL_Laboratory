// src/app/shared/oldagainstmeter-report-pdf.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

export interface OldLabInfo {
  lab_name?: string;
  address_line?: string;
  email?: string;
  phone?: string;
}

export interface OldAgainstRow {
  serial: string;
  make?: string;
  capacity?: string;
  remark?: string;
  test_result?: string;
}

export interface OldAgainstMeta {
  zone?: string;
  phase?: string;
  date: string;               // YYYY-MM-DD

  testMethod?: string;
  testStatus?: string;

  testing_bench?: string;
  testing_user?: string;
  approving_user?: string;

  lab?: OldLabInfo;

  leftLogoUrl?: string;
  rightLogoUrl?: string;
}

export interface PdfLogos {
  leftLogoUrl?: string;
  rightLogoUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class OldAgainstMeterReportPdfService {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  private logoCache = new Map<string, string>();

  // ---------- small helpers ----------
  private theme = {
    grid: '#e6e9ef',
    subtleText: '#5d6b7a',
    labelBg: '#f8f9fc'
  };

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

  private isOk(row: OldAgainstRow): boolean {
    const t = `${row.test_result ?? ''} ${row.remark ?? ''}`.toLowerCase();
    return /\bok\b|\bpass\b/.test(t);
  }

  private resultText(row: OldAgainstRow): string {
    const t = (row.test_result || '').trim();
    const m = (row.remark || '').trim();
    if (t && m && t.toUpperCase() !== 'OK') return `${t} — ${m}`;
    if (t && (!m || t.toUpperCase() === 'OK')) return t;
    return m || '-';
  }

  // ---------- HEADER BAR (same vibe as CT service) ----------
  private headerBar(meta: {
    companyLine: string;
    labName: string;
    addressLine?: string;
    email?: string;
    phone?: string;
    images: Record<string, string>;
  }): Content {
    const contactBits: string[] = [];
    if (meta.email) contactBits.push(`Email: ${meta.email}`);
    if (meta.phone) contactBits.push(`Phone: ${meta.phone}`);
    const contactLine = contactBits.join('    ');

    return {
      margin: [18, 10, 18, 8],
      columnGap: 8,
      stack: [
        {
          columns: [
            meta.images['leftLogo']
              ? { image: 'leftLogo', width: 32, alignment: 'left' }
              : { width: 32, text: '' },

            {
              width: '*',
              stack: [
                {
                  text: meta.companyLine,
                  alignment: 'center',
                  bold: true,
                  fontSize: 12
                },
                {
                  text: meta.labName || '-',
                  alignment: 'center',
                  bold: true,
                  fontSize: 11,
                  margin: [0, 2, 0, 0],
                  color: '#333'
                },
                ...(meta.addressLine
                  ? [{
                      text: meta.addressLine,
                      alignment: 'center',
                      fontSize: 9,
                      margin: [0, 2, 0, 0],
                      color: '#555'
                    }]
                  : []),
                ...(contactLine
                  ? [{
                      text: contactLine,
                      alignment: 'center',
                      fontSize: 9,
                      margin: [0, 2, 0, 0],
                      color: '#555'
                    }]
                  : [])
              ]
            },

            meta.images['rightLogo']
              ? { image: 'rightLogo', width: 32, alignment: 'right' }
              : { width: 32, text: '' }
          ]
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 0,
              x2: 559, // ~A4 inner width after margins
              y2: 0,
              lineWidth: 1
            }
          ],
          margin: [0, 6, 0, 0]
        }
      ]
    } as Content;
  }

  // ---------- META + TEST DETAILS TABLE (merged, like CT metaAndInfoTable) ----------
  private metaDetailsTable(meta: OldAgainstMeta): Content {
    const K = (t: string) => ({
      text: t,
      bold: true,
      fillColor: this.theme.labelBg
    });

    return {
      margin: [28, 0, 28, 10],
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => this.theme.grid,
        vLineColor: () => this.theme.grid,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 3,
        paddingBottom: () => 3
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

  // ---------- DEVICE TABLE ----------
  private detailsTable(rows: OldAgainstRow[]): Content {
    const tableBody: TableCell[][] = [[
      { text: '#', bold: true, fillColor: this.theme.labelBg, alignment: 'center' },
      { text: 'Meter Number', bold: true, fillColor: this.theme.labelBg },
      { text: 'Make', bold: true, fillColor: this.theme.labelBg },
      { text: 'Capacity', bold: true, fillColor: this.theme.labelBg },
      { text: 'Test Result / Remark', bold: true, fillColor: this.theme.labelBg }
    ]];

    rows.forEach((r, i) => {
      tableBody.push([
        { text: String(i + 1), alignment: 'center' },
        { text: r.serial || '-' },
        { text: r.make || '-' },
        { text: r.capacity || '-' },
        { text: this.resultText(r) }
      ]);
    });

    return {
      margin: [28, 0, 28, 6],
      layout: {
        fillColor: (rowIndex: number) =>
          rowIndex > 0 && rowIndex % 2 ? '#fafafa' : undefined,
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => this.theme.grid,
        vLineColor: () => this.theme.grid,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 3,
        paddingBottom: () => 3
      } as any,
      table: {
        headerRows: 1,
        widths: ['auto', '*', '*', 'auto', '*'],
        body: tableBody,
        dontBreakRows: true
      }
    };
  }

  // ---------- TOTAL SUMMARY ----------
  private totalsRow(rows: OldAgainstRow[]): Content {
    const total = rows.length;
    const okCount = rows.filter(r => this.isOk(r)).length;
    const defCount = total - okCount;

    return {
      margin: [28, 0, 28, 10],
      text: `TOTAL: ${total}    •    OK: ${okCount}    •    DEF: ${defCount}`,
      alignment: 'right',
      fontSize: 9,
      color: this.theme.subtleText
    };
  }

  // ---------- SIGNATURES ----------
  private signatureBlock(meta: OldAgainstMeta): Content {
    return {
      margin: [28, 0, 28, 0],
      columns: [
        {
          width: '*',
          alignment: 'center',
          stack: [
            { text: '\n\nTested by', bold: true },
            { text: '\n____________________________', alignment: 'center' },
            {
              text: (meta.testing_user || '-').toUpperCase(),
              fontSize: 8.5,
              color: this.theme.subtleText,
              alignment: 'center'
            },
            {
              text: 'TESTING ASSISTANT',
              fontSize: 8.5,
              color: this.theme.subtleText,
              alignment: 'center'
            }
          ]
        },
        {
          width: '*',
          alignment: 'center',
          stack: [
            { text: '\n\nVerified by', bold: true },
            { text: '\n____________________________', alignment: 'center' },
            {
              text: '-',
              fontSize: 8.5,
              color: this.theme.subtleText,
              alignment: 'center'
            },
            {
              text: 'JUNIOR ENGINEER',
              fontSize: 8.5,
              color: this.theme.subtleText,
              alignment: 'center'
            }
          ]
        },
        {
          width: '*',
          alignment: 'center',
          stack: [
            { text: '\n\nApproved by', bold: true },
            { text: '\n____________________________', alignment: 'center' },
            {
              text: (meta.approving_user || '-').toUpperCase(),
              fontSize: 8.5,
              color: this.theme.subtleText,
              alignment: 'center'
            },
            {
              text: 'ASSISTANT ENGINEER',
              fontSize: 8.5,
              color: this.theme.subtleText,
              alignment: 'center'
            }
          ]
        }
      ]
    };
  }

  // ---------- MAIN DOC BUILDER ----------
  private buildDoc(
    rows: OldAgainstRow[],
    metaInput: OldAgainstMeta,
    imagesDict: Record<string, string> = {}
  ): TDocumentDefinitions {
    const labName =
      metaInput.lab?.lab_name?.trim() ||'';

    const addr =
      metaInput.lab?.address_line?.trim() || '';

    const email = metaInput.lab?.email?.trim() || '';
    const phone = metaInput.lab?.phone?.trim() || '';

    const headerBlock = this.headerBar({
      companyLine:
        'MADHYA PRADESH PASCHIM KHETRA VIDYUT VITARAN COMPANY LIMITED',
      labName: labName,
      addressLine: addr,
      email,
      phone,
      images: imagesDict
    });

    return {
      pageSize: 'A4',
      pageMargins: [18, 92, 18, 28], // leave space for headerBar stack
      defaultStyle: { fontSize: 9, color: '#111', lineHeight: 1.1 },
      images: imagesDict,
      info: { title: `AGAINST_OLD_METER_${metaInput.date}` },
      styles: {
        sectionTitle: {
          bold: true,
          fontSize: 12,
          alignment: 'center',
          margin: [0, 0, 0, 10],
          color: '#0b2237'
        }
      },
      header: headerBlock as any,
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          {
            text: `Page ${currentPage} of ${pageCount}`,
            alignment: 'left',
            margin: [28, 0, 0, 0],
            fontSize: 8,
            color: this.theme.subtleText
          },
          {
            text: 'M.P.P.K.V.V. CO. LTD., INDORE',
            alignment: 'right',
            margin: [0, 0, 28, 0],
            fontSize: 8,
            color: this.theme.subtleText
          }
        ]
      }),
      content: [
        { text: 'AGAINST OLD METER TEST REPORT', style: 'sectionTitle' },

        // merged meta table
        this.metaDetailsTable(metaInput),

        // meters table
        this.detailsTable(rows),

        // totals
        this.totalsRow(rows),

        // signatures
        this.signatureBlock(metaInput)
      ]
    };
  }

  // ---------- PUBLIC METHODS ----------
  async download(rows: OldAgainstRow[], meta: OldAgainstMeta, logos?: PdfLogos): Promise<void> {
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
      // graceful fallback to no logos
      delete imagesDict['leftLogo'];
      delete imagesDict['rightLogo'];
      console.warn('Logo load failed:', e);
    }

    const doc = this.buildDoc(rows, meta, imagesDict);
    const fname = `AGAINST_OLD_METER_${meta.date}.pdf`;

    return new Promise<void>((resolve) => {
      try {
        pdfMake.createPdf(doc).download(fname);
      } finally {
        resolve();
      }
    });
  }

  async open(rows: OldAgainstRow[], meta: OldAgainstMeta, logos?: PdfLogos): Promise<void> {
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
    } catch {}
    const doc = this.buildDoc(rows, meta, imagesDict);
    pdfMake.createPdf(doc).open();
  }
}
