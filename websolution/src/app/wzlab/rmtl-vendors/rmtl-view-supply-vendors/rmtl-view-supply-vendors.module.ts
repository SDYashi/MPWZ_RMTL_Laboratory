import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlViewSupplyVendorsRoutingModule } from './rmtl-view-supply-vendors-routing.module';
import { RmtlViewSupplyVendorsComponent } from './rmtl-view-supply-vendors/rmtl-view-supply-vendors.component';


@NgModule({
  declarations: [
    RmtlViewSupplyVendorsComponent
  ],
  imports: [
    CommonModule,
    RmtlViewSupplyVendorsRoutingModule
  ]
})
export class RmtlViewSupplyVendorsModule { }
