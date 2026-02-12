import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlDashboardRoutingModule } from './rmtl-dashboard-routing.module';
import { RmtlTestingDashboardComponent } from './rmtl-testing-dashboard/rmtl-testing-dashboard.component';
import { RmtlStoreDashboardComponent } from './rmtl-store-dashboard/rmtl-store-dashboard.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [ 
    RmtlTestingDashboardComponent, RmtlStoreDashboardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RmtlDashboardRoutingModule
  ]
})
export class RmtlDashboardModule {



}
