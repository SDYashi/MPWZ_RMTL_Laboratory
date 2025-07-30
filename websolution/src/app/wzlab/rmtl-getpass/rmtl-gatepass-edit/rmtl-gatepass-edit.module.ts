import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlGatepassEditRoutingModule } from './rmtl-gatepass-edit-routing.module';
import { RmtlGatepassEditComponent } from './rmtl-gatepass-edit/rmtl-gatepass-edit.component';


@NgModule({
  declarations: [
    RmtlGatepassEditComponent
  ],
  imports: [
    CommonModule,
    RmtlGatepassEditRoutingModule
  ]
})
export class RmtlGatepassEditModule { }
