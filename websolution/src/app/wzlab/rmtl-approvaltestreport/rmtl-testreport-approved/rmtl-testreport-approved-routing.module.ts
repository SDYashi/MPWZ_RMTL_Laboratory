import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlTestreportApprovedComponent } from './rmtl-testreport-approved/rmtl-testreport-approved.component';

const routes: Routes = [
  {path:'',component:RmtlTestreportApprovedComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlTestreportApprovedRoutingModule { }
