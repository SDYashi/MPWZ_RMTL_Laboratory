import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlUserprofileRoutingModule } from './rmtl-userprofile-routing.module';
import { RmtlUserprofileComponent } from './rmtl-userprofile/rmtl-userprofile.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlUserprofileComponent
  ],
  imports: [
    CommonModule,
    RmtlUserprofileRoutingModule,
    FormsModule
  ]
})
export class RmtlUserprofileModule { }
