import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlUserAcessComponent } from './rmtl-user-acess/rmtl-user-acess.component';

const routes: Routes = [
  {path:'',component:RmtlUserAcessComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlUserAcessRoutingModule { }
