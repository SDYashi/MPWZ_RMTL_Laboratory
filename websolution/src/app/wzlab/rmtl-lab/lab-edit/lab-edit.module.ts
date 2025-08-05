import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LabEditRoutingModule } from './lab-edit-routing.module';
import { LabEditComponent } from './lab-edit/lab-edit.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    LabEditComponent
  ],
  imports: [
    CommonModule,
    LabEditRoutingModule,
    FormsModule,
    ReactiveFormsModule,
  ]
})
export class LabEditModule { }
