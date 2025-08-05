import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlAddSupplyVendorsRoutingModule } from './rmtl-add-supply-vendors-routing.module';
import { RmtlAddSupplyVendorsComponent } from './rmtl-add-supply-vendors/rmtl-add-supply-vendors.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlAddSupplyVendorsComponent
  ],
  imports: [
    CommonModule,
    RmtlAddSupplyVendorsRoutingModule,
    FormsModule,
  ]
})
export class RmtlAddSupplyVendorsModule { }
