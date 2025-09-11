import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlListSupplyOthersourceComponent } from './rmtl-list-supply-othersource/rmtl-list-supply-othersource.component';

const routes: Routes = [
  {path:'',component:RmtlListSupplyOthersourceComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlListSupplyOthersourceRoutingModule { }
