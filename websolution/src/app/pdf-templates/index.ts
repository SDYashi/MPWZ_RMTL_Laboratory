import { Injectable } from '@angular/core';
import { PdfService } from '../services/pdf.service';

import { GatepassTemplate } from './gatepass.template';
import { InvoiceTemplate } from './invoice.template';
import { ContestedTemplate } from './contested.template';
import { CtCertificateTemplate } from './ct-certificate.template';

import { StopDefectiveTemplate } from './stop-defective.template';
import { OnmP4Template } from './onm-p4.template';
import { VigP4Template } from './vig-p4.template';
import { SmartAgainstTemplate } from './smart-against.template';
import { OldAgainstTemplate } from './old-against.template';
import { SolarNetmetersTemplate } from './solar-netmeters.template';

export * from './gatepass.template';
export * from './invoice.template';
export * from './contested.template';
export * from './ct-certificate.template';
export * from './stop-defective.template';
export * from './onm-p4.template';
export * from './vig-p4.template';
export * from './smart-against.template';
export * from './old-against.template';
export * from './solar-netmeters.template';

@Injectable({ providedIn: 'root' })
export class PdfTemplatesRegistrar {
  constructor(
    pdf: PdfService,
    gp: GatepassTemplate,
    inv: InvoiceTemplate,
    cont: ContestedTemplate,
    ct: CtCertificateTemplate,
    stop: StopDefectiveTemplate,
    onm: OnmP4Template,
    vig: VigP4Template,
    smart: SmartAgainstTemplate,
    oldA: OldAgainstTemplate,
    solar: SolarNetmetersTemplate
  ) {
    [gp, inv, cont, ct, stop, onm, vig, smart, oldA, solar].forEach(t => pdf.register(t));
  }
}
export const PDF_TEMPLATES = [
  GatepassTemplate,
  InvoiceTemplate,
  ContestedTemplate,
  CtCertificateTemplate,
  StopDefectiveTemplate,
  OnmP4Template,
  VigP4Template,
  SmartAgainstTemplate,
  OldAgainstTemplate,
  SolarNetmetersTemplate
];
