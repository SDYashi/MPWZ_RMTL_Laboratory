import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
 {path:'',redirectTo:'/wzlab',pathMatch:'full'},
 {path:'wzlab',loadChildren:()=>import('./wzlab/wzlab.module').then(m=>m.WzlabModule)},


];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
