import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { environment } from 'src/environment/environment';

@Component({
  selector: 'app-rmtl-edit-supply-vendors',
  templateUrl: './rmtl-edit-supply-vendors.component.html',
  styleUrls: ['./rmtl-edit-supply-vendors.component.css']
})
export class RmtlEditSupplyVendorsComponent {

  client: any = null;
  response_msg: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private apiservices: ApiServicesService
  ) {}

  ngOnInit(): void {
  const id = this.route.snapshot.params['id'];
  this.fetchClient(id);
  }

  fetchClient(id: number): void {
    this.apiservices.getVendor(id).subscribe({
      next: (response) => {
        this.client = response;      
      },
      error: (error) => {
        console.error('Failed to fetch client:', error);
      }
    })
  }

  onUpdate(): void {
   this.apiservices.updateVendor(this.client.id, this.client).subscribe({
     next: (response) => {
       this.response_msg = "Vendor updated successfully";
         setTimeout(() => {
           this.router.navigate(['/wzlab/supply-vendors/list-supply-vendors']);
         }, 1500);
     },
     error: (error) => {
       this.response_msg = error.message;
     }
   })
  }

  cancelEdit(): void {
    this.router.navigate(['/wzlab/supply-vendors/list-supply-vendors']);
  }
}
