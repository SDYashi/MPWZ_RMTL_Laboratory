import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlViewAprovedtestreportComponent } from './rmtl-view-aprovedtestreport/rmtl-view-aprovedtestreport.component';
import { RmtlViewPendingtestreportComponent } from './rmtl-view-pendingtestreport/rmtl-view-pendingtestreport.component';

const routes: Routes = [
  {path:'',redirectTo:'view-pending-test-reports',pathMatch:'full'},
 {path:'view-approved-test-reports',component:RmtlViewAprovedtestreportComponent},
  {path:'view-pending-test-reports',component:RmtlViewPendingtestreportComponent},


];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlApprovaltestreportRoutingModule { }
