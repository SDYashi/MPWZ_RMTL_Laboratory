import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlGatepassEditRoutingModule } from './rmtl-gatepass-edit-routing.module';
import { RmtlGatepassEditComponent } from './rmtl-gatepass-edit/rmtl-gatepass-edit.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlGatepassEditComponent
  ],
  imports: [
    CommonModule,
    RmtlGatepassEditRoutingModule,
    FormsModule
  ]
})
export class RmtlGatepassEditModule { }
