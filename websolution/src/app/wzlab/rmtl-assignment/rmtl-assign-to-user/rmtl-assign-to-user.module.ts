import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlAssignToUserRoutingModule } from './rmtl-assign-to-user-routing.module';
import { RmtlAssignToUserComponent } from './rmtl-assign-to-user/rmtl-assign-to-user.component';


@NgModule({
  declarations: [
    RmtlAssignToUserComponent
  ],
  imports: [
    CommonModule,
    RmtlAssignToUserRoutingModule
  ]
})
export class RmtlAssignToUserModule { }
