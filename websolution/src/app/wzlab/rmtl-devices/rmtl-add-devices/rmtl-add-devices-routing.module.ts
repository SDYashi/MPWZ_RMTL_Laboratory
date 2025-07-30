import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlAddDevicesComponent } from './rmtl-add-devices/rmtl-add-devices.component';

const routes: Routes = [
  {path:'',component:RmtlAddDevicesComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlAddDevicesRoutingModule { }
