import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlAssignedListRoutingModule } from './rmtl-assigned-list-routing.module';
import { RmtlAssignedListComponent } from './rmtl-assigned-list/rmtl-assigned-list.component';


@NgModule({
  declarations: [
    RmtlAssignedListComponent
  ],
  imports: [
    CommonModule,
    RmtlAssignedListRoutingModule
  ]
})
export class RmtlAssignedListModule { }
