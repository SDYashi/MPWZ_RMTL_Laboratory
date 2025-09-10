import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

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
  title?: string;                 // default: 'RMTL Inward Receipt'
  orgName?: string;               // default: 'M.P. Paschim Kshetra Vidyut Vitran Co. Ltd'
  lab_id?: number;
  office_type?: string | null;
  location_code?: string | null;
  location_name?: string | null;
  date_of_entry?: string;         // yyyy-MM-dd
  device_type?: 'METER' | 'CT';
  total?: number;
  items: InwardReceiptItem[];
  serials_csv?: string;           // convenience: comma list of serials
  logoDataUrl?: string; 
  inward_no?: string;             // optional base64 logo
}

type TDocumentDefinition = any;

@Injectable({ providedIn: 'root' })
export class InwardReceiptPdfService {

  download(data: InwardReceiptData, p0: { fileName: string; }): void {
    const doc = this.buildDoc(data);
    const tag = `${data.device_type || 'DEVICE'}_${data.date_of_entry || ''}`;
    pdfMake.createPdf(doc).download(`Inward_Receipt_${tag}.pdf`);
  }

  open(data: InwardReceiptData): void {
    const doc = this.buildDoc(data);
    pdfMake.createPdf(doc).open();
  }

  getDocDefinition(data: InwardReceiptData): TDocumentDefinition {
    return this.buildDoc(data);
  }

  // ---------------- Internals ----------------

  private buildDoc(d: InwardReceiptData): TDocumentDefinition {
    const title = d.title || 'RMTL Inward Receipt';
    const org = d.orgName || 'M.P. Paschim Kshetra Vidyut Vitran Co. Ltd';
    const count = d.total ?? d.items.length;
    const createdAtStr = new Date().toLocaleString();

    const headerLeft: any[] = [];
    if (d.logoDataUrl) {
      headerLeft.push({ image: d.logoDataUrl, width: 60, height: 60, margin: [0, 0, 0, 6] });
    }
    headerLeft.push({ text: title, style: 'h1' });
    headerLeft.push({ text: org, style: 'sub' });

    const summary = {
      table: {
        widths: ['*', '*', '*'],
        body: [
          [
            { text: `Lab ID: ${d.lab_id ?? '-'}` },
            { text: `Office Type: ${d.office_type ?? '-'}` },
            { text: `Date of Entry: ${d.date_of_entry ?? '-'}` }
          ],
          [
            { text: `Location Code: ${d.location_code ?? '-'}` },
            { text: `Location Name: ${d.location_name ?? '-'}` },
            { text: `Device Type: ${d.device_type ?? '-'}` }
          ],
          [
            { text: `Total Items: ${count}` },
            { text: `Generated At: ${createdAtStr}` },
            { text: `Inward No: ${d.inward_no ?? '-'}` }
          ]
        ]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 10]
    };

    const serialsCsv = (d.serials_csv && d.serials_csv.trim())
      ? d.serials_csv
      : d.items.map(i => i.serial_number).join(', ');

    const content: any[] = [
      {
        columns: [
          { stack: headerLeft },
          { alignment: 'right', stack: [{ text: `Created: ${createdAtStr}`, style: 'rightLbl' }] }
        ]
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 525, y2: 0, lineWidth: 1 }], margin: [0, 10, 0, 10] },
      summary,
      { text: `Serial Numbers (${count})`, style: 'h2', margin: [0, 6, 0, 6] },
      { text: serialsCsv, fontSize: 10, margin: [0, 0, 0, 10] },
    ];

    // Devices table (auto-paginates)
    // content.push(
    //   { text: 'Items', style: 'h2', margin: [0, 12, 0, 6] },
    //   this.buildItemsTable(d.device_type || 'METER', d.items)
    // );

    // Signatures
    content.push({
      columns: [
        { text: '\n\n____________________________\nSubmitted By (Signature & Name)', alignment: 'left' },
        { text: '\n\n____________________________\nReceived By (Signature & Name)', alignment: 'right' }
      ],
      margin: [0, 20, 0, 0]
    });

    return {
      pageSize: 'A4',
      pageMargins: [36, 48, 36, 48],
      content,
      styles: {
        h1: { fontSize: 18, bold: true },
        h2: { fontSize: 14, bold: true },
        sub: { fontSize: 10, color: '#666' },
        rightLbl: { fontSize: 10 },
        th: { bold: true }
      }
    };
  }

  private buildItemsTable(deviceType: 'METER' | 'CT', items: InwardReceiptItem[]) {
    const meterHeader = [
      { text: 'S.No', style: 'th' }, { text: 'Serial No', style: 'th' }, { text: 'Make', style: 'th' },
      { text: 'Capacity', style: 'th' }, { text: 'Phase', style: 'th' }, { text: 'Conn', style: 'th' },
      { text: 'Category', style: 'th' }, { text: 'Type', style: 'th' },
      { text: 'Voltage', style: 'th' }, { text: 'Current', style: 'th' },
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
      table: {
        headerRows: 1,
        widths: isCT
          ? [30, '*', '*', '*', '*', '*', '*', '*']
          : [30, '*', '*', '*', '*', '*', '*', '*', '*', '*', '*', '*'],
        body
      },
      layout: 'lightHorizontalLines',
      fontSize: 9
    };
  }
}
