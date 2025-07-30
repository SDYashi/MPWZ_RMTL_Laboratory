import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlGatepassListRoutingModule } from './rmtl-gatepass-list-routing.module';
import { RmtlGatepassListComponent } from './rmtl-gatepass-list/rmtl-gatepass-list.component';


@NgModule({
  declarations: [
    RmtlGatepassListComponent
  ],
  imports: [
    CommonModule,
    RmtlGatepassListRoutingModule
  ]
})
export class RmtlGatepassListModule { }
