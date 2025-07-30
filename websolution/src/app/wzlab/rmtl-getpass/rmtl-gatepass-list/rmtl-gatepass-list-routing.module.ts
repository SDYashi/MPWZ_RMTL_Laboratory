import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlGatepassListComponent } from './rmtl-gatepass-list/rmtl-gatepass-list.component';

const routes: Routes = [
    {path:'',component:RmtlGatepassListComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlGatepassListRoutingModule { }
