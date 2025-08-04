import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlUserprofileComponent } from './rmtl-userprofile/rmtl-userprofile.component';

const routes: Routes = [
  {path:'',component:RmtlUserprofileComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlUserprofileRoutingModule { }
