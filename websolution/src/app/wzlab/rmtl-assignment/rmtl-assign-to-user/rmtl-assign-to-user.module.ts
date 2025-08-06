import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlAssignToUserRoutingModule } from './rmtl-assign-to-user-routing.module';
import { RmtlAssignToUserComponent } from './rmtl-assign-to-user/rmtl-assign-to-user.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlAssignToUserComponent
  ],
  imports: [
    CommonModule,
    RmtlAssignToUserRoutingModule,
    FormsModule
  ]
})
export class RmtlAssignToUserModule { }
