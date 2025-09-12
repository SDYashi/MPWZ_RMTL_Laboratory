import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RmtlApprovaltestreportRoutingModule } from './rmtl-approvaltestreport-routing.module';
import { FormsModule } from '@angular/forms';
import { RmtlApprovaltestreportDashboardComponent } from './rmtl-approvaltestreport-dashboard/rmtl-approvaltestreport-dashboard.component';


@NgModule({
  declarations: [
  
    RmtlApprovaltestreportDashboardComponent
  ],
  imports: [
    CommonModule,
    RmtlApprovaltestreportRoutingModule,
    FormsModule,
  ]
})
export class RmtlApprovaltestreportModule { }
