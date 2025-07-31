import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {path:'',redirectTo:'assigned-list',pathMatch:'full'},
  {path:'assigned-list',loadChildren:()=>import('./rmtl-assigned-list/rmtl-assigned-list.module').then(m=>m.RmtlAssignedListModule)},
  {path:'assign-to-user',loadChildren:()=>import('./rmtl-assign-to-user/rmtl-assign-to-user.module').then(m=>m.RmtlAssignToUserModule)},
  {path:'edit-assignment',loadChildren:()=>import('./rmtl-edit-assigment/rmtl-edit-assigment.module').then(m=>m.RmtlEditAssigmentModule)},
  {path:'assignment-dashboard',loadChildren:()=>import('./rmtl-view-dashboard/rmtl-view-dashboard.module').then(m=>m.RmtlViewDashboardModule)},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlAssignmentRoutingModule { }
