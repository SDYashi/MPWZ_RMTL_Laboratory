import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlStoreRoutingModule } from './rmtl-store-routing.module';
import { RmtlStoreViewListComponent } from './rmtl-store-view-list/rmtl-store-view-list.component';
import { FormsModule } from '@angular/forms';
import { RmtlStoreEditComponent } from './rmtl-store-edit/rmtl-store-edit.component';
import { RmtlAddStoreComponent } from './rmtl-add-store/rmtl-add-store.component';


@NgModule({
  declarations: [
    RmtlStoreViewListComponent,
    RmtlStoreEditComponent,
    RmtlAddStoreComponent,
  ],
  imports: [
    CommonModule,
    RmtlStoreRoutingModule,
    FormsModule
  ]
})
export class RmtlStoreModule { }
