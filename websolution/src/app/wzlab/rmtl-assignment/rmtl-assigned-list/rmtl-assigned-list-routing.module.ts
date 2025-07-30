import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlAssignedListComponent } from './rmtl-assigned-list/rmtl-assigned-list.component';

const routes: Routes = [
  {path:'',component:RmtlAssignedListComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlAssignedListRoutingModule { }
