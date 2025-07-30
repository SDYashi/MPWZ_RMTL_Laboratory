import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {path:'',redirectTo:'view-list',pathMatch:'full'},
  {path:'view-list',loadChildren:()=>import('./lab-view-list/lab-view-list.module').then(m=>m.LabViewListModule)},
  {path:'view-create',loadChildren:()=>import('./lab-create/lab-create.module').then(m=>m.LabCreateModule)},
  {path:'view-edit',loadChildren:()=>import('./lab-edit/lab-edit.module').then(m=>m.LabEditModule)},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlLabRoutingModule { }
