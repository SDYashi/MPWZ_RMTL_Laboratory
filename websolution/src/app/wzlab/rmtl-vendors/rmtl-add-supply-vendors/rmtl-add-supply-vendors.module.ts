import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlAddSupplyVendorsRoutingModule } from './rmtl-add-supply-vendors-routing.module';
import { RmtlAddSupplyVendorsComponent } from './rmtl-add-supply-vendors/rmtl-add-supply-vendors.component';


@NgModule({
  declarations: [
    RmtlAddSupplyVendorsComponent
  ],
  imports: [
    CommonModule,
    RmtlAddSupplyVendorsRoutingModule
  ]
})
export class RmtlAddSupplyVendorsModule { }
