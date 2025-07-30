import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlGatepassGenerateComponent } from './rmtl-gatepass-generate/rmtl-gatepass-generate.component';

const routes: Routes = [
    {path:'',component:RmtlGatepassGenerateComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlGatepassGenerateRoutingModule { }
