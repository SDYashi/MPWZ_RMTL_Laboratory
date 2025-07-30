import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-wzlogin',
  templateUrl: './wzlogin.component.html',
  styleUrls: ['./wzlogin.component.css']
})
export class WzloginComponent implements OnInit {
  loginForm!: FormGroup;

  constructor(private fb: FormBuilder,private router: Router) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  // Optional: Getter for cleaner template
  get username() {
    return this.loginForm.get('username');
  }

  get password() {
    return this.loginForm.get('password');
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      // const { username, password } = this.loginForm.value;
      this.router.navigate(['/wzlab/wzlabhome']);
      // console.log('Login:', username, password);
    } else {
      this.loginForm.markAllAsTouched(); 
    }
  }
}
