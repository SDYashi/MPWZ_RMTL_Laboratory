import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlAdminAddenumsComponent } from './rmtl-admin-addenums/rmtl-admin-addenums.component';
import { RmtlAdminListenumsComponent } from './rmtl-admin-listenums/rmtl-admin-listenums.component';

const routes: Routes = [
  {path:'',redirectTo:'add-enums',pathMatch:'full'},
  { path: 'add-enums', component: RmtlAdminAddenumsComponent},
  { path: 'list-enums', component: RmtlAdminListenumsComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlAdminAddenumsRoutingModule { }
