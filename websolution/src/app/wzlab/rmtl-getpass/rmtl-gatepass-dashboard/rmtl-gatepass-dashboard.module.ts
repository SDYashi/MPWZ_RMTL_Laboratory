import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlGatepassDashboardRoutingModule } from './rmtl-gatepass-dashboard-routing.module';
import { RmtlGatepassDashboardComponent } from './rmtl-gatepass-dashboard/rmtl-gatepass-dashboard.component';


@NgModule({
  declarations: [
    RmtlGatepassDashboardComponent
  ],
  imports: [
    CommonModule,
    RmtlGatepassDashboardRoutingModule
  ]
})
export class RmtlGatepassDashboardModule { }
