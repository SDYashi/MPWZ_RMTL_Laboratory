import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WzlabhomeComponent } from './wzlabhome.component';

const routes: Routes = [
    {
    path: '',
    //  path: 'rmtlhome',
    component: WzlabhomeComponent, 
    // canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'Dashboard', pathMatch: 'full' },
      { path: 'Assignement',loadChildren: () => import('./rmtl-assignment/rmtl-assignment.module').then(m => m.RmtlAssignmentModule) },
      { path: 'Dashboard', loadChildren: () => import('./rmtl-dashboard/rmtl-dashboard.module').then(m => m.RmtlDashboardModule) },
      { path: 'Devices', loadChildren: () => import('./rmtl-devices/rmtl-devices.module').then(m => m.RmtlDevicesModule) },
      { path: 'GetPass', loadChildren: () => import('./rmtl-getpass/rmtl-getpass.module').then(m => m.RmtlGetpassModule) },
      { path: 'Testing-laboratory',loadChildren:()=>import('./rmtl-lab/rmtl-lab.module').then(m=>m.RmtlLabModule)},
      { path: 'Testing', loadChildren: () => import('./rmtl-testing/rmtl-testing.module').then(m => m.RmtlTestingModule) },
      { path: 'Testing-Bench',loadChildren: () => import('./rmtl-testing-bench/rmtl-testing-bench.module').then(m => m.RmtlTestingBenchModule) },  
      { path: 'User',loadChildren:()=>import('./rmtl-user/rmtl-user.module').then(m=>m.RmtlUserModule)},
      { path: 'Supply-Vendors',loadChildren:()=>import('./rmtl-vendors/rmtl-vendors.module').then(m=>m.RmtlVendorsModule)},
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WzlabRoutingModule { }
