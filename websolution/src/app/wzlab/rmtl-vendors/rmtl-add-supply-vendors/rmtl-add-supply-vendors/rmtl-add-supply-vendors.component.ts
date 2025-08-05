import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-add-supply-vendors',
  templateUrl: './rmtl-add-supply-vendors.component.html',
  styleUrls: ['./rmtl-add-supply-vendors.component.css']
})
export class RmtlAddSupplyVendorsComponent {
 client = {  
    code: '',
    name: '',
    project_no: '',
    contact_person: '',
    contact_no: '',
    email: '',
    address: ''
  };

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
