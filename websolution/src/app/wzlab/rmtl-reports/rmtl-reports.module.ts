import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlReportsRoutingModule } from './rmtl-reports-routing.module';
import { RmtlUsageStockReportsComponent } from './rmtl-usage-stock-reports/rmtl-usage-stock-reports.component';
import { RmtlDailyTestingReportsComponent } from './rmtl-daily-testing-reports/rmtl-daily-testing-reports.component';
import { RmtlDevicesSummaryReportsComponent } from './rmtl-devices-summary-reports/rmtl-devices-summary-reports.component';
import { FormsModule } from '@angular/forms';
import { RmtlListOfOfficeReportsComponent } from './rmtl-list-of-office-reports/rmtl-list-of-office-reports.component';
import { RmtlDailyTestingSummaryComponent } from './rmtl-daily-testing-summary/rmtl-daily-testing-summary.component';
import { RmtlMonthlyTestingSummaryComponent } from './rmtl-monthly-testing-summary/rmtl-monthly-testing-summary.component';


@NgModule({
  declarations: [
    RmtlUsageStockReportsComponent,
    RmtlDailyTestingReportsComponent,
    RmtlDevicesSummaryReportsComponent,
    RmtlListOfOfficeReportsComponent,
    RmtlDailyTestingSummaryComponent,
    RmtlMonthlyTestingSummaryComponent
  ],
  imports: [
    CommonModule,
    RmtlReportsRoutingModule,
    FormsModule,
  ]
})
export class RmtlReportsModule { }
