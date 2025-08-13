import { Injectable } from '@angular/core';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfTemplate } from '../services/pdf.service';
import { baseDoc, header, footer } from '../services/pdf.shared';

export interface InvoicePayload {
  invoice_no: string;
  date: string;
  due_date?: string;

  // Seller (your lab)
  seller: {
    name: string; address: string;
    gstin?: string; state?: string; pan?: string;
  };

  // Buyer
  buyer: {
    name: string; address: string;
    gstin?: string; state?: string;
  };

  // Line items
  items: Array<{
    sr?: number;
    description: string;
    hsn_sac?: string;
    qty: number;
    unit?: string;
    rate: number;          // per unit
  }>;

  // Taxes (INR/GST style)
  discount?: number;       // flat before tax
  cgst_pct?: number;       // e.g., 9
  sgst_pct?: number;       // e.g., 9
  igst_pct?: number;       // optional if interstate

  notes?: string;
  authorised_sign?: string;
}

@Injectable({ providedIn: 'root' })
export class InvoiceTemplate implements PdfTemplate<InvoicePayload> {
  kind: 'invoice' = 'invoice';

  build(p: InvoicePayload): TDocumentDefinitions {
    const subtotal = (p.items || []).reduce((s, r) => s + r.qty * r.rate, 0);
    const discount = p.discount || 0;
    const taxable = Math.max(0, subtotal - discount);
    const cgst = p.cgst_pct ? (taxable * p.cgst_pct) / 100 : 0;
    const sgst = p.sgst_pct ? (taxable * p.sgst_pct) / 100 : 0;
    const igst = p.igst_pct ? (taxable * p.igst_pct) / 100 : 0;
    const grand = Math.round(taxable + cgst + sgst + igst); // round to INR

    return {
      ...baseDoc,
      footer: footer(),
      info: { title: `Invoice ${p.invoice_no}` },
      content: [
        header('TAX INVOICE'),

        {
          columns: [
            { width: '*', stack: [
              { text: p.seller.name, style: 'h2' },
              { text: p.seller.address, style: 'small' },
              ...(p.seller.gstin ? [{ text: `GSTIN: ${p.seller.gstin}`, style: 'small' }] : []),
              ...(p.seller.pan ? [{ text: `PAN: ${p.seller.pan}`, style: 'small' }] : []),
              ...(p.seller.state ? [{ text: `State: ${p.seller.state}`, style: 'small' }] : []),
            ]},
            { width: '40%', stack: [
              { text: `Invoice No: ${p.invoice_no}`, style: 'small' },
              { text: `Date: ${p.date}`, style: 'small' },
              ...(p.due_date ? [{ text: `Due: ${p.due_date}`, style: 'small' }] : []),
            ], alignment: 'right' }
          ],
          margin: [0, 0, 0, 10]
        },

        {
          style: 'small',
          table: {
            widths: ['50%','50%'],
            body: [
              [
                { stack: [
                    { text: 'Bill To', bold: true, margin: [0, 0, 0, 4] },
                    { text: p.buyer.name },
                    { text: p.buyer.address },
                    ...(p.buyer.gstin ? [{ text: `GSTIN: ${p.buyer.gstin}` }] : []),
                    ...(p.buyer.state ? [{ text: `State: ${p.buyer.state}` }] : []),
                ]},
                ''
              ]
            ]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 6]
        },

        {
          table: {
            headerRows: 1,
            widths: ['auto','*','auto','auto','auto','auto'],
            body: [
              [
                { text: 'Sr', bold: true },
                { text: 'Description', bold: true },
                { text: 'HSN/SAC', bold: true },
                { text: 'Qty', bold: true },
                { text: 'Rate', bold: true },
                { text: 'Amount (₹)', bold: true },
              ],
              ...(p.items || []).map((it, i) => [
                it.sr ?? i + 1,
                it.description,
                it.hsn_sac || '',
                it.qty,
                it.rate.toFixed(2),
                (it.qty * it.rate).toFixed(2),
              ]),
              [
                { text: 'Subtotal', colSpan: 5, alignment: 'right' }, {}, {}, {}, {},
                subtotal.toFixed(2)
              ],
              ...(discount ? [[
                { text: 'Discount', colSpan: 5, alignment: 'right' }, {}, {}, {}, {},
                `- ${discount.toFixed(2)}`
              ]] : []),
              ...(p.cgst_pct ? [[
                { text: `CGST ${p.cgst_pct}%`, colSpan: 5, alignment: 'right' }, {}, {}, {}, {},
                cgst.toFixed(2)
              ]] : []),
              ...(p.sgst_pct ? [[
                { text: `SGST ${p.sgst_pct}%`, colSpan: 5, alignment: 'right' }, {}, {}, {}, {},
                sgst.toFixed(2)
              ]] : []),
              ...(p.igst_pct ? [[
                { text: `IGST ${p.igst_pct}%`, colSpan: 5, alignment: 'right' }, {}, {}, {}, {},
                igst.toFixed(2)
              ]] : []),
              [
                { text: 'Grand Total (₹)', colSpan: 5, alignment: 'right', bold: true }, {}, {}, {}, {},
                { text: grand.toFixed(2), bold: true }
              ]
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 10]
        },

        ...(p.notes ? [{ text: 'Notes', style: 'h2' }, { text: p.notes, style: 'small' }] : []),

        {
          columns: [
            { text: 'For RMTL, Indore', alignment: 'right' }
          ],
          margin: [0, 24, 0, 0]
        },
        {
          columns: [
            { text: `Authorised Signatory: ${p.authorised_sign || ''}`, alignment: 'right', margin: [0, 6, 0, 0] }
          ]
        }
      ]
    };
  }
}
export const invoiceTemplate = new InvoiceTemplate();
