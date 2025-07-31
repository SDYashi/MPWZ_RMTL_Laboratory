import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {path:'',redirectTo:'assigned-list',pathMatch:'full'},
  {path:'assigned-list',loadChildren:()=>import('./rmtl-assigned-list/rmtl-assigned-list.module').then(m=>m.RmtlAssignedListModule)},
  {path:'assign-to-user',loadChildren:()=>import('./rmtl-assign-to-user/rmtl-assign-to-user.module').then(m=>m.RmtlAssignToUserModule)},
  {path:'assignment-dashboard',loadChildren:()=>import('./rmtl-assigment-dashboard/rmtl-assigment-dashboard.module').then(m=>m.RmtlAssigmentDashboardModule)},
  {path:'edit-assignment',loadChildren:()=>import('./rmtl-edit-assigment/rmtl-edit-assigment.module').then(m=>m.RmtlEditAssigmentModule)},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlAssignmentRoutingModule { }
