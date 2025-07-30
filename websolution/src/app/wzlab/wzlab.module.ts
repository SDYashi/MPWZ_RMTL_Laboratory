import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WzlabRoutingModule } from './wzlab-routing.module';
import { RmtlDashboardComponent } from './rmtl-dashboard/rmtl-dashboard.component';
import { WzlabhomeComponent } from './wzlabhome.component';


@NgModule({
  declarations: [
    RmtlDashboardComponent,
    WzlabhomeComponent
  ],
  imports: [
    CommonModule,
    WzlabRoutingModule
  ]
})
export class WzlabModule { }
