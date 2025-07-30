import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LabViewListComponent } from './lab-view-list/lab-view-list.component';

const routes: Routes = [
    {path:'', component: LabViewListComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LabViewListRoutingModule { }
