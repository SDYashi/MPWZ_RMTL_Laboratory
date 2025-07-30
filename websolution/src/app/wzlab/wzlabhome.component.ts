import { Component, EventEmitter, HostListener, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-wzlabhome',
  templateUrl: './wzlabhome.component.html',
  styleUrls: ['./wzlabhome.component.css']
})
export class WzlabhomeComponent implements OnInit {
  userManagementExpanded = false;
  analyticsExpanded = false;
  settingsExpanded = false;
  sidebarCollapsed = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.checkScreenSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  checkScreenSize() {
    if (window.innerWidth < 992) {
      this.sidebarCollapsed = true;
    } else {
      this.sidebarCollapsed = false;
    }
  }

  toggleUserManagement() {
    this.userManagementExpanded = !this.userManagementExpanded;
  }

  toggleAnalytics() {
    this.analyticsExpanded = !this.analyticsExpanded;
  }

  toggleSettings() {
    this.settingsExpanded = !this.settingsExpanded;
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout() {
    // Implement logout logic here
    this.router.navigate(['/login']);
  }
}
