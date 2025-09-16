import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

type TDocumentDefinition = any;

export interface InwardReceiptItem {
  sl?: number;
  serial_number: string;
  make?: string;
  capacity?: string;
  phase?: string;
  connection_type?: string;
  meter_category?: string;
  meter_type?: string;
  voltage_rating?: string;
  current_rating?: string;
  purpose?: string;
  remark?: string;
  inward_no?: string;
  // CT extras
  ct_class?: string | null;
  ct_ratio?: string | null;
}

export interface InwardReceiptData {
  lab_id?: number;
  office_type?: string | null;
  location_code?: string | null;
  location_name?: string | null;
  date_of_entry?: string;          // yyyy-MM-dd
  device_type?: 'METER' | 'CT';
  total?: number;
  items: InwardReceiptItem[];
  serials_csv?: string;            // optional: comma list of serials
  inward_no?: string | number;

  // Optional lab info passthrough
  lab_name?: string | null;
  lab_address?: string | null;
  lab_email?: string | null;
  lab_phone?: string | null;

  // Legacy single logo (fallback)
  logoDataUrl?: string;
}

export interface InwardReceiptHeaderInfo {
  orgLine?: string;
  labLine?: string;
  addressLine?: string;
  email?: string;
  phone?: string;
  leftLogoUrl?: string;   // dataURL or absolute/relative URL
  rightLogoUrl?: string;  // dataURL or absolute/relative URL
  logoWidth?: number;     // default 36
  logoHeight?: number;    // default 36
}

export interface InwardReceiptPdfOptions {
  columns?: number;           // force serial columns; auto if omitted
  includeNotes?: boolean;     // default true
  notesText?: string;         // custom notes
  showItemsTable?: boolean;   // default auto (true if items exist)
  fileName?: string;          // custom output filename
  header?: InwardReceiptHeaderInfo;
}

@Injectable({ providedIn: 'root' })
export class InwardReceiptPdfService {
  // ---------- Public API ----------
  async download(data: InwardReceiptData, opts: InwardReceiptPdfOptions = {}): Promise<void> {
    const doc = await this.buildDocWithLogos(data, opts);
    const fname = this.fileName(data, opts);
    await new Promise<void>(res => pdfMake.createPdf(doc).download(fname, () => res()));
  }

  async open(data: InwardReceiptData, opts: InwardReceiptPdfOptions = {}): Promise<void> {
    const doc = await this.buildDocWithLogos(data, opts);
    pdfMake.createPdf(doc).open();
  }

  async print(data: InwardReceiptData, opts: InwardReceiptPdfOptions = {}): Promise<void> {
    const doc = await this.buildDocWithLogos(data, opts);
    pdfMake.createPdf(doc).print();
  }

  async getDocDefinition(data: InwardReceiptData, opts: InwardReceiptPdfOptions = {}): Promise<TDocumentDefinition> {
    return this.buildDocWithLogos(data, opts);
  }

  // ---------- Build with logo loading ----------
  private async buildDocWithLogos(d: InwardReceiptData, opts: InwardReceiptPdfOptions): Promise<TDocumentDefinition> {
    const images: Record<string, string> = {};
    const h = opts.header || {};

    const isData = (u?: string) => !!u && /^data:image\/[a-zA-Z]+;base64,/.test(u);
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
    const safeLoad = async (key: 'leftLogo' | 'rightLogo', url?: string) => {
      if (!url) return;
      try { images[key] = isData(url) ? url : await toDataURL(url); } catch { /* ignore */ }
    };

    await Promise.all([
      safeLoad('leftLogo', h.leftLogoUrl || d.logoDataUrl),
      safeLoad('rightLogo', h.rightLogoUrl || d.logoDataUrl),
    ]);
    if (!images['leftLogo'] && images['rightLogo']) images['leftLogo'] = images['rightLogo'];
    if (!images['rightLogo'] && images['leftLogo']) images['rightLogo'] = images['leftLogo'];

    return this.buildDoc(d, opts, images);
  }

  // ---------- Core doc ----------
  private buildDoc(d: InwardReceiptData, opts: InwardReceiptPdfOptions, images: Record<string, string>): TDocumentDefinition {
    const {
      includeNotes = true,
      notesText = '— Verify items against the list on receipt.\n— Report discrepancies immediately.',
      showItemsTable,
      columns,
      header
    } = opts;

    const metaForHeader = {
      orgLine: (header?.orgLine || 'MADHYA PRADESH PASCHIM KHETRA VIDYUT VITARAN COMPANY LIMITED').toUpperCase(),
      labLine: (header?.labLine || d.lab_name || 'REGIONAL METERING TESTING LABORATORY INDORE').toUpperCase(),
      addressLine: header?.addressLine || d.lab_address || 'MPPKVVCL Near Conference Hall, Polo Ground, Indore (MP) 452003',
      email: header?.email || d.lab_email || '-',
      phone: header?.phone || d.lab_phone || '-',
      logoWidth: header?.logoWidth ?? 36,
      logoHeight: header?.logoHeight ?? 36,
    };

    const createdAtStr = new Date().toLocaleString();
    const total = d.total ?? d.items?.length ?? 0;
    const serials = this.serialList(d);
    const bestColCount = columns ?? this.pickSerialColumns(serials.length);

    const content: any[] = [
      this.headerBar(metaForHeader, images),
      { canvas: [{ type: 'line', x1: 28, y1: 0, x2: 567 - 28, y2: 0, lineWidth: 1 }], margin: [0, 6, 0, 6] },
      { text: 'INWARD RECEIPT', alignment: 'center', fontSize: 12, bold: true, margin: [0, 0, 0, 6] },
      this.metaBand({
        lab_id: d.lab_id ?? '-',
        office_type: d.office_type ?? '-',
        date_of_entry: d.date_of_entry ?? '-',
        location_code: d.location_code ?? '-',
        location_name: d.location_name ?? '-',
        device_type: d.device_type ?? '-',
        total,
        created_at: createdAtStr,
        inward_no: d.inward_no ?? '-',
      }),
      { text: `Serial Numbers (${serials.length})`, style: 'h3', margin: [28, 4, 28, 4] },
      this.serialColumns(serials, bestColCount),
    ];

    // const shouldShowItems = typeof showItemsTable === 'boolean' ? showItemsTable : (d.items?.length ?? 0) > 0;
    // if (shouldShowItems) {
    //   content.push({ text: 'Items', style: 'h3', margin: [28, 10, 28, 4] });
    //   content.push(this.buildItemsTable(d.device_type || 'METER', d.items || []));
    // }

    if (includeNotes) {
      content.push({ text: 'Notes:', style: 'h3', margin: [28, 10, 28, 2] });
      content.push({ text: notesText, margin: [28, 0, 28, 6] });
    }

    content.push(this.signBlock());

    return {
      pageSize: 'A4',
      pageMargins: [0, 0, 0, 28],
      defaultStyle: { fontSize: 9, lineHeight: 1.05 },
      styles: {
        h3: { fontSize: 11, bold: true },
        th: { bold: true, fontSize: 9 },
        footRole: { fontSize: 9, bold: true },
        tableTight: { fontSize: 9 }
      },
      images,
      content,
      footer: (current: number, totalPages: number) => ({
        columns: [
          { text: `Page ${current} of ${totalPages}`, alignment: 'left', margin: [28, 0, 0, 0] },
          { text: 'M.P.P.K.V.V.CO. LTD., INDORE', alignment: 'right', margin: [0, 0, 28, 0] }
        ],
        fontSize: 8
      }),
      info: { title: this.fileName(d, opts).replace(/\.pdf$/i, '') }
    };
  }

  // ---------- Sections ----------
  private headerBar(meta: {
    orgLine: string; labLine: string; addressLine: string; email: string; phone: string;
    logoWidth: number; logoHeight: number;
  }, images: Record<string, string>) {
     
    return {
      margin: [28, 8, 28, 6],
      columns: [
        images['leftLogo'] ? { image: 'leftLogo', width: meta.logoWidth, height: meta.logoHeight } : { width: meta.logoWidth, text: '' },
        {
          width: '*',
          stack: [
            { text: meta.orgLine, alignment: 'center', bold: true, fontSize: 12 },
            { text: meta.labLine, alignment: 'center', bold: true, fontSize: 11, margin: [0, 2, 0, 0] },
            { text: meta.addressLine, alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0] },
            { text: `Email: ${meta.email} • Phone: ${meta.phone}`, alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0] }
          ]
        },
        images['rightLogo'] ? { image: 'rightLogo', width: meta.logoWidth, height: meta.logoHeight } : { width: meta.logoWidth, text: '' }
      ]
    };
  }

  private metaBand(g: any) {
    const lbl = { bold: true, fillColor: '#f5f5f5' };
    return {
      layout: 'noBorders',
      margin: [28, 0, 28, 8],
      table: {
        widths: ['auto','*','auto','*'],
        body: [
          [{ text: 'Lab ID', ...lbl }, { text: g.lab_id }, { text: 'Office Type', ...lbl }, { text: g.office_type }],
          [{ text: 'Date of Entry', ...lbl }, { text: g.date_of_entry }, { text: 'Device Type', ...lbl }, { text: g.device_type }],
          [{ text: 'Location Code', ...lbl }, { text: g.location_code }, { text: 'Location Name', ...lbl }, { text: g.location_name }],
          [{ text: 'Total Items', ...lbl }, { text: g.total.toString() }, { text: 'Inward No', ...lbl }, { text: g.inward_no }],
          [{ text: 'Generated At', ...lbl }, { text: g.created_at }, { text: '', ...lbl }, { text: '' }],
        ]
      }
    };
  }

  private serialColumns(serials: string[], colCount: number) {
    if (!serials?.length) return { text: '-', margin: [28, 0, 28, 0] };

    const perCol = Math.ceil(serials.length / colCount);
    const cols = Array.from({ length: colCount }, (_, i) =>
      serials.slice(i * perCol, (i + 1) * perCol).join(', ')
    );

    return {
      columns: cols.map(txt => ({
        text: txt,
        fontSize: 10,
        lineHeight: 1.2,
        margin: [28, 0, 10, 0]
      })),
      columnGap: 10
    };
  }

  private buildItemsTable(deviceType: 'METER' | 'CT', items: InwardReceiptItem[]) {
    const meterHeader = [
      { text: 'S.No', style: 'th' }, { text: 'Serial No', style: 'th' }, { text: 'Make', style: 'th' },
      { text: 'Capacity', style: 'th' }, { text: 'Phase', style: 'th' }, { text: 'Conn', style: 'th' },
      { text: 'Category', style: 'th' }, { text: 'Type', style: 'th' },
      { text: 'Voltage', style: 'th' }, { text: 'ImpKWH', style: 'th' },
      { text: 'Purpose', style: 'th' }, { text: 'Remark', style: 'th' }
    ];

    const ctHeader = [
      { text: 'S.No', style: 'th' }, { text: 'Serial No', style: 'th' }, { text: 'Make', style: 'th' },
      { text: 'Conn', style: 'th' }, { text: 'CT Class', style: 'th' }, { text: 'CT Ratio', style: 'th' },
      { text: 'Purpose', style: 'th' }, { text: 'Remark', style: 'th' }
    ];

    const isCT = deviceType === 'CT';
    const header = isCT ? ctHeader : meterHeader;

    const body: any[] = [header];
    items.forEach((r, idx) => {
      body.push(isCT
        ? [
            idx + 1,
            r.serial_number || '-',
            r.make || '-',
            r.connection_type || '-',
            r.ct_class || '-',
            r.ct_ratio || '-',
            r.purpose || '-',
            r.remark || '-'
          ]
        : [
            idx + 1,
            r.serial_number || '-',
            r.make || '-',
            r.capacity || '-',
            r.phase || '-',
            r.connection_type || '-',
            r.meter_category || '-',
            r.meter_type || '-',
            r.voltage_rating || '-',
            r.current_rating || '-',
            r.purpose || '-',
            r.remark || '-'
          ]);
    });

    return {
      style: 'tableTight',
      layout: 'lightHorizontalLines',
      table: {
        headerRows: 1,
        widths: isCT
          ? [30, '*', '*', '*', '*', '*', '*', '*']
          : [30, '*', '*', '*', '*', '*', '*', '*', '*', '*', '*', '*'],
        body
      }
    };
  }

  private signBlock() {
    return {
      columns: [
        { width: '*', alignment: 'center', stack: [{ text: 'Submitted By', style: 'footRole' }, { text: '\n____________________________', alignment: 'center' }] },
        { width: '*', alignment: 'center', stack: [{ text: 'Received By', style: 'footRole' }, { text: '\n____________________________', alignment: 'center' }] },
        // { width: '*', alignment: 'center', stack: [{ text: 'Lab Authority', style: 'footRole' }, { text: '\n____________________________', alignment: 'center' }] }
      ],
      margin: [28, 12, 28, 0]
    };
  }

  // ---------- Helpers ----------
  private serialList(d: InwardReceiptData): string[] {
    if (d.serials_csv && d.serials_csv.trim()) {
      return d.serials_csv.split(',').map(s => s.trim()).filter(Boolean);
    }
    return (d.items || []).map(i => i.serial_number).filter(Boolean);
  }

  private pickSerialColumns(count: number): number {
    if (count >= 120) return 4;
    if (count >= 50) return 3;
    return 2;
  }

  private fileName(d: InwardReceiptData, opts: InwardReceiptPdfOptions): string {
    if (opts.fileName) return opts.fileName.endsWith('.pdf') ? opts.fileName : `${opts.fileName}.pdf`;
    const tagA = (d.device_type || 'DEVICE');
    const tagB = d.inward_no ? `_${d.inward_no}` : (d.date_of_entry ? `_${d.date_of_entry}` : '');
    return `Inward_Receipt_${tagA}${tagB}.pdf`;
  }
}
