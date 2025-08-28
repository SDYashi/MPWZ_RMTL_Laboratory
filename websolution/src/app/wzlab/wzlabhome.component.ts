// src/app/wzlabhome/wzlabhome.component.ts
import { Component, HostListener, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { filter } from 'rxjs/operators';

type SectionKey =
  | 'LABManagement'
  | 'userManagement'
  | 'benchManagement'
  | 'vendorManagement'
  | 'storeManagement'
  | 'userAssignments'
  | 'receivedDispatch'
  | 'testingActivities'
  | 'usageAnalytics'
  | 'approvalMenu';

@Component({
  selector: 'app-wzlabhome',
  templateUrl: './wzlabhome.component.html',
  styleUrls: ['./wzlabhome.component.css']
})
export class WzlabhomeComponent implements OnInit {
  currentUrl = '';
  currentUser: string | null = null;

  // Layout
  sidebarCollapsed = false;
  screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;

  sections: Record<SectionKey, boolean> = {
    LABManagement: false,
    userManagement: false,
    benchManagement: false,
    vendorManagement: false,
    storeManagement: false,
    userAssignments: false,
    receivedDispatch: false,
    testingActivities: false,
    usageAnalytics: false,
    approvalMenu: false,
  };

  private sectionRouteMap: Array<{ key: SectionKey; prefixes: string[] }> = [
    { key: 'LABManagement',      prefixes: ['/wzlab/testing-laboratory'] },
    { key: 'userManagement',     prefixes: ['/wzlab/user'] },
    { key: 'benchManagement',    prefixes: ['/wzlab/testing-bench'] },
    { key: 'vendorManagement',   prefixes: ['/wzlab/vendor', '/wzlab/supply-vendors'] },
    { key: 'storeManagement',    prefixes: ['/wzlab/store'] },
    { key: 'userAssignments',    prefixes: ['/wzlab/assignement'] },
    { key: 'receivedDispatch',   prefixes: ['/wzlab/devices', '/wzlab/getpass'] },
    { key: 'testingActivities',  prefixes: ['/wzlab/testing'] },
    { key: 'usageAnalytics',     prefixes: ['/wzlab/reports'] },
    { key: 'approvalMenu',       prefixes: ['/wzlab/approval'] },
  ];

  constructor(private router: Router, public authService: AuthService) {
    this.currentUrl = this.router.url.replace('/', '');
  }

  ngOnInit(): void {
    const token = localStorage.getItem('access_token');
    this.currentUser = token ? this.getUserFromToken(token) : null;
    this.checkScreenSize();

    const user = this.authService.getuserfromtoken();
    const userId = user?.id ?? null;
    const labId = user?.lab_id ?? null;
    localStorage.setItem('currentUserId', userId?.toString() ?? '');
    localStorage.setItem('currentLabId', labId?.toString() ?? '');

    this.syncOpenSectionWithRoute();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.syncOpenSectionWithRoute());
  }

  private getUserFromToken(token: string): string | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.sub ?? payload?.username ?? payload?.name ?? null;
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

  toggleSection(key: SectionKey) {
    const willOpen = !this.sections[key];
    Object.keys(this.sections).forEach(k => (this.sections[k as SectionKey] = false));
    this.sections[key] = willOpen;
  }

  private syncOpenSectionWithRoute() {
    const matched = this.sectionRouteMap.find(m => this.isRouteActive(m.prefixes));
    Object.keys(this.sections).forEach(k => (this.sections[k as SectionKey] = false));
    if (matched) this.sections[matched.key] = true;
  }

  onKeyToggleSection(evt: KeyboardEvent, key: SectionKey) {
    if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault();
      this.toggleSection(key);
    }
  }

  // expose simple helpers for template
  hasAny(roles: string[]) {
    return this.authService.hasAny(roles);
  }
  canShow(allow: string[], deny: string[] = []) {
    return this.authService.canShow(allow, deny);
  }

  logout() {
    localStorage.removeItem('access_token');
    this.router.navigate(['/wzlogin']);
  }
}
