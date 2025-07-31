import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-wzlabhome',
  templateUrl: './wzlabhome.component.html',
  styleUrls: ['./wzlabhome.component.css']
})
export class WzlabhomeComponent implements OnInit {

  currentUrl = '';
  currentUser: any;
  sidebarCollapsed = false;
  screenWidth = window.innerWidth; // ✅ Add this

  userManagementExpanded = false;
  analyticsExpanded = false;
  settingsExpanded = false;

  

  constructor(private router: Router) {
    this.currentUrl = this.router.url.replace('/', '');
  }

  ngOnInit(): void {
    this.checkScreenSize();
  }

  ngAfterViewInit(): void {
    const token = localStorage.getItem('token');
    if (token) {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      this.currentUser = tokenData.sub;
    }
  }

  isRouteActive(paths: string[]): boolean {
    return paths.some(path => this.router.url.startsWith(path));
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.screenWidth = window.innerWidth; // ✅ Keep this updated
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.sidebarCollapsed = this.screenWidth < 992;
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
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



  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/wzlogin']);
  }
}
