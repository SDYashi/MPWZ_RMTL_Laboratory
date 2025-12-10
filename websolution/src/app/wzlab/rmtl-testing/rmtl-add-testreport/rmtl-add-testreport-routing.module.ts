import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmtlAddTestreportStopdefectiveComponent } from './rmtl-add-testreport-stopdefective/rmtl-add-testreport-stopdefective.component';
import { RmtlAddTestreportContestedComponent } from './rmtl-add-testreport-contested/rmtl-add-testreport-contested.component';
import { RmtlAddTestreportP4onmComponent } from './rmtl-add-testreport-p4onm/rmtl-add-testreport-p4onm.component';
import { RmtlAddTestreportP4vigComponent } from './rmtl-add-testreport-p4vig/rmtl-add-testreport-p4vig.component';
import { RmtlAddTestreportSolarnetmeerComponent } from './rmtl-add-testreport-solarnetmeer/rmtl-add-testreport-solarnetmeer.component';
import { RmtlAddTestreportSolargeneatormeterComponent } from './rmtl-add-testreport-solargeneatormeter/rmtl-add-testreport-solargeneatormeter.component';
import { RmtlAddTestreportCttestingComponent } from './rmtl-add-testreport-cttesting/rmtl-add-testreport-cttesting.component';
import { RmtlAddTestreportSmartagainstmtrComponent } from './rmtl-add-testreport-smartagainstmtr/rmtl-add-testreport-smartagainstmtr.component';
import { RmtlAddTestreportOldagainstmtrComponent } from './rmtl-add-testreport-oldagainstmtr/rmtl-add-testreport-oldagainstmtr.component';
import { RmtlAddTestreportNewmeterComponent } from './rmtl-add-testreport-newmeter/rmtl-add-testreport-newmeter.component';
import { RmtlAddTestreportSamplemeterComponent } from './rmtl-add-testreport-samplemeter/rmtl-add-testreport-samplemeter.component';
import { RmtlAddTestreportPqmeterComponent } from './rmtl-add-testreport-pqmeter/rmtl-add-testreport-pqmeter.component';

const routes: Routes = [
  {path:'',redirectTo:'stop-defective-testing',pathMatch:'full'},
  {path:'new-meter-testing',component:RmtlAddTestreportNewmeterComponent},
  {path:'sample-meter-testing',component:RmtlAddTestreportSamplemeterComponent},
  {path:'pq-meter-testing',component:RmtlAddTestreportPqmeterComponent},
  {path:'stop-defective-testing',component:RmtlAddTestreportStopdefectiveComponent},
  {path:'smart-against-defective-testing',component:RmtlAddTestreportSmartagainstmtrComponent},
  {path:'old-against-defective-testing',component:RmtlAddTestreportOldagainstmtrComponent},
  {path:'contested-testing',component:RmtlAddTestreportContestedComponent},
  {path:'p4onm-testing',component:RmtlAddTestreportP4onmComponent},
  {path:'p4vig-testing',component:RmtlAddTestreportP4vigComponent},
  {path:'solarnetmeter-testing',component:RmtlAddTestreportSolarnetmeerComponent},
  {path:'solargenratormeter-testing',component:RmtlAddTestreportSolargeneatormeterComponent},
  {path:'ct-testing',component:RmtlAddTestreportCttestingComponent},  
  {path:'**',redirectTo:'stop-defective-testing'}

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmtlAddTestreportRoutingModule { }
