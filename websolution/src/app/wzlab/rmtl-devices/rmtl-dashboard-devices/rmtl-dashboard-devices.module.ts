import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlDashboardDevicesRoutingModule } from './rmtl-dashboard-devices-routing.module';
import { RmtlDashboardDevicesComponent } from './rmtl-dashboard-devices/rmtl-dashboard-devices.component';


@NgModule({
  declarations: [
    RmtlDashboardDevicesComponent
  ],
  imports: [
    CommonModule,
    RmtlDashboardDevicesRoutingModule
  ]
})
export class RmtlDashboardDevicesModule { }
