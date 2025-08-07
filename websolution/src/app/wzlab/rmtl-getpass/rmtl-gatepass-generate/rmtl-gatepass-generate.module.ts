import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlGatepassGenerateRoutingModule } from './rmtl-gatepass-generate-routing.module';
import { RmtlGatepassGenerateComponent } from './rmtl-gatepass-generate/rmtl-gatepass-generate.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlGatepassGenerateComponent
  ],
  imports: [
    CommonModule,
    RmtlGatepassGenerateRoutingModule,
    FormsModule,
  ]
})
export class RmtlGatepassGenerateModule { }
