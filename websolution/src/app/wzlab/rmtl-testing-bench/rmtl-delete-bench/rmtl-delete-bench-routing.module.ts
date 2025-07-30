import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlDeleteBenchComponent } from './rmtl-delete-bench/rmtl-delete-bench.component';

const routes: Routes = [
  {path:'',component:RmtlDeleteBenchComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlDeleteBenchRoutingModule { }
