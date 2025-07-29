import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WzlabRoutingModule } from './wzlab-routing.module';
import { RmtlHomeComponent } from './rmtl-home/rmtl-home.component';
import { RmtlDashboardComponent } from './rmtl-dashboard/rmtl-dashboard.component';
import { RmtlLoginComponent } from './rmtl-login/rmtl-login.component';
import { RmtlUsersComponent } from './rmtl-users/rmtl-users.component';


@NgModule({
  declarations: [
    RmtlHomeComponent,
    RmtlDashboardComponent,
    RmtlLoginComponent,
    RmtlUsersComponent
  ],
  imports: [
    CommonModule,
    WzlabRoutingModule
  ]
})
export class WzlabModule { }
