import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlViewDevicesRoutingModule } from './rmtl-view-devices-routing.module';
import { RmtlViewDevicesComponent } from './rmtl-view-devices/rmtl-view-devices.component';


@NgModule({
  declarations: [
    RmtlViewDevicesComponent
  ],
  imports: [
    CommonModule,
    RmtlViewDevicesRoutingModule
  ]
})
export class RmtlViewDevicesModule { }
