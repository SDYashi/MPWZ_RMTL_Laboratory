import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlEditAssigmentRoutingModule } from './rmtl-edit-assigment-routing.module';
import { RmtlEditAssigmentComponent } from './rmtl-edit-assigment/rmtl-edit-assigment.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlEditAssigmentComponent
  ],
  imports: [
    CommonModule,
    RmtlEditAssigmentRoutingModule,
    FormsModule
  ]
})
export class RmtlEditAssigmentModule { }
