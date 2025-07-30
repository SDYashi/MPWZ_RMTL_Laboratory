import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {path:'',redirectTo:'view-bench-list',pathMatch:'full'},
  {path:'view-bench-list',loadChildren:()=>import('./rmtl-testing-bench-list/rmtl-testing-bench-list.module').then(m=>m.RmtlTestingBenchListModule)},
  {path:'add-bench',loadChildren:()=>import('./rmtl-add-testing-bench/rmtl-add-testing-bench.module').then(m=>m.RmtlAddTestingBenchModule)},
  {path:'delete-bench',loadChildren:()=>import('./rmtl-delete-bench/rmtl-delete-bench.module').then(m=>m.RmtlDeleteBenchModule)},
  {path:'configure-bench',loadChildren:()=>import('./rmtl-configure-benchfor-testing/rmtl-configure-benchfor-testing.module').then(m=>m.RmtlConfigureBenchforTestingModule)},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlTestingBenchRoutingModule { }
