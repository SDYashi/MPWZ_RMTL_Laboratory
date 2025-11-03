import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
// import { AuthInterceptorInterceptor } from './core/auth-interceptor.interceptor';
import { FileSizePipe } from './core/files.pipe';
import { FormsModule } from '@angular/forms';
import { AuthInterceptor } from './core/auth-interceptor.interceptor';
import { LoadingInterceptor } from './core/loading.interceptor';
import { LoaderComponent } from './shared/loader/loader.component';
import { AuthService } from './core/auth.service';
import { BarcodeListenerDirective } from './shared/directives/barcode-listener.directive';

// export function appInitFactory(auth: AuthService) {
//   return () => auth.loadCurrentUser(); // must return Promise
// }
@NgModule({
  declarations: [
    AppComponent,
    FileSizePipe,
    LoaderComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule, 
    HttpClientModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor,  multi: true  },
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true },
    // { provide: APP_INITIALIZER, useFactory: appInitFactory,  deps: [AuthService],  multi: true  }
  


  ],
  bootstrap: [AppComponent]
})
export class AppModule { 
  
}
