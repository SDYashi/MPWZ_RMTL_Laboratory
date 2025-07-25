import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlLoginComponent } from './rmtl-login/rmtl-login.component';
import { RmtlPasswordresetComponent } from './rmtl-passwordreset/rmtl-passwordreset.component';
import { RmtlUserprofileComponent } from './rmtl-userprofile/rmtl-userprofile.component';

const routes: Routes = [
 {path:'',redirectTo:'login',pathMatch:'full'},
 {path:'login',component:RmtlLoginComponent},
 {path:'userprofile',component:RmtlUserprofileComponent},
 {path:'passwordreset',component:RmtlPasswordresetComponent},

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UsersRoutingModule { }
