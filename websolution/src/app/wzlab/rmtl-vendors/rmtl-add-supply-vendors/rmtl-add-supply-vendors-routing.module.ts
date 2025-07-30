import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlAddSupplyVendorsComponent } from './rmtl-add-supply-vendors/rmtl-add-supply-vendors.component';

const routes: Routes = [
  {path:'',component:RmtlAddSupplyVendorsComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlAddSupplyVendorsRoutingModule { }
