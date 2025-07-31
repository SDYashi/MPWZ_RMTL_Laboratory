import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlViewDashboardComponent } from './rmtl-view-dashboard/rmtl-view-dashboard.component';

const routes: Routes = [
  {path:'',component:RmtlViewDashboardComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlViewDashboardRoutingModule { }
