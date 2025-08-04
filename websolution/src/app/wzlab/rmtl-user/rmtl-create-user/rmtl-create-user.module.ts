import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlCreateUserRoutingModule } from './rmtl-create-user-routing.module';
import { RmtlCreateUserComponent } from './rmtl-create-user/rmtl-create-user.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlCreateUserComponent
  ],
  imports: [
    CommonModule,
    RmtlCreateUserRoutingModule,
    FormsModule,
  ]
})
export class RmtlCreateUserModule { }
