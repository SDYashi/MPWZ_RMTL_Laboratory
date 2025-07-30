import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlGatepassEditComponent } from './rmtl-gatepass-edit/rmtl-gatepass-edit.component';

const routes: Routes = [
    {path:'',component:RmtlGatepassEditComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlGatepassEditRoutingModule { }
