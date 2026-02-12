import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlDashboardComponent } from './rmtl-dashboard.component';
import { RmtlStoreDashboardComponent } from './rmtl-store-dashboard/rmtl-store-dashboard.component';
import { RmtlTestingDashboardComponent } from './rmtl-testing-dashboard/rmtl-testing-dashboard.component';

const routes: Routes = [
  {path:'',redirectTo:'main-dashboard',pathMatch:'full'},
  {path:'main-dashboard',component:RmtlDashboardComponent},
  { path: 'testing-dashboard', component: RmtlTestingDashboardComponent },
  { path: 'store-dashboard', component: RmtlStoreDashboardComponent },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlDashboardRoutingModule { }
