import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WzloginRoutingModule } from './wzlogin-routing.module';
import { WzloginComponent } from './wzlogin/wzlogin.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    WzloginComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    WzloginRoutingModule,
    ReactiveFormsModule,
  ]
})
export class WzloginModule { }
