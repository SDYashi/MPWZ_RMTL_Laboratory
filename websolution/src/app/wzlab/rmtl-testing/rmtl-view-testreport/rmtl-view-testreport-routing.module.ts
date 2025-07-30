import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlViewTestreportComponent } from './rmtl-view-testreport/rmtl-view-testreport.component';

const routes: Routes = [
  {path:'',component:RmtlViewTestreportComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlViewTestreportRoutingModule { }
