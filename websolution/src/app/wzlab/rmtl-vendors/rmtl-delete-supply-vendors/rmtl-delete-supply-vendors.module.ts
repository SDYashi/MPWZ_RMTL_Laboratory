import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlDeleteSupplyVendorsRoutingModule } from './rmtl-delete-supply-vendors-routing.module';
import { RmtlDeleteSupplyVendorsComponent } from './rmtl-delete-supply-vendors/rmtl-delete-supply-vendors.component';


@NgModule({
  declarations: [
    RmtlDeleteSupplyVendorsComponent
  ],
  imports: [
    CommonModule,
    RmtlDeleteSupplyVendorsRoutingModule
  ]
})
export class RmtlDeleteSupplyVendorsModule { }
