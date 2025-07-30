import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LabCreateRoutingModule } from './lab-create-routing.module';
import { LabCreateComponent } from './lab-create/lab-create.component';


@NgModule({
  declarations: [
    LabCreateComponent
  ],
  imports: [
    CommonModule,
    LabCreateRoutingModule
  ]
})
export class LabCreateModule { }
