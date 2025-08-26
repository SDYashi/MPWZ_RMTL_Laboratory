import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlTestreportApprovedRoutingModule } from './rmtl-testreport-approved-routing.module';
import { RmtlTestreportApprovedComponent } from './rmtl-testreport-approved/rmtl-testreport-approved.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlTestreportApprovedComponent
  ],
  imports: [
    CommonModule,
    RmtlTestreportApprovedRoutingModule,
    FormsModule
  ]
})
export class RmtlTestreportApprovedModule { }
