import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlUserListRoutingModule } from './rmtl-user-list-routing.module';
import { RmtlUserListComponent } from './rmtl-user-list/rmtl-user-list.component';


@NgModule({
  declarations: [
    RmtlUserListComponent
  ],
  imports: [
    CommonModule,
    RmtlUserListRoutingModule
  ]
})
export class RmtlUserListModule { }
