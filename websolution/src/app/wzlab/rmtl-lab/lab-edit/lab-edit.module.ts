import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LabEditRoutingModule } from './lab-edit-routing.module';
import { LabEditComponent } from './lab-edit/lab-edit.component';


@NgModule({
  declarations: [
    LabEditComponent
  ],
  imports: [
    CommonModule,
    LabEditRoutingModule
  ]
})
export class LabEditModule { }
