import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlApprovaltestreportComponent } from './rmtl-approvaltestreport/rmtl-approvaltestreport.component';
import { RmtlViewAprovedtestreportComponent } from './rmtl-view-aprovedtestreport/rmtl-view-aprovedtestreport.component';
import { RmtlViewPendingtestreportComponent } from './rmtl-view-pendingtestreport/rmtl-view-pendingtestreport.component';

const routes: Routes = [
  {path:'',redirectTo:'view-approval-test-reports',pathMatch:'full'},
  {path:'view-approval-test-reports',component:RmtlApprovaltestreportComponent},
  {path:'view-approved-test-reports',component:RmtlViewAprovedtestreportComponent},
  {path:'view-pending-test-reports',component:RmtlViewPendingtestreportComponent},


];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlApprovaltestreportRoutingModule { }
