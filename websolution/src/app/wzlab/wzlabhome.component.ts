// src/app/wzlabhome/wzlabhome.component.ts
import { Component, HostListener, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { filter, map, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

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
export class WzlabhomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUrl = '';
  currentUserName: string | null = null;

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

  constructor(
    private router: Router,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUrl = this.router.url.replace('/', '');
  }

  ngOnInit(): void {
    // React to login / token set — updates immediately without reload
    this.authService.user$
      .pipe(
        takeUntil(this.destroy$),
        map(u => u?.name || u?.username || null)
      )
      .subscribe(name => {
        this.currentUserName = name;
        this.cdr.markForCheck();
      });

    // React to role changes
    this.authService.roles$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());

    // If anything calls triggerRefresh()
    this.authService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());

    // layout + routing
    this.checkScreenSize();
    this.syncOpenSectionWithRoute();
    this.router.events
      .pipe(takeUntil(this.destroy$), filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.syncOpenSectionWithRoute());
  }

  onKeyToggleSection(key: SectionKey) {
    this.sections[key] = !this.sections[key];
    this.cdr.markForCheck();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  // expose simple helpers for template
  hasAny(roles: string[]) {
    return this.authService.hasAny(roles);
  }
  canShow(allow: string[], deny: string[] = []) {
    return this.authService.canShow(allow, deny);
  }

  logout() {
    this.authService.logout(); // uses service to clear + navigate
  }
}
