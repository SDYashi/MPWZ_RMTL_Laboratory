import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { environment } from 'src/environment/environment';

@Component({
  selector: 'app-rmtl-list-supply-vendors',
  templateUrl: './rmtl-list-supply-vendors.component.html',
  styleUrls: ['./rmtl-list-supply-vendors.component.css']
})
export class RmtlListSupplyVendorsComponent {
 clients: any[] = [];

  constructor(private http: HttpClient, private apiservice: ApiServicesService, private router: Router) {}

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

}
