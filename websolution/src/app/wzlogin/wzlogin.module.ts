import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WzloginRoutingModule } from './wzlogin-routing.module';
import { WzloginComponent } from './wzlogin/wzlogin.component';


@NgModule({
  declarations: [
    WzloginComponent
  ],
  imports: [
    CommonModule,
    WzloginRoutingModule
  ]
})
export class WzloginModule { }
