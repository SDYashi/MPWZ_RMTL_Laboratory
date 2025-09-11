import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlEditSupplyOthersourceComponent } from './rmtl-edit-supply-othersource/rmtl-edit-supply-othersource.component';

const routes: Routes = [
  {path:'',component:RmtlEditSupplyOthersourceComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlEditSupplyOthersourceRoutingModule { }
