import { Component, HostListener, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-wzlabhome',
  templateUrl: './wzlabhome.component.html',
  styleUrls: ['./wzlabhome.component.css']
})
export class WzlabhomeComponent implements OnInit {
  currentUrl = '';
  currentUser: string | null = null;

  sidebarCollapsed = false;
  screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;

  userManagementExpanded = false;
  analyticsExpanded = false;
  settingsExpanded = false;

  constructor(private router: Router) {
    // set early so first CD sees a stable value
    this.currentUrl = this.router.url.replace('/', '');
  }

  ngOnInit(): void {
  

    // set currentUser BEFORE first check to avoid ExpressionChanged
    const token = localStorage.getItem('access_token'); // <-- use the same key everywhere
    this.currentUser = token ? this.getUserFromToken(token) : null;

    this.checkScreenSize();
  }

  // moved out of ngAfterViewInit; you can remove that hook entirely
  private getUserFromToken(token: string): string | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // adjust if your claim is different, e.g., payload.username or payload.name
      return payload?.sub ?? null;
    } catch {
      return null;
    }
  }

  isRouteActive(paths: string[]): boolean {
    return paths.some(path => this.router.url.startsWith(path));
  }

  @HostListener('window:resize')
  onResize() {
    this.screenWidth = typeof window !== 'undefined' ? window.innerWidth : this.screenWidth;
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
    // use the same storage key as above
    localStorage.removeItem('access_token');
    this.router.navigate(['/wzlogin']);
  }
}
