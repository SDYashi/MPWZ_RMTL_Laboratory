import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlTestingDashboardComponent } from './rmtl-testing-dashboard/rmtl-testing-dashboard.component';

const routes: Routes = [
  {path:'',redirectTo:'view-dashboard',pathMatch:'full'},
  {path:'add-testreports',loadChildren: () => import('./rmtl-add-testreport/rmtl-add-testreport.module').then(m => m.RmtlAddTestreportModule) },
  {path:'view-testreports',loadChildren: () => import('./rmtl-view-testreport/rmtl-view-testreport.module').then(m => m.RmtlViewTestreportModule) },
  {path:'edit-testreports',loadChildren: () => import('./rmtl-edit-testreport/rmtl-edit-testreport.module').then(m => m.RmtlEditTestreportModule) },
  {path:'view-testing-dashboard',component:RmtlTestingDashboardComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlTestingRoutingModule { }
