import { Injectable } from '@angular/core';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfTemplate } from '../services/pdf.service';
import { baseDoc, header, footer } from '../services/pdf.shared';

export interface GatepassPayload {
  gatepass_no: string;
  date: string;                     // ISO or display string
  from_office: string;              // e.g., RMTL Indore
  to_office: string;                // e.g., Zone/Store/Consumer
  mode_of_dispatch?: string;        // Hand/Vehicle/Courier
  vehicle_no?: string;
  reference?: string;               // inward_no / MR no / remark
  contact?: { name?: string; mobile?: string };

  items: Array<{
    sr?: number;
    device_type: string;            // METER / CT / VT / etc.
    serial_no: string;
    make?: string;
    spec?: string;                  // capacity/ratio/etc.
    qty: number;                    // usually 1
    remark?: string;
  }>;

  issued_by: { name: string; designation?: string };
  received_by?: { name?: string; designation?: string };
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class GatepassTemplate implements PdfTemplate<GatepassPayload> {
  kind: 'gatepass' = 'gatepass';

  build(p: GatepassPayload): TDocumentDefinitions {
    const total = (p.items || []).reduce((s, r) => s + Number(r.qty || 0), 0);

    return {
      ...baseDoc,
      footer: footer(),
      info: { title: `Gatepass ${p.gatepass_no}` },
      content: [
        header('RMTL • GATEPASS'),
        {
          columns: [
            { text: `Gatepass No: ${p.gatepass_no}`, style: 'small' },
            { text: `Date: ${p.date}`, alignment: 'right', style: 'small' }
          ],
          margin: [0, 2, 0, 8]
        },

        {
          style: 'small',
          table: {
            widths: ['28%','*','28%','*'],
            body: [
              [{ text: 'From', bold: true }, p.from_office, { text: 'To', bold: true }, p.to_office],
              [{ text: 'Mode of Dispatch', bold: true }, p.mode_of_dispatch || '-', { text: 'Vehicle No.', bold: true }, p.vehicle_no || '-' ],
              [{ text: 'Reference', bold: true }, p.reference || '-', { text: 'Contact', bold: true }, `${p.contact?.name ?? ''} ${p.contact?.mobile ? '• '+p.contact.mobile : ''}` ],
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 10]
        },

        { text: 'Items', style: 'h2' },
        {
          table: {
            headerRows: 1,
            widths: ['auto','*','*','*','*','auto','*'],
            body: [
              [
                { text: 'Sr', bold: true },
                { text: 'Device Type', bold: true },
                { text: 'Serial No.', bold: true },
                { text: 'Make', bold: true },
                { text: 'Spec/Capacity', bold: true },
                { text: 'Qty', bold: true },
                { text: 'Remark', bold: true },
              ],
              ...(p.items || []).map((r, i) => [
                r.sr ?? i + 1,
                r.device_type,
                r.serial_no,
                r.make || '',
                r.spec || '',
                r.qty ?? 1,
                r.remark || ''
              ]),
              [
                { text: 'Total', colSpan: 5, alignment: 'right', bold: true }, {}, {}, {}, {},
                { text: String(total), bold: true }, ''
              ]
            ]
          },
          layout: 'lightHorizontalLines'
        },

        { text: 'Issued By', style: 'h2' },
        {
          table: {
            widths: ['50%','50%'],
            body: [
              [{ text: 'Name', bold: true }, p.issued_by.name],
              [{ text: 'Designation', bold: true }, p.issued_by.designation || '' ],
            ]
          },
          layout: 'lightHorizontalLines'
        },
      ]
    };
  }
}
export const gatepassStyles = {
  h2: { fontSize: 14, bold: true, margin: [0, 8, 0, 4] },
  small: { fontSize: 9 }
};