import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {path:'',redirectTo:'gatepass-dashboard',pathMatch:'full'},
  {path:'gatepass-list',loadChildren:()=>import('./rmtl-gatepass-list/rmtl-gatepass-list.module').then(m=>m.RmtlGatepassListModule)},
  {path:'gatepass-generate',loadChildren:()=>import('./rmtl-gatepass-generate/rmtl-gatepass-generate.module').then(m=>m.RmtlGatepassGenerateModule)},
  {path:'gatepass-edit',loadChildren:()=>import('./rmtl-gatepass-edit/rmtl-gatepass-edit.module').then(m=>m.RmtlGatepassEditModule)},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlGetpassRoutingModule { }
