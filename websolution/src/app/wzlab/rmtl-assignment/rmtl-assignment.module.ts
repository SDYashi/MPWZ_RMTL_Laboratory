import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlAssignmentRoutingModule } from './rmtl-assignment-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RmtlAssignedDashboardComponent } from './rmtl-assigned-dashboard/rmtl-assigned-dashboard.component';


@NgModule({
  declarations: [
    RmtlAssignedDashboardComponent
  ],
  imports: [
    CommonModule,
    RmtlAssignmentRoutingModule,
    FormsModule,
    ReactiveFormsModule,
  ]
})
export class RmtlAssignmentModule { }
