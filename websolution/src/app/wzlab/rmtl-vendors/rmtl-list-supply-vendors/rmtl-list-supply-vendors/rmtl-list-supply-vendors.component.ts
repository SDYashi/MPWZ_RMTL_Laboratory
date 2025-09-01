import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { environment } from 'src/environment/environment';

@Component({
  selector: 'app-rmtl-list-supply-vendors',
  templateUrl: './rmtl-list-supply-vendors.component.html',
  styleUrls: ['./rmtl-list-supply-vendors.component.css']
})
export class RmtlListSupplyVendorsComponent {
 clients: any[] = [];

  constructor( private authService: AuthService, private http: HttpClient, private apiservice: ApiServicesService, private router: Router) {}

  ngOnInit(): void {
    this.fetchClients();
  }

  fetchClients(): void {
   this.apiservice.getVendors().subscribe(
    {
      next: (response) => {
        this.clients = response;
      },
      error: (error) => {
        console.error('Error fetching clients:', error);
      }
    }
   )
  }
editClient(id: number): void {
  this.router.navigate(['/wzlab/supply-vendors/edit-supply-vendors', id]);
}

  // expose simple helpers for template
  hasAny(roles: string[]) {
    return this.authService.hasAny(roles);
  }
  canShow(allow: string[], deny: string[] = []) {
    return this.authService.canShow(allow, deny);
  }

}
