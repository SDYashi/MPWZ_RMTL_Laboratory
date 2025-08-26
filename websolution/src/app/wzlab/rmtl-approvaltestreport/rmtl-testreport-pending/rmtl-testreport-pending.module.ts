import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RmtlTestreportPendingRoutingModule } from './rmtl-testreport-pending-routing.module';
import { RmtlTestreportPendingComponent } from './rmtl-testreport-pending/rmtl-testreport-pending.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    RmtlTestreportPendingComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RmtlTestreportPendingRoutingModule,
 
  ]
})
export class RmtlTestreportPendingModule { }
