import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlDeleteSupplyVendorsComponent } from './rmtl-delete-supply-vendors/rmtl-delete-supply-vendors.component';

const routes: Routes = [
   {path:'',component:RmtlDeleteSupplyVendorsComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlDeleteSupplyVendorsRoutingModule { }
