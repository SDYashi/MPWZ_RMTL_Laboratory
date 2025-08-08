import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlUsageStockReportsComponent } from './rmtl-usage-stock-reports/rmtl-usage-stock-reports.component';
import { RmtlDailyTestingReportsComponent } from './rmtl-daily-testing-reports/rmtl-daily-testing-reports.component';
import { RmtlDevicesSummaryReportsComponent } from './rmtl-devices-summary-reports/rmtl-devices-summary-reports.component';

const routes: Routes = [
  {path:'',redirectTo:'view-usage-stock-reports',pathMatch:'full'},
  {path:'view-usage-stock-reports',component:RmtlUsageStockReportsComponent},
  {path:'view-daily-testing-reports',component:RmtlDailyTestingReportsComponent},
  {path:'view-devices-summary-reports',component:RmtlDevicesSummaryReportsComponent},
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlReportsRoutingModule { }
