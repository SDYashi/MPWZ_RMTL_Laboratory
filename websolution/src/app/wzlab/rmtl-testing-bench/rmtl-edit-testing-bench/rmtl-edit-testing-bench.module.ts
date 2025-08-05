import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlEditTestingBenchRoutingModule } from './rmtl-edit-testing-bench-routing.module';
import { RmtlEditTestingBenchComponent } from './rmtl-edit-testing-bench/rmtl-edit-testing-bench.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlEditTestingBenchComponent
  ],
  imports: [
    CommonModule,
    RmtlEditTestingBenchRoutingModule,
    FormsModule,
  ]
})
export class RmtlEditTestingBenchModule { }
