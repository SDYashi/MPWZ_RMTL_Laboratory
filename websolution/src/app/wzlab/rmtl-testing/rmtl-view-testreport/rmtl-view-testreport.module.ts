import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlViewTestreportRoutingModule } from './rmtl-view-testreport-routing.module';
import { RmtlViewTestreportComponent } from './rmtl-view-testreport/rmtl-view-testreport.component';


@NgModule({
  declarations: [
    RmtlViewTestreportComponent
  ],
  imports: [
    CommonModule,
    RmtlViewTestreportRoutingModule
  ]
})
export class RmtlViewTestreportModule { }
