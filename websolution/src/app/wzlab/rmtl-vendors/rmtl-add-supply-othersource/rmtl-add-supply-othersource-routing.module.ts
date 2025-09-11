import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlAddSupplyOthersourceComponent } from './rmtl-add-supply-othersource/rmtl-add-supply-othersource.component';

const routes: Routes = [
  {path:'',component:RmtlAddSupplyOthersourceComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlAddSupplyOthersourceRoutingModule { }
