import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfTemplate } from '../services/pdf.service';
import { header, footer, baseDoc } from '../services/pdf.shared';
import { Injectable } from '@angular/core';
export interface ContestedPayload {
  office?: string;
  date?: string;
  consumer_name: string;
  account_or_ivrs: string;
  address: string;
  contested_by: string;         
  testing_fee?: string;
  receipt_no_date?: string;
  removal_condition?: string;

  meter_detail: { number: string; make: string; capacity: string; reading?: string };
  rmtl_detail:  { number: string; make: string; capacity: string };

  testing_date: string;
  physical_condition: {
    burnt: 'Yes'|'No';
    body_seal: 'OK'|'Not OK';
    glass_cover: 'OK'|'Not OK';
    terminal_block: 'OK'|'Not OK';
    meter_body: 'OK'|'Not OK';
    any_other?: string;
  };
  before_test?: string;
  after_test?: string;

  dial_test_rsm?: string;
  dial_test_meter?: string;
  percent_error?: string;
  starting_current_test?: string;
  creep_test?: string;
  other_test?: string;

  remark?: string;
  tested_by?: string; // initials/name
  stamps?: { rmtl_tested?: boolean; engineer?: string } // optional
}

export class ContestedTemplate implements PdfTemplate<ContestedPayload> {
  kind: 'contested' = 'contested';

  build(p: ContestedPayload): TDocumentDefinitions {
    return {
      ...baseDoc,
      footer: footer(),
      info: { title: 'Contested Meter Test Result' },
      content: [
        header(p.office || 'OFFICE OF AE/JE MPPKVVCo.Ltd Zone'),
        { text: `DATE: ${p.date || ''}`, alignment: 'right', margin: [0, 0, 0, 6] },
        { canvas: [{ type: 'line', x1:0, y1:0, x2:515, y2:0, lineWidth: 0.5, lineColor: '#999' }], margin:[0,2,0,6]},

        { style: 'small', table: {
          widths: ['35%','65%'],
          body: [
            [{ text:'Name of Consumer', bold:true }, p.consumer_name],
            [{ text:'Account No / IVRS No.', bold:true }, p.account_or_ivrs],
            [{ text:'Address', bold:true }, p.address],
            [{ text:'Contested Meter by Consumer/Zone', bold:true }, p.contested_by],
            [{ text:'Particular of payment of Testing Charges', bold:true }, p.testing_fee || '' ],
            [{ text:'Receipt No and Date', bold:true }, p.receipt_no_date || '' ],
            [{ text:'Meter Condition as noted at the time of removal', bold:true }, p.removal_condition || '' ],
          ]
        }, layout:'lightHorizontalLines'},

        { text: 'Details of Meter (at site)', style:'h2' },
        { table: {
            widths: ['25%','25%','25%','25%'],
            body: [
              [{ text:'Meter No.', bold:true }, { text:'Make', bold:true }, { text:'Capacity', bold:true }, { text:'Reading', bold:true }],
              [p.meter_detail.number, p.meter_detail.make, p.meter_detail.capacity, p.meter_detail.reading || '']
            ]
          }, layout:'lightHorizontalLines', margin:[0,0,0,6] },

        { text: 'To be filled by Testing Section Laboratory (RMTL)', style:'h2' },
        { table: {
            widths: ['33%','33%','34%'],
            body: [
              [{ text:'Meter No.', bold:true }, { text:'Make', bold:true }, { text:'Capacity', bold:true }],
              [p.rmtl_detail.number, p.rmtl_detail.make, p.rmtl_detail.capacity]
            ]
          }, layout:'lightHorizontalLines', margin:[0,0,0,6] },

        { style:'small', table: {
          widths: ['60%','40%'],
          body: [
            [{ text:'Date of Testing', bold:true }, p.testing_date],
            [{ text:'Whether found Burnt', bold:true }, p.physical_condition.burnt],
            [{ text:'Meter Body Seal', bold:true }, p.physical_condition.body_seal],
            [{ text:'Meter Glass Cover', bold:true }, p.physical_condition.glass_cover],
            [{ text:'Terminal Block', bold:true }, p.physical_condition.terminal_block],
            [{ text:'Meter Body', bold:true }, p.physical_condition.meter_body],
            [{ text:'Any Other', bold:true }, p.physical_condition.any_other || '' ],
          ]
        }, layout:'lightHorizontalLines'},

        { text:'Readings as Found', style:'h2' },
        { table: {
          widths: ['*','*'],
          body: [
            [{ text:'Before Test', bold:true }, { text:'After Test', bold:true }],
            [p.before_test || '-', p.after_test || '-']
          ]
        }, layout:'lightHorizontalLines', margin:[0,0,0,6] },

        { text:'Test Result', style:'h2' },
        { style:'small', table: {
          widths: ['*','*','*','*','*'],
          body: [
            [{text:'Dial Test RSM (kWh)', bold:true},{text:'Dial Test Meter (kWh)', bold:true},{text:'% Error', bold:true},{text:'Starting Current Test', bold:true},{text:'Creep Test / Other', bold:true}],
            [p.dial_test_rsm || '-', p.dial_test_meter || '-', p.percent_error || '-', p.starting_current_test || '-', (p.creep_test || p.other_test || '-') ]
          ]
        }, layout:'lightHorizontalLines'},

        { text:'Remark', style:'h2' },
        { text: p.remark || '', margin:[0,0,0,8] },

        { columns: [
            { text: `TESTED BY: ${p.tested_by || ''}`, width: '50%', margin:[0,20,0,0] },
            { text: 'Signature: ____________', alignment:'right', width:'50%', margin:[0,20,0,0] }
        ]},

        { text: 'Stamps', style:'h2', margin:[0,20,0,4] },
        { style:'small', table: {
          widths: ['50%','50%'],
          body: [
            [{ text:'RMTL Tested', bold:true }, p.stamps?.rmtl_tested ? 'Yes' : 'No' ],
            [{ text:'Engineer', bold:true }, p.stamps?.engineer || '' ]
          ]
        }, layout:'lightHorizontalLines' }
      ]
    };
  }
}
export const contestedTemplate = new ContestedTemplate();
