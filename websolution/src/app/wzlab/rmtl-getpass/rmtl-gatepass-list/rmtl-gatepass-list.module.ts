import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlGatepassListRoutingModule } from './rmtl-gatepass-list-routing.module';
import { RmtlGatepassListComponent } from './rmtl-gatepass-list/rmtl-gatepass-list.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlGatepassListComponent
  ],
  imports: [
    CommonModule,
    RmtlGatepassListRoutingModule,
    FormsModule
  ]
})
export class RmtlGatepassListModule { }
