import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlAddSupplyOthersourceRoutingModule } from './rmtl-add-supply-othersource-routing.module';
import { RmtlAddSupplyOthersourceComponent } from './rmtl-add-supply-othersource/rmtl-add-supply-othersource.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlAddSupplyOthersourceComponent
  ],
  imports: [
    CommonModule,
    RmtlAddSupplyOthersourceRoutingModule,
    FormsModule
  ]
})
export class RmtlAddSupplyOthersourceModule { }
