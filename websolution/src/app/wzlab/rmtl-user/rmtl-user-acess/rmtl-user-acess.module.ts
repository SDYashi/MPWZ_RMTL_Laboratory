import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlUserAcessRoutingModule } from './rmtl-user-acess-routing.module';
import { RmtlUserAcessComponent } from './rmtl-user-acess/rmtl-user-acess.component';


@NgModule({
  declarations: [
    RmtlUserAcessComponent
  ],
  imports: [
    CommonModule,
    RmtlUserAcessRoutingModule
  ]
})
export class RmtlUserAcessModule { }
