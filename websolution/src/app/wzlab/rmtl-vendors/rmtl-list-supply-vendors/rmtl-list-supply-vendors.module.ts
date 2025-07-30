import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlListSupplyVendorsRoutingModule } from './rmtl-list-supply-vendors-routing.module';
import { RmtlListSupplyVendorsComponent } from './rmtl-list-supply-vendors/rmtl-list-supply-vendors.component';


@NgModule({
  declarations: [
    RmtlListSupplyVendorsComponent
  ],
  imports: [
    CommonModule,
    RmtlListSupplyVendorsRoutingModule
  ]
})
export class RmtlListSupplyVendorsModule { }
