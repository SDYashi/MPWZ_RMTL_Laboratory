import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlAddTestingBenchRoutingModule } from './rmtl-add-testing-bench-routing.module';
import { RmtlAddTestingBenchComponent } from './rmtl-add-testing-bench/rmtl-add-testing-bench.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlAddTestingBenchComponent
  ],
  imports: [
    CommonModule,
    RmtlAddTestingBenchRoutingModule,
    FormsModule
  ]
})
export class RmtlAddTestingBenchModule { }
