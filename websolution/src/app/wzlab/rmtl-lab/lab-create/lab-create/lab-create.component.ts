import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Lab } from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-lab-create',
  templateUrl: './lab-create.component.html',
  styleUrls: ['./lab-create.component.css']
})
export class LabCreateComponent implements OnInit {
 

  loading = false;
  responseMessage = '';
  responseSuccess = false;
  lab:any = [];

  constructor(private http: HttpClient, private apiservies: ApiServicesService) {}
lab_statuses: string[] = [];

ngOnInit(): void {
  // Replace this with your real API call
  this.apiservies.getEnums().subscribe({
    next: (res) => {
      this.lab_statuses = res.lab_statuses || [];
    },
    error: (err) => {
      console.error('Failed to load master data', err);
    }
  });

  // Existing logic
  const labState = history.state.lab;
  if (labState && labState.id) {
    this.lab = labState;
  } else {
    // fallback logic
  }
}

  onSubmit(form: NgForm): void {
    if (form.invalid) return;

    this.loading = true;
    this.responseMessage = '';

    this.apiservies.createLab(form.value).subscribe({
      next: (res) => {
        this.responseSuccess = true;
        this.responseMessage = 'Lab created successfully!';
        form.resetForm();
        this.loading = false;
      },
      error: (err) => {
        this.responseSuccess = false;
        this.responseMessage = err?.error?.message || 'Failed to create lab.';
        this.loading = false;
      }
    });
  }
}
