import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {path:'',redirectTo:'list-devices',pathMatch:'full'},
  {path:'list-devices',loadChildren:()=>import('./rmtl-view-devices/rmtl-view-devices.module').then(m=>m.RmtlViewDevicesModule)},
  {path:'add-devices',loadChildren:()=>import('./rmtl-add-devices/rmtl-add-devices.module').then(m=>m.RmtlAddDevicesModule)},
  {path:'edit-devices',loadChildren:()=>import('./rmtl-edit-devices/rmtl-edit-devices.module').then(m=>m.RmtlEditDevicesModule)},
  {path:'dashboard-devices',loadChildren:()=>import('./rmtl-dashboard-devices/rmtl-dashboard-devices.module').then(m=>m.RmtlDashboardDevicesModule)}
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlDevicesRoutingModule { }
