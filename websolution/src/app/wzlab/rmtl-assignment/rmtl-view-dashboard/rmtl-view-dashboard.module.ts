import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlViewDashboardRoutingModule } from './rmtl-view-dashboard-routing.module';
import { RmtlViewDashboardComponent } from './rmtl-view-dashboard/rmtl-view-dashboard.component';


@NgModule({
  declarations: [
    RmtlViewDashboardComponent
  ],
  imports: [
    CommonModule,
    RmtlViewDashboardRoutingModule
  ]
})
export class RmtlViewDashboardModule { }
