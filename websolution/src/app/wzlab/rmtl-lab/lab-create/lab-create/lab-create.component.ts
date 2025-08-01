import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-lab-create',
  templateUrl: './lab-create.component.html',
  styleUrls: ['./lab-create.component.css']
})
export class LabCreateComponent {
   lab = {
    lab_name: '',
    lab_location: '',
    status: ''
  };

  response: any = null;
  errorMsg: string = '';

  constructor(private http: HttpClient, private apiservice: ApiServicesService) {}

  createLab() {
   this.apiservice.createLab(this.lab).subscribe({
    next: (response) => {
      this.response = response;
    },
    error: (error) => {
      this.errorMsg = error.message;
    }
   })
  }
}