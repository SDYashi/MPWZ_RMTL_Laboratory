import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
 {path:'',redirectTo:'/wzlab',pathMatch:'full'},
 {path:'wzlab',loadChildren:()=>import('./features/wzlab/wzlab.module').then(m=>m.WzlabModule)},
//  {path:'users',loadChildren:()=>import('./features/users/users.module').then(m=>m.UsersModule)},
//  {path:'meters',loadChildren:()=>import('./features/meters/meters.module').then(m=>m.MetersModule)},
//  {path:'lab-store',loadChildren:()=>import('./features/lab-store/lab-store.module').then(m=>m.LabStoreModule)},
//  {path:'testingbench',loadChildren:()=>import('./features/testingbench/testingbench.module').then(m=>m.TestingbenchModule)},


];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
