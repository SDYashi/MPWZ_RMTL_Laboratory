import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlEditTestreportRoutingModule } from './rmtl-edit-testreport-routing.module';
import { RmtlEditTestreportComponent } from './rmtl-edit-testreport/rmtl-edit-testreport.component';


@NgModule({
  declarations: [
    RmtlEditTestreportComponent
  ],
  imports: [
    CommonModule,
    RmtlEditTestreportRoutingModule
  ]
})
export class RmtlEditTestreportModule { }
