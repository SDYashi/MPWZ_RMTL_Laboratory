import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlAdminAddenumsRoutingModule } from './rmtl-admin-addenums-routing.module';
import { RmtlAdminAddenumsComponent } from './rmtl-admin-addenums/rmtl-admin-addenums.component';
import { RmtlAdminListenumsComponent } from './rmtl-admin-listenums/rmtl-admin-listenums.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlAdminAddenumsComponent,
    RmtlAdminListenumsComponent
  ],
  imports: [
    CommonModule,
    RmtlAdminAddenumsRoutingModule,
    FormsModule,
  
  ]
})
export class RmtlAdminAddenumsModule { }
