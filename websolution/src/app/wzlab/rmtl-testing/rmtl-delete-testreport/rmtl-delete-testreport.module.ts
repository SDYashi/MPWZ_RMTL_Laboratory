import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlDeleteTestreportRoutingModule } from './rmtl-delete-testreport-routing.module';
import { RmtlDeleteTestreportComponent } from './rmtl-delete-testreport/rmtl-delete-testreport.component';


@NgModule({
  declarations: [
    RmtlDeleteTestreportComponent
  ],
  imports: [
    CommonModule,
    RmtlDeleteTestreportRoutingModule
  ]
})
export class RmtlDeleteTestreportModule { }
