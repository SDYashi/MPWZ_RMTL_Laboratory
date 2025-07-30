import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlConfigureBenchforTestingComponent } from './rmtl-configure-benchfor-testing/rmtl-configure-benchfor-testing.component';

const routes: Routes = [
    {path:'',component:RmtlConfigureBenchforTestingComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlConfigureBenchforTestingRoutingModule { }
