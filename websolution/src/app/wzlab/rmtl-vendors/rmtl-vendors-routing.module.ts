import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
{path:'',redirectTo:'list-supply-vendors',pathMatch:'full'},
{path:'list-supply-vendors',loadChildren:()=>import('./rmtl-list-supply-vendors/rmtl-list-supply-vendors.module').then(m=>m.RmtlListSupplyVendorsModule)},
{path:'add-supply-vendors',loadChildren:()=>import('./rmtl-add-supply-vendors/rmtl-add-supply-vendors.module').then(m=>m.RmtlAddSupplyVendorsModule)},
{path:'view-supply-vendors',loadChildren:()=>import('./rmtl-view-supply-vendors/rmtl-view-supply-vendors.module').then(m=>m.RmtlViewSupplyVendorsModule)},
{path:'delete-supply-vendors',loadChildren:()=>import('./rmtl-delete-supply-vendors/rmtl-delete-supply-vendors.module').then(m=>m.RmtlDeleteSupplyVendorsModule)},

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlVendorsRoutingModule { }
