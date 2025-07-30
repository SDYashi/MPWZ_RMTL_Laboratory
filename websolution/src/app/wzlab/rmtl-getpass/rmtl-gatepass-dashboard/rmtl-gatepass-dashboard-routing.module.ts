import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlGatepassDashboardComponent } from './rmtl-gatepass-dashboard/rmtl-gatepass-dashboard.component';

const routes: Routes = [
  {path:'',component:RmtlGatepassDashboardComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlGatepassDashboardRoutingModule { }
