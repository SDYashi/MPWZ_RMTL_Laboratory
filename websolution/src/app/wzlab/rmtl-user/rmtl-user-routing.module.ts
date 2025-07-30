import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {path:'',redirectTo:'user-list',pathMatch:'full'},
  {path:'user-list',loadChildren:()=>import('./rmtl-user-list/rmtl-user-list.module').then(m=>m.RmtlUserListModule)},
  {path:'create-user',loadChildren:()=>import('./rmtl-create-user/rmtl-create-user.module').then(m=>m.RmtlCreateUserModule)},
  {path:'edit-user',loadChildren:()=>import('./rmtl-edit-user/rmtl-edit-user.module').then(m=>m.RmtlEditUserModule)},
  {path:'user-access',loadChildren:()=>import('./rmtl-user-acess/rmtl-user-acess.module').then(m=>m.RmtlUserAcessModule)},
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlUserRoutingModule { }
