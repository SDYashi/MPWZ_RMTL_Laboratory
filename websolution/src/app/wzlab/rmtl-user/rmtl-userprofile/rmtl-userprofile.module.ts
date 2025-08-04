import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlUserprofileRoutingModule } from './rmtl-userprofile-routing.module';
import { RmtlUserprofileComponent } from './rmtl-userprofile/rmtl-userprofile.component';


@NgModule({
  declarations: [
    RmtlUserprofileComponent
  ],
  imports: [
    CommonModule,
    RmtlUserprofileRoutingModule
  ]
})
export class RmtlUserprofileModule { }
