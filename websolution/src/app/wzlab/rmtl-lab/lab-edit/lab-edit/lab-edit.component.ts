import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';

declare var bootstrap: any; // ensure bootstrap bundle JS is included in index.html

@Component({
  selector: 'app-lab-edit',
  templateUrl: './lab-edit.component.html',
  styleUrls: ['./lab-edit.component.css']
})
export class LabEditComponent implements OnInit, AfterViewInit {
  lab: any = {
    id: '',
    lab_name: '',
    lab_location: '',
    status: '',
    lab_type: '',
  };

  // statuses: load from API if available; fallback provided
  // lab_statuses: string[] = ['OPERATIONAL', 'NON_OPERATIONAL'];

  loading = false;
  responseMessage = '';
  responseSuccess = false;

  // Track touched fields in template-driven form (use bracket syntax in HTML)
  touched: Record<string, boolean> = {
    lab_name: false,
    lab_location: false,
    status: false,
    lab_type: false
  };

  // Modals
  @ViewChild('previewModal') previewModalEl!: ElementRef;
  @ViewChild('alertModal') alertModalEl!: ElementRef;
  private previewModal!: any;
  private alertModal!: any;
  lab_statuses: any;
  labtypes: any

  constructor(
    private router: Router,
    private apiService: ApiServicesService
  ) {}

  ngOnInit(): void {
    // If you have enums, uncomment to load:
    this.apiService.getEnums().subscribe({
      next: (res) => {
        this.lab_statuses = res?.lab_statuses || [];
        this.labtypes = res?.labtypes || [];
      },
      error: (err) => {
        console.error('Failed to load master data', err);
      }
    });

    const state = history.state;

    // Option 1: Full lab object passed from list
    if (state.lab && state.lab.id) {
      this.lab = state.lab;
    }
    // Option 2: Only lab ID passed from list
    else if (state.labId) {
      this.getLabDetails(state.labId);
    }
    else {
      alert('No lab data provided.');
      this.router.navigate(['/wzlab/testing-laboratory/labs-list']);
    }
  }

  ngAfterViewInit(): void {
    this.previewModal = new bootstrap.Modal(this.previewModalEl?.nativeElement, { backdrop: 'static' });
    this.alertModal = new bootstrap.Modal(this.alertModalEl?.nativeElement, { backdrop: 'static' });
  }

  getLabDetails(id: number) {
    this.apiService.getLab(id).subscribe({
      next: (data) => {
        this.lab = data;
      },
      error: (err) => {
        console.error('Error fetching lab details', err);
        alert('Lab not found!');
        this.router.navigate(['/wzlab/testing-laboratory/labs-list']);
      }
    });
  }

  // Form submit → Preview
  openPreview(form: any): void {
    // mark missing as touched for inline invalid styles
    this.touched['lab_name'] = this.touched['lab_name'] || !this.lab.lab_name;
    this.touched['lab_location'] = this.touched['lab_location'] || !this.lab.lab_location;
    this.touched['status'] = this.touched['status'] || !this.lab.status;
    this.touched['lab_type'] = this.touched['lab_type'] || !this.lab.lab_type;

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
    // Optional: navigate after success
    if (this.responseSuccess) {
      this.router.navigate(['/wzlab/testing-laboratory/labs-list']);
    }
  }

  // Confirm from modal → Update
  onConfirmUpdate(): void {
    this.loading = true;
    this.responseMessage = '';

    // Optional UX: close preview during request
    this.closePreview();

    const sanitizedLab: any = { ...this.lab };

    // remove null/undefined
    for (const key in sanitizedLab) {
      if (sanitizedLab[key] === null || sanitizedLab[key] === undefined) {
        delete sanitizedLab[key];
      }
    }

    // Attach updater metadata
    sanitizedLab.updated_by = this.getCurrentUserIdFromToken() ?? 1;
    sanitizedLab.updated_at = new Date().toISOString();

    this.apiService.updateLab(this.lab.id, sanitizedLab).subscribe({
      next: () => {
        this.responseSuccess = true;
        this.responseMessage = 'Lab updated successfully!';
        this.loading = false;
        this.alertModal.show();
       
      },
      error: (err) => {
        console.error('Update failed', err);
        this.responseSuccess = false;
        this.responseMessage = err?.error?.message || 'Failed to update lab.';
        this.loading = false;
        this.alertModal.show();
        
      }
    });
  }

  getCurrentUserIdFromToken(): number | null {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload?.user_id || payload?.id || null;
      } catch (err) {
        console.error('Invalid token format', err);
      }
    }
    return null;
  }

  cancel() {
    // Fixed route to match others
    this.router.navigate(['/wzlab/lab/labs-list']);
  }
}
