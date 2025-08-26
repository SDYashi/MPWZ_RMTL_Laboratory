import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlTestreportPendingComponent } from './rmtl-testreport-pending/rmtl-testreport-pending.component';

const routes: Routes = [
  {path:'', component: RmtlTestreportPendingComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlTestreportPendingRoutingModule { }
