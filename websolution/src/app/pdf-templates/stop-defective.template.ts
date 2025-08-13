import { Injectable } from '@angular/core';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfTemplate } from '../services/pdf.service';
import { baseDoc, header, footer } from '../services/pdf.shared';

export interface StopDefectivePayload {
  ref_no: string;
  date: string;
  zone?: string;
  office?: string;

  consumer?: { name?: string; ivrs?: string; address?: string };
  reason: string;                 // why stop? (defective/tampered/etc.)
  action_required?: string;       // stop supply / replace / send to lab
  notes?: string;

  devices: Array<{
    sr?: number;
    type: string;                 // METER/CT
    serial_no: string;
    make?: string;
    capacity?: string;
    remark?: string;
  }>;

  issued_by: { name: string; designation?: string };
  approved_by?: { name?: string; designation?: string };
}

@Injectable({ providedIn: 'root' })
export class StopDefectiveTemplate implements PdfTemplate<StopDefectivePayload> {
  kind: 'stop-defective' = 'stop-defective';

  build(p: StopDefectivePayload): TDocumentDefinitions {
    return {
      ...baseDoc,
      footer: footer(),
      info: { title: `Stop Defective ${p.ref_no}` },
      content: [
        header('STOP / DEFECTIVE – ORDER / MEMO'),
        {
          columns: [
            { text: `Ref: ${p.ref_no}`, style: 'small' },
            { text: `Date: ${p.date}`, alignment: 'right', style: 'small' }
          ],
          margin: [0, 2, 0, 8]
        },
        {
          style: 'small',
          table: {
            widths: ['25%', '*', '25%', '*'],
            body: [
              [{ text: 'Zone/Division', bold: true }, p.zone || '-', { text: 'Office', bold: true }, p.office || '-' ],
              [{ text: 'Consumer', bold: true }, p.consumer?.name || '-', { text: 'IVRS/Acct', bold: true }, p.consumer?.ivrs || '-' ],
              [{ text: 'Address', bold: true }, { text: p.consumer?.address || '-', colSpan: 3 }, {}, {} ],
              [{ text: 'Reason', bold: true }, { text: p.reason, colSpan: 3 }, {}, {} ],
              [{ text: 'Action Required', bold: true }, { text: p.action_required || '-', colSpan: 3 }, {}, {} ],
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 10]
        },

        { text: 'Devices', style: 'h2' },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', '*', '*', '*', '*'],
            body: [
              [{ text: 'Sr', bold: true }, { text: 'Type', bold: true }, { text: 'Serial No', bold: true }, { text: 'Make', bold: true }, { text: 'Capacity', bold: true }, { text: 'Remark', bold: true }],
              ...(p.devices || []).map((d, i) => [d.sr ?? (i + 1), d.type, d.serial_no, d.make || '', d.capacity || '', d.remark || '']),
            ]
          },
          layout: 'lightHorizontalLines'
        },

        ...(p.notes ? [{ text: 'Notes', style: 'h2' }, { text: p.notes, style: 'small' }] : []),

        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'Issued By', style: 'h2' },
                { text: p.issued_by.name },
                { text: p.issued_by.designation || '', style: 'small' },
                { text: 'Sign: ____________', margin: [0, 8, 0, 0] },
              ]
            },
            {
              width: '50%',
              stack: [
                { text: 'Approved By', style: 'h2' },
                { text: p.approved_by?.name || '' },
                { text: p.approved_by?.designation || '', style: 'small' },
                { text: 'Sign: ____________', margin: [0, 8, 0, 0] },
              ],
              alignment: 'right'
            }
          ],
          margin: [0, 14, 0, 0]
        }
      ]
    };
  }
}
export function stopDefectiveTemplate(p: StopDefectivePayload): TDocumentDefinitions {
  return new StopDefectiveTemplate().build(p);
}
