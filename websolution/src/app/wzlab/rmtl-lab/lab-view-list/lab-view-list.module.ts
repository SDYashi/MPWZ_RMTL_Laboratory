import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LabViewListRoutingModule } from './lab-view-list-routing.module';
import { LabViewListComponent } from './lab-view-list/lab-view-list.component';
import { ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    LabViewListComponent
  ],
  imports: [
    CommonModule,
    LabViewListRoutingModule,
    ReactiveFormsModule,
  ]
})
export class LabViewListModule { }
