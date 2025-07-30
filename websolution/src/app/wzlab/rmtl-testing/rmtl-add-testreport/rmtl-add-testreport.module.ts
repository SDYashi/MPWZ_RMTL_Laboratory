import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlAddTestreportRoutingModule } from './rmtl-add-testreport-routing.module';
import { RmtlAddTestreportComponent } from './rmtl-add-testreport/rmtl-add-testreport.component';


@NgModule({
  declarations: [
    RmtlAddTestreportComponent
  ],
  imports: [
    CommonModule,
    RmtlAddTestreportRoutingModule
  ]
})
export class RmtlAddTestreportModule { }
