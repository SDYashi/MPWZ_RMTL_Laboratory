import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WzlabhomeComponent } from './wzlabhome.component';
import { RmtlDashboardComponent } from './rmtl-dashboard/rmtl-dashboard.component';

const routes: Routes = [
    {
    path: '',
    component: WzlabhomeComponent, 
    // canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'rmtl-dashboard', pathMatch: 'full' },
      { path: 'rmtl-dashboard', component: RmtlDashboardComponent },




    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WzlabRoutingModule { }
