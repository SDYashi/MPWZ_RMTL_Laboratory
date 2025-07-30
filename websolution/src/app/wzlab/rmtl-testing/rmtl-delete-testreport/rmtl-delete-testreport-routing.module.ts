import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlDeleteTestreportComponent } from './rmtl-delete-testreport/rmtl-delete-testreport.component';

const routes: Routes = [
  {path:'',component:RmtlDeleteTestreportComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlDeleteTestreportRoutingModule { }
