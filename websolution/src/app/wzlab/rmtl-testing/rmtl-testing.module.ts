import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlTestingRoutingModule } from './rmtl-testing-routing.module';
import { RmtlTestingDashboardComponent } from './rmtl-testing-dashboard/rmtl-testing-dashboard.component';


@NgModule({
  declarations: [
    RmtlTestingDashboardComponent
  ],
  imports: [
    CommonModule,
    RmtlTestingRoutingModule,
    CommonModule
  ]
})
export class RmtlTestingModule { }
