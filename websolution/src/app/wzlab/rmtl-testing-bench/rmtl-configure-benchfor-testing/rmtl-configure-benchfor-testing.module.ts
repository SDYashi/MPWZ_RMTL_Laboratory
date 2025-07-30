import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlConfigureBenchforTestingRoutingModule } from './rmtl-configure-benchfor-testing-routing.module';
import { RmtlConfigureBenchforTestingComponent } from './rmtl-configure-benchfor-testing/rmtl-configure-benchfor-testing.component';


@NgModule({
  declarations: [
    RmtlConfigureBenchforTestingComponent
  ],
  imports: [
    CommonModule,
    RmtlConfigureBenchforTestingRoutingModule
  ]
})
export class RmtlConfigureBenchforTestingModule { }
