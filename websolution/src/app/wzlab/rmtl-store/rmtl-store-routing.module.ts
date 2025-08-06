import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlStoreViewListComponent } from './rmtl-store-view-list/rmtl-store-view-list.component';
import { RmtlStoreEditComponent } from './rmtl-store-edit/rmtl-store-edit.component';
import { RmtlAddStoreComponent } from './rmtl-add-store/rmtl-add-store.component';

const routes: Routes = [
  {path:'',redirectTo:'view-store-list',pathMatch:'full'},
  {path:'view-store-list',component:RmtlStoreViewListComponent},
  {path:'add-store',component:RmtlAddStoreComponent},
  {path:'edit-store/:id',component:RmtlStoreEditComponent},

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlStoreRoutingModule { }
