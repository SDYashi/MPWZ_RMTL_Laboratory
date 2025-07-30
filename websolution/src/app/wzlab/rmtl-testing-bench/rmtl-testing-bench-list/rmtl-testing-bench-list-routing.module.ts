import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlTestingBenchListComponent } from './rmtl-testing-bench-list/rmtl-testing-bench-list.component';

const routes: Routes = [
    {path:'',component:RmtlTestingBenchListComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlTestingBenchListRoutingModule { }
