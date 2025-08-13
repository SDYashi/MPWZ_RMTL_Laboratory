import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';

declare var bootstrap: any; // Ensure Bootstrap bundle JS is included in index.html

@Component({
  selector: 'app-rmtl-edit-supply-vendors',
  templateUrl: './rmtl-edit-supply-vendors.component.html',
  styleUrls: ['./rmtl-edit-supply-vendors.component.css']
})
export class RmtlEditSupplyVendorsComponent implements OnInit, AfterViewInit {
  client: any = null;

  vendorlist: string[] = [];

  loading = false;
  response_msg: string | null = null;
  response_success = false;

  // Modals
  @ViewChild('previewModal') previewModalEl!: ElementRef;
  @ViewChild('alertModal')   alertModalEl!: ElementRef;
  private previewModal!: any;
  private alertModal!: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiservices: ApiServicesService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.params['id']);
    this.fetchClient(id);

    // Load vendor categories (for dropdown)
    this.apiservices.getEnums().subscribe({
      next: (res) => { this.vendorlist = res?.vendor_categories || []; },
      error: (err) => { console.error('Failed to fetch enums', err); }
    });
  }

  ngAfterViewInit(): void {
    this.previewModal = new bootstrap.Modal(this.previewModalEl?.nativeElement, { backdrop: 'static' });
    this.alertModal   = new bootstrap.Modal(this.alertModalEl?.nativeElement,   { backdrop: 'static' });
  }

  fetchClient(id: number): void {
    this.apiservices.getVendor(id).subscribe({
      next: (response) => { this.client = response; },
      error: (error) => {
        console.error('Failed to fetch client:', error);
        this.router.navigate(['/wzlab/supply-vendors/list-supply-vendors']);
      }
    });
  }

  // Form submit -> open preview
  openPreview(form: NgForm): void {
    if (form.invalid) {
      form.control?.markAllAsTouched();
      return;
    }
    this.previewModal.show();
  }

  closePreview(): void {
    this.previewModal?.hide();
  }

  closeAlert(): void {
    this.alertModal?.hide();
    if (this.response_success) {
      this.router.navigate(['/wzlab/supply-vendors/list-supply-vendors']);
    }
  }

  canSubmitPreview(): boolean {
    const phoneOk = !this.client?.contact_no || /^[0-9]{7,15}$/.test(this.client.contact_no);
    const emailOk = !this.client?.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.client.email);
    return !!this.client?.code && !!this.client?.name && !!this.client?.vendor_category && phoneOk && emailOk;
  }

  // Confirm in modal -> actual update
  onConfirmUpdate(): void {
    if (!this.client?.id) return;

    this.loading = true;
    this.closePreview();

    this.apiservices.updateVendor(this.client.id, this.client).subscribe({
      next: () => {
        this.response_success = true;
        this.response_msg = 'Vendor updated successfully';
        this.loading = false;
        this.alertModal.show();
      },
      error: (error) => {
        this.response_success = false;
        this.response_msg = error?.error?.message || error?.message || 'Failed to update vendor';
        this.loading = false;
        this.alertModal.show();
      }
    });
  }

  // Backward compatibility: if something still calls original (ngSubmit)="onUpdate()"
  onUpdate(): void {
    this.openPreview({ invalid: false, control: { markAllAsTouched() {} } } as any);
  }

  cancelEdit(): void {
    this.router.navigate(['/wzlab/supply-vendors/list-supply-vendors']);
  }
}
