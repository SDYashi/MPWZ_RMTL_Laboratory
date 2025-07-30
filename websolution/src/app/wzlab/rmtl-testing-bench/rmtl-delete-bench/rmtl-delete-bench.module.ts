import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlDeleteBenchRoutingModule } from './rmtl-delete-bench-routing.module';
import { RmtlDeleteBenchComponent } from './rmtl-delete-bench/rmtl-delete-bench.component';


@NgModule({
  declarations: [
    RmtlDeleteBenchComponent
  ],
  imports: [
    CommonModule,
    RmtlDeleteBenchRoutingModule
  ]
})
export class RmtlDeleteBenchModule { }
