import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlDashboardTestreportRoutingModule } from './rmtl-dashboard-testreport-routing.module';
import { RmtlDashboardTestreportComponent } from './rmtl-dashboard-testreport/rmtl-dashboard-testreport.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlDashboardTestreportComponent
  ],
  imports: [
    CommonModule,
    RmtlDashboardTestreportRoutingModule,
    FormsModule
  ]
})
export class RmtlDashboardTestreportModule { }
