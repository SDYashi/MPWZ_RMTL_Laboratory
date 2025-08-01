import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-wzlogin',
  templateUrl: './wzlogin.component.html',
  styleUrls: ['./wzlogin.component.css']
})
export class WzloginComponent {
  model = {
    username: '',
    password: '',
    remember: false
  };
  showPassword = false;
  isLoading = false;

  constructor(private apiservice: ApiServicesService, private router: Router) {}

 onLogin(form: NgForm): void {
  if (form.valid) {
    this.isLoading = true;
    const { username, password } = this.model;
    this.apiservice.getlogin(username, password).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        localStorage.setItem('access_token', response.access_token);  // use access_token
        this.isLoading = false;
        this.router.navigate(['/wzlab/dashboard']);
      },
      error: (error) => {
        console.error('Login failed:', error);
        this.isLoading = false;
      }
    });
  }
}


  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
