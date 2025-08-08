import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlReportsRoutingModule } from './rmtl-reports-routing.module';
import { RmtlUsageStockReportsComponent } from './rmtl-usage-stock-reports/rmtl-usage-stock-reports.component';
import { RmtlDailyTestingReportsComponent } from './rmtl-daily-testing-reports/rmtl-daily-testing-reports.component';
import { RmtlDevicesSummaryReportsComponent } from './rmtl-devices-summary-reports/rmtl-devices-summary-reports.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlUsageStockReportsComponent,
    RmtlDailyTestingReportsComponent,
    RmtlDevicesSummaryReportsComponent
  ],
  imports: [
    CommonModule,
    RmtlReportsRoutingModule,
    FormsModule,
  ]
})
export class RmtlReportsModule { }
