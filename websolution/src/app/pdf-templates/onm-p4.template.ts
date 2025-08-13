import { Injectable } from '@angular/core';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfTemplate } from '../services/pdf.service';
import { baseDoc, header, footer } from '../services/pdf.shared';

export interface OnmP4Payload {
  report_no: string;
  date: string;
  circle?: string; division?: string; zone?: string;

  consumer: { name: string; ivrs?: string; address?: string };
  meter_site: { removal_note?: string; reading?: string; capacity?: string; make?: string; meter_no?: string };

  lab: { meter_no?: string; make?: string; capacity?: string; test_date: string };
  condition: {
    burnt: 'Yes' | 'No';
    body_seal: 'OK' | 'Not OK';
    glass_cover: 'OK' | 'Not OK';
    terminal_block: 'OK' | 'Not OK';
    meter_body: 'OK' | 'Not OK';
    any_other?: string;
  };
  before_test?: string; after_test?: string;
  dial_rsm?: string; dial_meter?: string; percent_error?: string; start_current?: string; creep_test?: string; other?: string;
  remark?: string;
  tested_by?: string; engineer_sign?: string;
}

@Injectable({ providedIn: 'root' })
export class OnmP4Template implements PdfTemplate<OnmP4Payload> {
  kind: 'onm-p4' = 'onm-p4';

  build(p: OnmP4Payload): TDocumentDefinitions {
    return {
      ...baseDoc,
      footer: footer(),
      info: { title: `ONM P4 ${p.report_no}` },
      content: [
        header('ONM P4 – Meter Test Report'),
        {
          columns: [
            { text: `Report No: ${p.report_no}`, style: 'small' },
            { text: `Date: ${p.date}`, alignment: 'right', style: 'small' }
          ],
          margin: [0, 2, 0, 8]
        },

        {
          style: 'small',
          table: {
            widths: ['25%','*','25%','*'],
            body: [
              [{text:'Circle/Division/Zone', bold:true}, `${p.circle ?? ''} ${p.division ? ' / '+p.division : ''} ${p.zone ? ' / '+p.zone : ''}`, {text:'IVRS', bold:true}, p.consumer.ivrs ?? '-' ],
              [{text:'Consumer', bold:true}, p.consumer.name, {text:'Address', bold:true}, p.consumer.address ?? '-' ],
              [{text:'Meter at Site', colSpan: 4, bold:true}, {}, {}, {}],
              [{text:'Meter No', bold:true}, p.meter_site.meter_no ?? '', {text:'Make/Cap.', bold:true}, `${p.meter_site.make ?? ''} ${p.meter_site.capacity ? ' • '+p.meter_site.capacity : ''}`],
              [{text:'Reading/Note', bold:true}, `${p.meter_site.reading ?? ''} ${p.meter_site.removal_note ? ' • '+p.meter_site.removal_note : ''}`, {text:'', bold:true}, '' ],
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0,0,0,10]
        },

        { text:'RMTL (Lab) Entry', style:'h2' },
        {
          style:'small',
          table: {
            widths: ['25%','*','25%','*'],
            body: [
              [{text:'Meter No', bold:true}, p.lab.meter_no ?? '-', {text:'Make/Cap.', bold:true}, `${p.lab.make ?? ''} ${p.lab.capacity ? ' • '+p.lab.capacity : ''}`],
              [{text:'Date of Testing', bold:true}, p.lab.test_date, {text:'Any Other', bold:true}, p.condition.any_other ?? '-' ],
              [{text:'Burnt', bold:true}, p.condition.burnt, {text:'Body Seal', bold:true}, p.condition.body_seal],
              [{text:'Glass Cover', bold:true}, p.condition.glass_cover, {text:'Terminal Block', bold:true}, p.condition.terminal_block],
              [{text:'Meter Body', bold:true}, p.condition.meter_body, {text:'', bold:true}, '' ],
            ]
          },
          layout:'lightHorizontalLines',
          margin:[0,0,0,10]
        },

        { text:'Readings', style:'h2' },
        {
          table: {
            widths: ['*','*'],
            body: [
              [{ text:'Before Test', bold:true }, { text:'After Test', bold:true }],
              [p.before_test ?? '-', p.after_test ?? '-']
            ]
          },
          layout:'lightHorizontalLines',
          margin:[0,0,0,6]
        },

        { text:'Test Result', style:'h2' },
        {
          style:'small',
          table: {
            widths: ['*','*','*','*','*'],
            body: [
              [{text:'Dial RSM (kWh)', bold:true},{text:'Dial Meter (kWh)', bold:true},{text:'% Error', bold:true},{text:'Starting Current', bold:true},{text:'Creep/Other', bold:true}],
              [p.dial_rsm ?? '-', p.dial_meter ?? '-', p.percent_error ?? '-', p.start_current ?? '-', (p.creep_test || p.other || '-') ]
            ]
          },
          layout:'lightHorizontalLines'
        },

        { text:'Remark', style:'h2' },
        { text: p.remark ?? '', margin:[0,0,0,10] },

        {
          columns: [
            { text: `Tested by: ${p.tested_by ?? ''}` },
            { text: `Engineer Sign: ${p.engineer_sign ?? ''}`, alignment:'right' }
          ],
          margin:[0,12,0,0]
        }
      ]
    };
  }
}
export const onmP4Template = new OnmP4Template();
export const onmP4TemplateKind = onmP4Template.kind;
