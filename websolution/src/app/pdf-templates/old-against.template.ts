import { Injectable } from '@angular/core';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfTemplate } from '../services/pdf.service';
import { baseDoc, header, footer } from '../services/pdf.shared';

export interface OldAgainstPayload {
  ref_no: string; date: string; office?: string;
  meters: Array<{
    sr?: number;
    ivrs?: string;
    consumer?: string;
    old_meter_no: string;
    new_meter_no?: string;
    make?: string;
    capacity?: string;
    action?: string;   // Replaced/Stopped/To be tested
    remark?: string;
  }>;
  sign_left?: string; sign_right?: string;
}

@Injectable({ providedIn: 'root' })
export class OldAgainstTemplate implements PdfTemplate<OldAgainstPayload> {
  kind: 'old-against-meters' = 'old-against-meters';

  build(p: OldAgainstPayload): TDocumentDefinitions {
    return {
      ...baseDoc,
      footer: footer(),
      info: { title: `Old Against – ${p.ref_no}` },
      content: [
        header('OLD AGAINST – METER REPLACEMENT/STATUS'),
        {
          columns: [
            { text:`Ref: ${p.ref_no}`, style:'small' },
            { text:`Date: ${p.date}`, alignment:'right', style:'small' }
          ],
          margin:[0,2,0,8]
        },

        {
          table: {
            headerRows: 1,
            widths: ['auto','*','*','*','*','*','*','*'],
            body: [
              [
                { text:'Sr',bold:true }, { text:'IVRS',bold:true }, { text:'Consumer',bold:true }, 
                { text:'Old Meter No',bold:true }, { text:'New Meter No',bold:true },
                { text:'Make',bold:true }, { text:'Capacity',bold:true }, { text:'Action/Remark',bold:true }
              ],
              ...(p.meters || []).map((m,i)=>[
                m.sr ?? i+1, m.ivrs ?? '', m.consumer ?? '', m.old_meter_no, m.new_meter_no ?? '',
                m.make ?? '', m.capacity ?? '', `${m.action ?? ''}${m.remark ? ' • '+m.remark : ''}`
              ])
            ]
          },
          layout:'lightHorizontalLines'
        },

        { columns: [
            { text:`Sign: ${p.sign_left ?? ''}` },
            { text:`Sign: ${p.sign_right ?? ''}`, alignment:'right' }
          ],
          margin:[0,12,0,0]
        }
      ]
    };
  }
}
export function oldAgainstTemplate(p: OldAgainstPayload): TDocumentDefinitions {
  return new OldAgainstTemplate().build(p);
}