import { Injectable } from '@angular/core';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfTemplate } from '../services/pdf.service';
import { baseDoc, header, footer } from '../services/pdf.shared';

export interface SolarNetPayload {
  ref_no: string; date: string; feeder?: string; office?: string;
  consumer: { name: string; ivrs?: string; address?: string };
  system_cap_kw?: string; inverter_make?: string;

  meters: Array<{
    sr?: number;
    meter_no: string;
    make?: string;
    type?: string;          // Import/Export/Bi-directional
    capacity?: string;
    initial_import?: string;
    initial_export?: string;
    remark?: string;
  }>;

  tested_by?: string; engineer_sign?: string; notes?: string;
}

@Injectable({ providedIn: 'root' })
export class SolarNetmetersTemplate implements PdfTemplate<SolarNetPayload> {
  kind: 'solar-netmeters' = 'solar-netmeters';

  build(p: SolarNetPayload): TDocumentDefinitions {
    return {
      ...baseDoc,
      footer: footer(),
      info: { title: `Solar Netmeter – ${p.ref_no}` },
      content: [
        header('SOLAR NETMETER – COMMISSIONING / TEST RECORD'),
        {
          columns: [
            { text:`Ref: ${p.ref_no}`, style:'small' },
            { text:`Date: ${p.date}`, style:'small', alignment:'right' }
          ],
          margin:[0,2,0,8]
        },

        {
          style:'small',
          table: {
            widths:['25%','*','25%','*'],
            body:[
              [{text:'Consumer', bold:true}, p.consumer.name, {text:'IVRS', bold:true}, p.consumer.ivrs ?? '-' ],
              [{text:'Address', bold:true}, p.consumer.address ?? '-', {text:'Feeder/Office', bold:true}, `${p.feeder ?? ''} ${p.office ? ' / '+p.office : ''}`],
              [{text:'System Capacity (kW)', bold:true}, p.system_cap_kw ?? '-', {text:'Inverter Make', bold:true}, p.inverter_make ?? '-' ],
            ]
          },
          layout:'lightHorizontalLines',
          margin:[0,0,0,10]
        },

        { text:'Meters', style:'h2' },
        {
          table: {
            headerRows: 1,
            widths: ['auto','*','*','*','*','*','*','*'],
            body: [
              [
                {text:'Sr',bold:true},{text:'Meter No',bold:true},{text:'Make',bold:true},{text:'Type',bold:true},
                {text:'Capacity',bold:true},{text:'Import Init',bold:true},{text:'Export Init',bold:true},{text:'Remark',bold:true}
              ],
              ...(p.meters || []).map((m,i)=>[
                m.sr ?? i+1, m.meter_no, m.make ?? '', m.type ?? '', m.capacity ?? '', m.initial_import ?? '', m.initial_export ?? '', m.remark ?? ''
              ])
            ]
          },
          layout:'lightHorizontalLines'
        },

        ...(p.notes ? [{ text:'Notes', style:'h2' }, { text:p.notes, style:'small' }] : []),

        {
          columns: [
            { text:`Tested by: ${p.tested_by ?? ''}` },
            { text:`Engineer Sign: ${p.engineer_sign ?? ''}`, alignment:'right' }
          ],
          margin:[0,12,0,0]
        }
      ]
    };
  }
}
export function solarNetmetersTemplate(p: SolarNetPayload): TDocumentDefinitions {
  return new SolarNetmetersTemplate().build(p);
}