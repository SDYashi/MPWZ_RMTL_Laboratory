import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlCreateUserRoutingModule } from './rmtl-create-user-routing.module';
import { RmtlCreateUserComponent } from './rmtl-create-user/rmtl-create-user.component';


@NgModule({
  declarations: [
    RmtlCreateUserComponent
  ],
  imports: [
    CommonModule,
    RmtlCreateUserRoutingModule
  ]
})
export class RmtlCreateUserModule { }
