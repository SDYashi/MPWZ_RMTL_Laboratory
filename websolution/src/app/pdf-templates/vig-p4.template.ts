import { Injectable } from '@angular/core';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfTemplate } from '../services/pdf.service';
import { baseDoc, header, footer } from '../services/pdf.shared';

export interface VigP4Payload {
  case_no: string; date: string;
  vigilance_circle?: string; team?: string;
  consumer: { name: string; ivrs?: string; address?: string };
  seizure_note?: string;

  meter: { number?: string; make?: string; capacity?: string; reading_at_seizure?: string };
  lab_test: { date: string; findings: string; percent_error?: string; other?: string };
  recommendation?: string;
  sign_by?: string;
}

@Injectable({ providedIn: 'root' })
export class VigP4Template implements PdfTemplate<VigP4Payload> {
  kind: 'vig-p4' = 'vig-p4';

  build(p: VigP4Payload): TDocumentDefinitions {
    return {
      ...baseDoc,
      footer: footer(),
      info: { title: `VIG P4 ${p.case_no}` },
      content: [
        header('VIGILANCE P4 – Meter Examination Report'),
        {
          columns: [
            { text: `Case No: ${p.case_no}`, style:'small' },
            { text: `Date: ${p.date}`, style:'small', alignment:'right' }
          ],
          margin:[0,2,0,8]
        },
        {
          style: 'small',
          table: {
            widths: ['25%','*','25%','*'],
            body: [
              [{ text:'Circle/Team', bold:true }, `${p.vigilance_circle ?? ''} ${p.team ? ' / '+p.team : ''}`, { text:'IVRS', bold:true }, p.consumer.ivrs ?? '-' ],
              [{ text:'Consumer', bold:true }, p.consumer.name, { text:'Address', bold:true }, p.consumer.address ?? '-' ],
              [{ text:'Seizure Note', bold:true }, { text: p.seizure_note ?? '-', colSpan: 3 }, {}, {} ],
              [{ text:'Meter No', bold:true }, p.meter.number ?? '-', { text:'Make/Cap.', bold:true }, `${p.meter.make ?? ''} ${p.meter.capacity ? ' • '+p.meter.capacity : ''}`],
              [{ text:'Reading at Seizure', bold:true }, p.meter.reading_at_seizure ?? '-', { text:'', bold:true }, '' ],
            ]
          },
          layout:'lightHorizontalLines',
          margin:[0,0,0,10]
        },

        { text:'Lab Test Result', style:'h2' },
        {
          style:'small',
          table: {
            widths: ['25%','*','25%','*'],
            body: [
              [{ text:'Date', bold:true }, p.lab_test.date, { text:'% Error', bold:true }, p.lab_test.percent_error ?? '-' ],
              [{ text:'Findings', bold:true }, { text:p.lab_test.findings, colSpan:3 }, {}, {} ],
              [{ text:'Other', bold:true }, { text:p.lab_test.other ?? '-', colSpan:3 }, {}, {} ],
            ]
          },
          layout:'lightHorizontalLines'
        },

        { text:'Recommendation', style:'h2' },
        { text: p.recommendation ?? '-', margin:[0,0,0,12] },

        { text: `Signed by: ${p.sign_by ?? ''}`, alignment:'right' }
      ]
    };
  }
}
export function vigP4Template(p: VigP4Payload): TDocumentDefinitions {
  return new VigP4Template().build(p);
}
