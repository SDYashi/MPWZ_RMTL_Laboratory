import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RmtlWelcomeRoutingModule } from './rmtl-welcome-routing.module';
import { RmtlWelcomeComponent } from './rmtl-welcome/rmtl-welcome.component';


@NgModule({
  declarations: [
    RmtlWelcomeComponent
  ],
  imports: [
    CommonModule,
    RmtlWelcomeRoutingModule
  ]
})
export class RmtlWelcomeModule { }
