import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlEditUserRoutingModule } from './rmtl-edit-user-routing.module';
import { RmtlEditUserComponent } from './rmtl-edit-user/rmtl-edit-user.component';


@NgModule({
  declarations: [
    RmtlEditUserComponent
  ],
  imports: [
    CommonModule,
    RmtlEditUserRoutingModule
  ]
})
export class RmtlEditUserModule { }
