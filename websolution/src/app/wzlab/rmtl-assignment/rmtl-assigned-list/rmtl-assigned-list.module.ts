import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlAssignedListRoutingModule } from './rmtl-assigned-list-routing.module';
import { RmtlAssignedListComponent } from './rmtl-assigned-list/rmtl-assigned-list.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlAssignedListComponent
  ],
  imports: [
    CommonModule,
    RmtlAssignedListRoutingModule,
    FormsModule
  ]
})
export class RmtlAssignedListModule { }
