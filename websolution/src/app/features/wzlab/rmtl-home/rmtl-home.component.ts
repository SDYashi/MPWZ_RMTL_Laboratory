import { Component } from '@angular/core';

@Component({
  selector: 'app-rmtl-home',
  templateUrl: './rmtl-home.component.html',
  styleUrls: ['./rmtl-home.component.css']
})
export class RmtlHomeComponent {
 isSidebarCollapsed = false;

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
