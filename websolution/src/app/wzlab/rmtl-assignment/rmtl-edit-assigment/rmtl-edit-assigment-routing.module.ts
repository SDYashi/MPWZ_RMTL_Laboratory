import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlEditAssigmentComponent } from './rmtl-edit-assigment/rmtl-edit-assigment.component';

const routes: Routes = [
  {path:'', component:RmtlEditAssigmentComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlEditAssigmentRoutingModule { }
