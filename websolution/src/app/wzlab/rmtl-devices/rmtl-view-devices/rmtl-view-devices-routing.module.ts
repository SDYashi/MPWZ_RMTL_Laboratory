import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlViewDevicesComponent } from './rmtl-view-devices/rmtl-view-devices.component';

const routes: Routes = [
  {path:'',component:RmtlViewDevicesComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlViewDevicesRoutingModule { }
