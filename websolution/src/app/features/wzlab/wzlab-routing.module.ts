import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlHomeComponent } from './rmtl-home/rmtl-home.component';
import { RmtlDashboardComponent } from './rmtl-dashboard/rmtl-dashboard.component';

const routes: Routes = [
    {
    path: '',
    component: RmtlHomeComponent, 
    // canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'rmtl-dashboard', pathMatch: 'full' },
      { path: 'rmtl-dashboard', component: RmtlDashboardComponent },
      // { path: 'rmtl-dashboard', loadChildren: () => import('./rmtl-dashboard/rmtl-dashboard.module').then(m => m.RmtlDashboardModule) },




    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WzlabRoutingModule { }
