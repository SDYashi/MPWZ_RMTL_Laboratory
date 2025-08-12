import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlApprovaltestreportRoutingModule } from './rmtl-approvaltestreport-routing.module';
import { RmtlApprovaltestreportComponent } from './rmtl-approvaltestreport/rmtl-approvaltestreport.component';
import { RmtlViewAprovedtestreportComponent } from './rmtl-view-aprovedtestreport/rmtl-view-aprovedtestreport.component';
import { RmtlViewPendingtestreportComponent } from './rmtl-view-pendingtestreport/rmtl-view-pendingtestreport.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlApprovaltestreportComponent,
    RmtlViewAprovedtestreportComponent,
    RmtlViewPendingtestreportComponent
  ],
  imports: [
    CommonModule,
    RmtlApprovaltestreportRoutingModule,
    FormsModule
  ]
})
export class RmtlApprovaltestreportModule { }
