import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlAddTestingBenchComponent } from './rmtl-add-testing-bench/rmtl-add-testing-bench.component';

const routes: Routes = [
  {path:'',component:RmtlAddTestingBenchComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlAddTestingBenchRoutingModule { }
