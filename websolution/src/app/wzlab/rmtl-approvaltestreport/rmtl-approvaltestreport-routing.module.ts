import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlApprovaltestreportDashboardComponent } from './rmtl-approvaltestreport-dashboard/rmtl-approvaltestreport-dashboard.component';
const routes: Routes = [
  {path:'',redirectTo:'view-pending-test-reports',pathMatch:'full'},
  {path:'view-pending-test-reports',loadChildren:()=>import('./rmtl-testreport-pending/rmtl-testreport-pending-routing.module').then(m=>m.RmtlTestreportPendingRoutingModule)},
  {path:'view-approved-test-reports',loadChildren:()=>import('./rmtl-testreport-approved/rmtl-testreport-approved.module').then(m=>m.RmtlTestreportApprovedModule)},
  {path:'view-oic-dashboard',component:RmtlApprovaltestreportDashboardComponent},

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlApprovaltestreportRoutingModule { }
