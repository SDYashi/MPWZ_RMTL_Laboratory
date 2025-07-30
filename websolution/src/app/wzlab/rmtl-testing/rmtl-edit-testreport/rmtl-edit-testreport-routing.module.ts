import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlEditTestreportComponent } from './rmtl-edit-testreport/rmtl-edit-testreport.component';

const routes: Routes = [
  {path:'',component:RmtlEditTestreportComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlEditTestreportRoutingModule { }
