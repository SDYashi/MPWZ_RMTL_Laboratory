import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
// import { AuthInterceptorInterceptor } from './core/auth-interceptor.interceptor';
import { FileSizePipe } from './core/files.pipe';
import { FormsModule } from '@angular/forms';
import { AuthInterceptor } from './core/auth-interceptor.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    FileSizePipe,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule, 
    HttpClientModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }


  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
