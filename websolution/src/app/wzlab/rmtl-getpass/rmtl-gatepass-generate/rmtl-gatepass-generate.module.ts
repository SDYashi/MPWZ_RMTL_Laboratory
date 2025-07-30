import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlGatepassGenerateRoutingModule } from './rmtl-gatepass-generate-routing.module';
import { RmtlGatepassGenerateComponent } from './rmtl-gatepass-generate/rmtl-gatepass-generate.component';


@NgModule({
  declarations: [
    RmtlGatepassGenerateComponent
  ],
  imports: [
    CommonModule,
    RmtlGatepassGenerateRoutingModule
  ]
})
export class RmtlGatepassGenerateModule { }
