import { Injectable } from '@angular/core';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfTemplate } from '../services/pdf.service';
import { baseDoc, header, footer } from '../services/pdf.shared';

export interface SmartAgainstPayload {
  ref_no: string; date: string; office?: string;
  summary?: string;

  meters: Array<{
    sr?: number;
    ivrs?: string;
    consumer?: string;
    meter_no: string;
    make?: string;
    category?: string;     // Smart/AMI/Prepaid etc.
    capacity?: string;
    reading?: string;
    result?: string;       // OK/Replace/Defective
    remark?: string;
  }>;

  prepared_by?: string; approved_by?: string;
}

@Injectable({ providedIn: 'root' })
export class SmartAgainstTemplate implements PdfTemplate<SmartAgainstPayload> {
  kind: 'smart-against-meters' = 'smart-against-meters';

  build(p: SmartAgainstPayload): TDocumentDefinitions {
    return {
      ...baseDoc,
      footer: footer(),
      info: { title: `Smart Against – ${p.ref_no}` },
      content: [
        header('SMART AGAINST – METER LIST / RESULT'),
        {
          columns: [
            { text: `Ref: ${p.ref_no}`, style:'small' },
            { text: `Date: ${p.date}`, style:'small', alignment:'right' }
          ],
          margin: [0,2,0,8]
        },
        {
          style: 'small',
          table: {
            widths: ['25%','*','25%','*'],
            body: [
              [{ text:'Office', bold:true }, p.office || '-', { text:'Summary', bold:true }, p.summary || '-' ],
              [{ text:'Prepared by', bold:true }, p.prepared_by || '-', { text:'Approved by', bold:true }, p.approved_by || '-' ]
      ]
    },
    layout:'lightHorizontalLines',
    margin:[0,0,0,10]
  
 
}
],      styles: {
        small: { fontSize: 8, margin: [0, 0, 0, 4] },
        header: { fontSize: 10, bold: true, margin: [0, 0, 0, 4] },
        tableHeader: { bold: true, fontSize: 9, color: 'black' }
      },
      defaultStyle: { fontSize: 9, margin: [0, 0, 0, 4] }
    };
  }
}
export function smartAgainstTemplate(p: SmartAgainstPayload): TDocumentDefinitions {
  return new SmartAgainstTemplate().build(p);
}