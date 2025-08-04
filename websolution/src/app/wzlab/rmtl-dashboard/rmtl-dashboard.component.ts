import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-rmtl-dashboard',
  templateUrl: './rmtl-dashboard.component.html',
  styleUrls: ['./rmtl-dashboard.component.css']
})
export class RmtlDashboardComponent {
 currentUser: any | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // If you save user in localStorage after login:
    // localStorage.setItem('current_user', JSON.stringify(user));
    const raw = localStorage.getItem('current_user');
    if (raw) {
      try {
        this.currentUser = JSON.parse(raw);
      } catch {
        this.currentUser = null;
      }
    }
  }

  onLogout(): void {
    // clear auth artifacts
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    // navigate to login
    this.router.navigate(['/wzlogin']);
  }
}
