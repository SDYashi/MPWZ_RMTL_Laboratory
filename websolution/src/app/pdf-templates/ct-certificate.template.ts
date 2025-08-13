import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfTemplate } from '../services/pdf.service';
import { header, footer, baseDoc } from '../services/pdf.shared';
import { Injectable } from '@angular/core';
export interface CtCertificatePayload {
  name_of_consumer: string;
  address: string;
  no_of_ct: string;
  city_class: string;
  ct_make: string;
  ref?: string;
  mr_no_date?: string;
  amount_deposited?: string;
  date_of_testing: string;

  details: Array<{
    sr?: number;
    ct_no: string;
    make: string;
    cap: string;         // e.g., "300/5"
    ratio: string;       // e.g., "OK" or actual ratio
    polarity: string;    // "OK"/"Reversed"/etc.
    remark?: string;
  }>;

  primary_current?: string;  // "300 A"
  secondary_current?: string; // "5 A"
  tested_by?: string;
  engineer_sign?: string;
}

export class CtCertificateTemplate implements PdfTemplate<CtCertificatePayload> {
  kind: 'ct-device' = 'ct-device';

  build(p: CtCertificatePayload): TDocumentDefinitions {
    return {
      ...baseDoc,
      footer: footer(),
      info: { title: 'Certificate for C.T' },
      content: [
        header('OFFICE OF THE ASSISTANT ENGINEER (R.M.T.L) • CERTIFICATE FOR C.T'),
        { text: 'M.P.P.K.V.V.CO. LTD, INDORE', alignment: 'center', margin:[0,0,0,8], style:'small' },

        { style:'small', table: {
          widths: ['35%','65%'],
          body: [
            [{text:'Name of consumer', bold:true}, p.name_of_consumer],
            [{text:'Address', bold:true}, p.address],
            [{text:'No. of C.T', bold:true}, p.no_of_ct],
            [{text:'CITY CLASS', bold:true}, p.city_class],
            [{text:'C.T Make', bold:true}, p.ct_make],
            [{text:'Ref.', bold:true}, p.ref || '' ],
            [{text:'M.R. No/ Online Tran. ID & Date', bold:true}, p.mr_no_date || '' ],
            [{text:'Amount Deposited', bold:true}, p.amount_deposited || '' ],
            [{text:'Date of Testing', bold:true}, p.date_of_testing]
          ]
        }, layout:'lightHorizontalLines' },

        { text:'Details of C.T', style:'h2' },
        {
          table: {
            headerRows: 1,
            widths: ['auto','*','*','*','*','*','*'],
            body: [
              [
                { text:'Sr No.', bold:true },
                { text:'C.T No.', bold:true },
                { text:'Make', bold:true },
                { text:'Cap.', bold:true },
                { text:'Ratio', bold:true },
                { text:'Polarity', bold:true },
                { text:'Remark', bold:true },
              ],
              ...p.details.map((d, i) => [
                d.sr ?? i+1,
                d.ct_no, d.make, d.cap, d.ratio, d.polarity, d.remark || ''
              ])
            ]
          },
          layout:'lightHorizontalLines',
          margin:[0,0,0,10]
        },

        { columns: [
          { text: `Primary Current: ${p.primary_current || ''}`, style:'small' },
          { text: `Secondary Current: ${p.secondary_current || ''}`, alignment:'right', style:'small' }
        ]},

        { columns: [
          { text: `Tested by: ${p.tested_by || ''}`, margin:[0,18,0,0] },
          { text: `Engineer Sign: ${p.engineer_sign || ''}`, alignment:'right', margin:[0,18,0,0] }
        ]}
      ]
    };
  }
}
export const ctCertificateTemplate = new CtCertificateTemplate();