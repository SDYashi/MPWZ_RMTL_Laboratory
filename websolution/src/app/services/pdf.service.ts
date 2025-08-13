import { Injectable, Inject, Optional } from '@angular/core';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

(pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;


/** Every template implements this */
export interface PdfTemplate<T = any> {
  kind: PdfKind;
  build(payload: T): TDocumentDefinitions;
}

export type PdfKind =
  | 'invoice'
  | 'gatepass'
  | 'stop-defective'
  | 'contested'
  | 'onm-p4'
  | 'vig-p4'
  | 'smart-against-meters'
  | 'old-against-meters'
  | 'solar-netmeters'
  | 'ct-device';

@Injectable({ providedIn: 'root' })
export class PdfService {
  private registry = new Map<PdfKind, PdfTemplate>();

  /** Call this from module constructors to register templates */
  register(t: PdfTemplate) { this.registry.set(t.kind, t); }

  open(kind: PdfKind, payload: any) {
    const t = this.get(kind);
    pdfMake.createPdf(t.build(payload)).open();      // <— Preview in new tab
  }

  download(kind: PdfKind, payload: any, fileName?: string) {
    const t = this.get(kind);
    const name = fileName ?? `${kind}-${Date.now()}.pdf`;
    pdfMake.createPdf(t.build(payload)).download(name);
  }

  print(kind: PdfKind, payload: any) {
    const t = this.get(kind);
    pdfMake.createPdf(t.build(payload)).print();
  }

  private get(kind: PdfKind) {
    const t = this.registry.get(kind);
    if (!t) throw new Error(`No PDF template registered for "${kind}"`);
    return t;
  }
}
