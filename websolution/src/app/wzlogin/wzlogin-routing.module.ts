import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WzloginComponent } from './wzlogin/wzlogin.component';

const routes: Routes = [
   {path:'',component:WzloginComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WzloginRoutingModule { }
