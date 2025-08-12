import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-add-supply-vendors',
  templateUrl: './rmtl-add-supply-vendors.component.html',
  styleUrls: ['./rmtl-add-supply-vendors.component.css']
})
export class RmtlAddSupplyVendorsComponent implements OnInit {
 client = {  
    code: '',
    name: '',
    project_no: '',
    contact_person: '',
    contact_no: '',
    email: '',
    address: '',
    vendor_category: ''
  };
vendorlist: any[] = [];
  ngOnInit(): void {
     this.apiservice.getEnums().subscribe({
       next: (res) => {
         this.vendorlist = res.vendor_categories;
       },
       error: (err) => {
         console.error('Failed to fetch labs', err);
       }
     })

  }
  
  response_msg: any | null = null;
  constructor(private http: HttpClient, private apiservice: ApiServicesService) {}

  onSubmit(): void {
    this.apiservice.createVendor(this.client).subscribe(
    {
      next: (response) => {
        this.response_msg ="Vendor added successfully"+response.name;
        this.resetForm(<NgForm>{});
      },
      error: (error) => {
        this.response_msg = error.message;
      }
    }
    );

  }

  resetForm(form: NgForm): void {
    form.resetForm();
    this.response_msg = null;
  }

}
