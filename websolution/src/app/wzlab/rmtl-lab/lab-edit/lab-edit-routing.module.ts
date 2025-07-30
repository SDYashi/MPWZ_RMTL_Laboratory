import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LabEditComponent } from './lab-edit/lab-edit.component';

const routes: Routes = [
    {path:'', component: LabEditComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LabEditRoutingModule { }
