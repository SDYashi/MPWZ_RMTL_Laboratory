import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {path:'',redirectTo:'view-bench-list',pathMatch:'full'},
  {path:'view-bench-list',loadChildren:()=>import('./rmtl-testing-bench-list/rmtl-testing-bench-list.module').then(m=>m.RmtlTestingBenchListModule)},
  {path:'add-bench',loadChildren:()=>import('./rmtl-add-testing-bench/rmtl-add-testing-bench.module').then(m=>m.RmtlAddTestingBenchModule)},
  {path:'edit-bench/:id',loadChildren:()=>import('./rmtl-edit-testing-bench/rmtl-edit-testing-bench.module').then(m=>m.RmtlEditTestingBenchModule)},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlTestingBenchRoutingModule { }
