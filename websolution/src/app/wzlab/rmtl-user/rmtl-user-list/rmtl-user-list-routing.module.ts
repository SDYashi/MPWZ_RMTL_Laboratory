import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlUserListComponent } from './rmtl-user-list/rmtl-user-list.component';

const routes: Routes = [
  {path:'',component:RmtlUserListComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlUserListRoutingModule { }
