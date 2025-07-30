import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlAssignToUserComponent } from './rmtl-assign-to-user/rmtl-assign-to-user.component';

const routes: Routes = [
  {path:'',component:RmtlAssignToUserComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlAssignToUserRoutingModule { }
