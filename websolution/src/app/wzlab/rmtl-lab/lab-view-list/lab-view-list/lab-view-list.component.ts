import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ApiServicesService } from 'src/app/services/api-services.service';
export interface Lab {
  id?: number;
  lab_name: string;
  lab_location: string;
  status: 'operational' | 'inactive' | 'maintenance';
  created_at?: string;   // "YYYY-MM-DDTHH:mm:ss"
  updated_at?: string;   // "YYYY-MM-DDTHH:mm:ss"
  created_by?: string | null;
  updated_by?: string | null;
}

@Component({
  selector: 'app-lab-view-list',
  templateUrl: './lab-view-list.component.html',
  styleUrls: ['./lab-view-list.component.css']
})
export class LabViewListComponent {
 labs: Lab[] = [];
  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';

  constructor(private fb: FormBuilder, private labsSvc: ApiServicesService) {}

  ngOnInit(): void {
    this.loadLabs();
  }

  loadLabs(): void {
    this.loading = true;
    this.errorMsg = '';
    this.labsSvc.getallLabs().subscribe({
      next: (res) => {
        this.labs = res || [];
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = 'Failed to load labs.';
        console.error(err);
        this.loading = false;
      }
    });
  }

  // Form
  labForm = this.fb.group({
    lab_name: ['', [Validators.required, Validators.maxLength(120)]],
    lab_location: ['', [Validators.required, Validators.maxLength(200)]],
    status: ['operational', [Validators.required]],
    created_by: [''],
    updated_by: ['']
  });

  // Utility: format "YYYY-MM-DDTHH:mm:ss" (no timezone suffix)
  private formatLocalDateTime(d = new Date()): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
  }

  openCreateModal(): void {
    this.labForm.reset({
      lab_name: '',
      lab_location: '',
      status: 'operational',
      created_by: '',
      updated_by: ''
    });
    const modal = document.getElementById('createLabModal');
    if (modal) {
      // Show Bootstrap modal
      const bsModal = new (window as any).bootstrap.Modal(modal);
      bsModal.show();
    }
  }

  submitCreate(): void {
    if (this.labForm.invalid) {
      this.labForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    const now = this.formatLocalDateTime(new Date());
    const payload: Lab = {
      lab_name: this.labForm.value.lab_name!,
      lab_location: this.labForm.value.lab_location!,
      status: this.labForm.value.status as Lab['status'],
      created_by: this.labForm.value.created_by || null,
      updated_by: this.labForm.value.updated_by || null,
      created_at: now,
      updated_at: now
    };

    this.labsSvc.createLab(payload).subscribe({
      next: (res) => {
        this.saving = false;
        this.successMsg = 'Lab created successfully.';
        // Hide modal
        const modalEl = document.getElementById('createLabModal');
        if (modalEl) {
          const bsModal = (window as any).bootstrap.Modal.getInstance(modalEl);
          bsModal?.hide();
        }
        this.loadLabs();
      },
      error: (err) => {
        this.saving = false;
        this.errorMsg = 'Failed to create lab.';
        console.error(err);
      }
    });
  }
}
