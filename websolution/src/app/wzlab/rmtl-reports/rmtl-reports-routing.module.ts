import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlUsageStockReportsComponent } from './rmtl-usage-stock-reports/rmtl-usage-stock-reports.component';
import { RmtlDailyTestingReportsComponent } from './rmtl-daily-testing-reports/rmtl-daily-testing-reports.component';
import { RmtlDevicesSummaryReportsComponent } from './rmtl-devices-summary-reports/rmtl-devices-summary-reports.component';
import { RmtlListOfOfficeReportsComponent } from './rmtl-list-of-office-reports/rmtl-list-of-office-reports.component';
import { RmtlMonthlyTestingSummaryComponent } from './rmtl-monthly-testing-summary/rmtl-monthly-testing-summary.component';
import { RmtlDailyTestingSummaryComponent } from './rmtl-daily-testing-summary/rmtl-daily-testing-summary.component';

const routes: Routes = [
  {path:'',redirectTo:'view-usage-stock-reports',pathMatch:'full'},
  {path:'view-usage-stock-reports',component:RmtlUsageStockReportsComponent},
  {path:'view-daily-testing-reports',component:RmtlDailyTestingReportsComponent},
  {path:'view-devices-summary-reports',component:RmtlDevicesSummaryReportsComponent},
  {path:'view-list-of-office-reports',component:RmtlListOfOfficeReportsComponent},
  {path:'view-daily-testing-summary',component:RmtlDailyTestingSummaryComponent},
  {path:'view-monthly-testing-summary',component:RmtlMonthlyTestingSummaryComponent},

  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlReportsRoutingModule { }
