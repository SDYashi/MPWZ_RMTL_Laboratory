import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlViewSupplyVendorsComponent } from './rmtl-view-supply-vendors/rmtl-view-supply-vendors.component';

const routes: Routes = [
   {path:'',component:RmtlViewSupplyVendorsComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlViewSupplyVendorsRoutingModule { }
