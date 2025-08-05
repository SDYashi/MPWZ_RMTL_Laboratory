import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlEditTestingBenchComponent } from './rmtl-edit-testing-bench/rmtl-edit-testing-bench.component';

const routes: Routes = [
  {path:'',component:RmtlEditTestingBenchComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlEditTestingBenchRoutingModule { }
