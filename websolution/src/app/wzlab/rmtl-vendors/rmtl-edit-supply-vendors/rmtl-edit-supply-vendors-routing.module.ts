import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlEditSupplyVendorsComponent } from './rmtl-edit-supply-vendors/rmtl-edit-supply-vendors.component';

const routes: Routes = [
  {path:'',component:RmtlEditSupplyVendorsComponent},

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlEditSupplyVendorsRoutingModule { }
