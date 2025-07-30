import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlDashboardDevicesComponent } from './rmtl-dashboard-devices/rmtl-dashboard-devices.component';

const routes: Routes = [
  {path:'',component:RmtlDashboardDevicesComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlDashboardDevicesRoutingModule { }
