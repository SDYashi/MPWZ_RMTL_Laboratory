import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WzlabhomeComponent } from './wzlabhome.component';
import { authGuard } from '../core/auth-gaurd.guard';

const routes: Routes = [
    {
    path: '',
    //  path: 'rmtlhome',
    component: WzlabhomeComponent, 
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'assignement',loadChildren: () => import('./rmtl-assignment/rmtl-assignment.module').then(m => m.RmtlAssignmentModule) },
      { path: 'dashboard', loadChildren: () => import('./rmtl-dashboard/rmtl-dashboard.module').then(m => m.RmtlDashboardModule) },
      { path: 'devices', loadChildren: () => import('./rmtl-devices/rmtl-devices.module').then(m => m.RmtlDevicesModule) },
      { path: 'getpass', loadChildren: () => import('./rmtl-getpass/rmtl-getpass.module').then(m => m.RmtlGetpassModule) },
      { path: 'testing-laboratory',loadChildren:()=>import('./rmtl-lab/rmtl-lab.module').then(m=>m.RmtlLabModule)},
      { path: 'testing', loadChildren: () => import('./rmtl-testing/rmtl-testing.module').then(m => m.RmtlTestingModule) },
      { path: 'testing-bench',loadChildren: () => import('./rmtl-testing-bench/rmtl-testing-bench.module').then(m => m.RmtlTestingBenchModule) },  
      { path: 'user',loadChildren:()=>import('./rmtl-user/rmtl-user.module').then(m=>m.RmtlUserModule)},
      { path: 'supply-vendors',loadChildren:()=>import('./rmtl-vendors/rmtl-vendors.module').then(m=>m.RmtlVendorsModule)},
      { path: 'lab', loadChildren: () => import('./rmtl-lab/rmtl-lab.module').then(m => m.RmtlLabModule) },
      { path:'store',loadChildren:()=>import('./rmtl-store/rmtl-store.module').then(m=>m.RmtlStoreModule)},
       { path:'reports',loadChildren:()=>import('./rmtl-reports/rmtl-reports.module').then(m=>m.RmtlReportsModule)},
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WzlabRoutingModule { }
