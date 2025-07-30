import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlAssigmentDashboardComponent } from './rmtl-assigment-dashboard/rmtl-assigment-dashboard.component';

const routes: Routes = [
  {path:'',component:RmtlAssigmentDashboardComponent},
  {}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlAssigmentDashboardRoutingModule { }
