import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlEditUserComponent } from './rmtl-edit-user/rmtl-edit-user.component';

const routes: Routes = [
  {path:'',component:RmtlEditUserComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlEditUserRoutingModule { }
