import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ApiServicesService } from 'src/app/services/api-services.service';

declare var bootstrap: any; // Ensure Bootstrap JS is loaded in index.html

@Component({
  selector: 'app-lab-create',
  templateUrl: './lab-create.component.html',
  styleUrls: ['./lab-create.component.css']
})
export class LabCreateComponent implements OnInit, AfterViewInit {
  loading = false;
  responseMessage = '';
  responseSuccess = false;

  // Form model
  lab: any = { lab_name: '', lab_location: '', status: '' };

  lab_statuses: string[] = [];

  // Simple touched map (use bracket access in template)
  touched: Record<string, boolean> = {
    lab_name: false,
    lab_location: false,
    status: false
  };

  // Modal element refs
  @ViewChild('previewModal') previewModalEl!: ElementRef;
  @ViewChild('alertModal') alertModalEl!: ElementRef;

  // Bootstrap.Modal instances
  private previewModal!: any;
  private alertModal!: any;

  constructor(private http: HttpClient, private apiservies: ApiServicesService) {}

  ngOnInit(): void {
    // Load enums
    this.apiservies.getEnums().subscribe({
      next: (res) => {
        this.lab_statuses = res?.lab_statuses || [];
      },
      error: (err) => {
        console.error('Failed to load master data', err);
      }
    });

    // Edit state (if navigated with history.state.lab)
    const labState = history.state?.lab;
    if (labState && labState.id) {
      this.lab = { ...labState };
    }
  }

  ngAfterViewInit(): void {
    this.previewModal = new bootstrap.Modal(this.previewModalEl?.nativeElement, { backdrop: 'static' });
    this.alertModal = new bootstrap.Modal(this.alertModalEl?.nativeElement, { backdrop: 'static' });
  }

  // Open Preview (called on form submit)
  openPreview(form: NgForm): void {
    // mark touched if empty to show inline errors
    this.touched['lab_name'] = this.touched['lab_name'] || !this.lab.lab_name;
    this.touched['lab_location'] = this.touched['lab_location'] || !this.lab.lab_location;
    this.touched['status'] = this.touched['status'] || !this.lab.status;

    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.previewModal.show();
  }

  closePreview(): void {
    this.previewModal?.hide();
  }

  closeAlert(): void {
    this.alertModal?.hide();
  }

  // Confirm submission from the preview modal
  onConfirmSubmit(): void {
    this.loading = true;
    this.responseMessage = '';

    // Optionally close preview while submitting
    this.closePreview();

    this.apiservies.createLab(this.lab).subscribe({
      next: () => {
        this.responseSuccess = true;
        this.responseMessage = 'Lab created successfully!';
        this.loading = false;
        this.alertModal.show();
        this.resetForm(this.lab);
      },
      error: (err) => {
        this.responseSuccess = false;
        this.responseMessage = err?.error?.message || 'Failed to create lab.';
        this.loading = false;
        this.alertModal.show();
      }
    });
  }

  resetForm(form: NgForm): void {
    form.resetForm();
    this.lab = { lab_name: '', lab_location: '', status: '' };
    this.touched = { lab_name: false, lab_location: false, status: false };
  }
}
