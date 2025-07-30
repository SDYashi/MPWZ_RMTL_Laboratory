import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlListSupplyVendorsComponent } from './rmtl-list-supply-vendors/rmtl-list-supply-vendors.component';

const routes: Routes = [
   {path:'',component:RmtlListSupplyVendorsComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlListSupplyVendorsRoutingModule { }
