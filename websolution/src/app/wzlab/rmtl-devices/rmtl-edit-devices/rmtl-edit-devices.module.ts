import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlEditDevicesRoutingModule } from './rmtl-edit-devices-routing.module';
import { RmtlEditDevicesComponent } from './rmtl-edit-devices/rmtl-edit-devices.component';


@NgModule({
  declarations: [
    RmtlEditDevicesComponent
  ],
  imports: [
    CommonModule,
    RmtlEditDevicesRoutingModule
  ]
})
export class RmtlEditDevicesModule { }
