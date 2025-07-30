import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LabCreateComponent } from './lab-create/lab-create.component';

const routes: Routes = [
  {path:'', component: LabCreateComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LabCreateRoutingModule { }
