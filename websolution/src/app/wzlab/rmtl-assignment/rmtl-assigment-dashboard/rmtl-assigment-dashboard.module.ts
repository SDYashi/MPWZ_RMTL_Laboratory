import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlAssigmentDashboardRoutingModule } from './rmtl-assigment-dashboard-routing.module';
import { RmtlAssigmentDashboardComponent } from './rmtl-assigment-dashboard/rmtl-assigment-dashboard.component';


@NgModule({
  declarations: [
    RmtlAssigmentDashboardComponent
  ],
  imports: [
    CommonModule,
    RmtlAssigmentDashboardRoutingModule
  ]
})
export class RmtlAssigmentDashboardModule { }
