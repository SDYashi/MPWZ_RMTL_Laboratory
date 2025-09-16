import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlWelcomeComponent } from './rmtl-welcome/rmtl-welcome.component';

const routes: Routes = [
  {path:'',component:RmtlWelcomeComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlWelcomeRoutingModule { }
