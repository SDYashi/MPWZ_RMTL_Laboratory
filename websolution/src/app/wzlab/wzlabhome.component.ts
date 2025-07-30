import { Component, EventEmitter, HostListener, Output } from '@angular/core';

@Component({
  selector: 'app-wzlabhome',
  templateUrl: './wzlabhome.component.html',
  styleUrls: ['./wzlabhome.component.css']
})
export class WzlabhomeComponent {
  isCollapsed = false;
  activeSubmenu: string | null = null;

  toggleSubmenu(menu: string): void {
    this.activeSubmenu = this.activeSubmenu === menu ? null : menu;
  }

  isSubmenuActive(menu: string): boolean {
    return this.activeSubmenu === menu;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    const width = (event.target as Window).innerWidth;
    if (width < 992) {
      this.isCollapsed = true;
    } else {
      this.isCollapsed = false;
    }
  }

  ngOnInit(): void {
    if (window.innerWidth < 992) {
      this.isCollapsed = true;
    }
  }

  @Output() toggleSidebar = new EventEmitter<void>();
  isDropdownOpen = false;

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }
  
}
