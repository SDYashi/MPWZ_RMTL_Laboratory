import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-wzlogin',
  templateUrl: './wzlogin.component.html',
  styleUrls: ['./wzlogin.component.css']
})
export class WzloginComponent implements OnInit {
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }
   username: string = '';
  password: string = '';

  onLogin() {
    console.log('Username:', this.username);
    console.log('Password:', this.password);
    // Implement authentication logic here
  }
}
