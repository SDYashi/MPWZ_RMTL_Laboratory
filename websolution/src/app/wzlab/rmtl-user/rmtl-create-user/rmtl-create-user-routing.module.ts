import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlCreateUserComponent } from './rmtl-create-user/rmtl-create-user.component';

const routes: Routes = [
  {path:'',component:RmtlCreateUserComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlCreateUserRoutingModule { }
