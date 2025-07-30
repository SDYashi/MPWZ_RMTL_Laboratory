import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlAddTestreportComponent } from './rmtl-add-testreport/rmtl-add-testreport.component';

const routes: Routes = [
  {path:'',component:RmtlAddTestreportComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlAddTestreportRoutingModule { }
