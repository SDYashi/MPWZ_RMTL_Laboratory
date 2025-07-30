import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
 {path:'',redirectTo:'/wzlogin',pathMatch:'full'},
 {path:'wzlogin',loadChildren:()=>import('../app/wzlogin/wzlogin.module').then(m=>m.WzloginModule)},
 {path:'**',redirectTo:'wzlogin',pathMatch:'full'},

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
