import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth.service';

@Component({
  selector: 'app-wzlogin',
  templateUrl: './wzlogin.component.html',
  styleUrls: ['./wzlogin.component.css']
})
export class WzloginComponent implements OnInit {
  
loginForm: FormGroup;
  showPassword = false;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    // private toastr: ToastrService
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      remember: [false]
    });
  }

  ngOnInit(): void {
    // Check for remembered credentials
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    if (rememberedUsername) {
      this.loginForm.patchValue({
        username: rememberedUsername,
        remember: true
      });
    }
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.router.navigate(['/wzlab/rmtlhome']);
    this.isLoading = true;
    const { username, password, remember } = this.loginForm.value;

    // Handle remember me functionality
    if (remember) {
      localStorage.setItem('rememberedUsername', username);
    } else {
      localStorage.removeItem('rememberedUsername');
    }
   

    // this.authService.login(username, password).subscribe({
    //   next: (response) => {
    //     this.isLoading = false;
    //     this.toastr.success('Login successful!', 'Welcome');
    //     this.router.navigate(['/dashboard']);
    //   },
    //   error: (error) => {
    //     this.isLoading = false;
    //     this.toastr.error('Invalid username or password', 'Login Failed');
    //   }
    // });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
    const passwordField = document.getElementById('password') as HTMLInputElement;
    passwordField.type = this.showPassword ? 'text' : 'password';
  }

  forgotPassword(): void {
    // this.toastr.info('Password reset functionality coming soon!', 'Info');
    // Implement password reset logic here
  }

  register(): void {
    this.router.navigate(['/register']);
  }
}
