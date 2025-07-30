import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlTestingBenchListRoutingModule } from './rmtl-testing-bench-list-routing.module';
import { RmtlTestingBenchListComponent } from './rmtl-testing-bench-list/rmtl-testing-bench-list.component';


@NgModule({
  declarations: [
    RmtlTestingBenchListComponent
  ],
  imports: [
    CommonModule,
    RmtlTestingBenchListRoutingModule
  ]
})
export class RmtlTestingBenchListModule { }
