import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlDashboardTestreportComponent } from './rmtl-dashboard-testreport/rmtl-dashboard-testreport.component';

const routes: Routes = [
  {path:'',component:RmtlDashboardTestreportComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlDashboardTestreportRoutingModule { }
