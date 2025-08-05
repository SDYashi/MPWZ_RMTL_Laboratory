import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlEditSupplyVendorsRoutingModule } from './rmtl-edit-supply-vendors-routing.module';
import { RmtlEditSupplyVendorsComponent } from './rmtl-edit-supply-vendors/rmtl-edit-supply-vendors.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlEditSupplyVendorsComponent
  ],
  imports: [
    CommonModule,
    RmtlEditSupplyVendorsRoutingModule,
    FormsModule,
  ]
})
export class RmtlEditSupplyVendorsModule { }
