import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlAddTestreportRoutingModule } from './rmtl-add-testreport-routing.module';
import { FormsModule } from '@angular/forms';
import { RmtlAddTestreportStopdefectiveComponent } from './rmtl-add-testreport-stopdefective/rmtl-add-testreport-stopdefective.component';
import { RmtlAddTestreportContestedComponent } from './rmtl-add-testreport-contested/rmtl-add-testreport-contested.component';
import { RmtlAddTestreportP4onmComponent } from './rmtl-add-testreport-p4onm/rmtl-add-testreport-p4onm.component';
import { RmtlAddTestreportP4vigComponent } from './rmtl-add-testreport-p4vig/rmtl-add-testreport-p4vig.component';
import { RmtlAddTestreportSolarnetmeerComponent } from './rmtl-add-testreport-solarnetmeer/rmtl-add-testreport-solarnetmeer.component';
import { RmtlAddTestreportSolargeneatormeterComponent } from './rmtl-add-testreport-solargeneatormeter/rmtl-add-testreport-solargeneatormeter.component';
import { RmtlAddTestreportCttestingComponent } from './rmtl-add-testreport-cttesting/rmtl-add-testreport-cttesting.component';
import { RmtlAddTestreportSmartagainstmtrComponent } from './rmtl-add-testreport-smartagainstmtr/rmtl-add-testreport-smartagainstmtr.component';
import { RmtlAddTestreportOldagainstmtrComponent } from './rmtl-add-testreport-oldagainstmtr/rmtl-add-testreport-oldagainstmtr.component';


@NgModule({
  declarations: [
    RmtlAddTestreportStopdefectiveComponent,
    RmtlAddTestreportContestedComponent,
    RmtlAddTestreportP4onmComponent,
    RmtlAddTestreportP4vigComponent,
    RmtlAddTestreportSolarnetmeerComponent,
    RmtlAddTestreportSolargeneatormeterComponent,
    RmtlAddTestreportCttestingComponent,
    RmtlAddTestreportSmartagainstmtrComponent,
    RmtlAddTestreportOldagainstmtrComponent
  ],
  imports: [
    CommonModule,
    RmtlAddTestreportRoutingModule,
    FormsModule
  ]
})
export class RmtlAddTestreportModule { }
