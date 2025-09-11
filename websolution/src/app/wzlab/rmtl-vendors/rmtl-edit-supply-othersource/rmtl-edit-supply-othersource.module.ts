import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlEditSupplyOthersourceRoutingModule } from './rmtl-edit-supply-othersource-routing.module';
import { RmtlEditSupplyOthersourceComponent } from './rmtl-edit-supply-othersource/rmtl-edit-supply-othersource.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlEditSupplyOthersourceComponent
  ],
  imports: [
    CommonModule,
    RmtlEditSupplyOthersourceRoutingModule,
    FormsModule
  ]
})
export class RmtlEditSupplyOthersourceModule { }
