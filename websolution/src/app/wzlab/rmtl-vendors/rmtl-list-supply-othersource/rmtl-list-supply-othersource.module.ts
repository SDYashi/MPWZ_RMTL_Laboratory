import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlListSupplyOthersourceRoutingModule } from './rmtl-list-supply-othersource-routing.module';
import { RmtlListSupplyOthersourceComponent } from './rmtl-list-supply-othersource/rmtl-list-supply-othersource.component';


@NgModule({
  declarations: [
    RmtlListSupplyOthersourceComponent
  ],
  imports: [
    CommonModule,
    RmtlListSupplyOthersourceRoutingModule
  ]
})
export class RmtlListSupplyOthersourceModule { }
