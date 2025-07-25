import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UsersRoutingModule } from './users-routing.module';
import { RmtlUserprofileComponent } from './rmtl-userprofile/rmtl-userprofile.component';
import { RmtlPasswordresetComponent } from './rmtl-passwordreset/rmtl-passwordreset.component';
import { RmtlLoginComponent } from './rmtl-login/rmtl-login.component';


@NgModule({
  declarations: [
    RmtlUserprofileComponent,
    RmtlPasswordresetComponent,
    RmtlLoginComponent,
  ],
  imports: [
    CommonModule,
    UsersRoutingModule
  ]
})
export class UsersModule { }
