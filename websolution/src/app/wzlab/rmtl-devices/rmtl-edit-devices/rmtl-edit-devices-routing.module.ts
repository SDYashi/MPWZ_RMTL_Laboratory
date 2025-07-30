import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlEditDevicesComponent } from './rmtl-edit-devices/rmtl-edit-devices.component';

const routes: Routes = [
  {path:'',component:RmtlEditDevicesComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlEditDevicesRoutingModule { }
