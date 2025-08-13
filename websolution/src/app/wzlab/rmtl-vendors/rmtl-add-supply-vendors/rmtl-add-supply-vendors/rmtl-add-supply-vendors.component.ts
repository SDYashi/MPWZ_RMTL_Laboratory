import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ApiServicesService } from 'src/app/services/api-services.service';

declare var bootstrap: any; // Ensure Bootstrap bundle JS is included in index.html

@Component({
  selector: 'app-rmtl-add-supply-vendors',
  templateUrl: './rmtl-add-supply-vendors.component.html',
  styleUrls: ['./rmtl-add-supply-vendors.component.css']
})
export class RmtlAddSupplyVendorsComponent implements OnInit, AfterViewInit {
  client = this.defaultClient();

  vendorlist: string[] = [];

  loading = false;
  response_msg: string | null = null;
  response_success = false;

  // Modals
  @ViewChild('previewModal') previewModalEl!: ElementRef;
  @ViewChild('alertModal')   alertModalEl!: ElementRef;
  private previewModal!: any;
  private alertModal!: any;

  constructor(private apiservice: ApiServicesService) {}

  ngOnInit(): void {
    this.apiservice.getEnums().subscribe({
      next: (res) => { this.vendorlist = res?.vendor_categories || []; },
      error: (err) => { console.error('Failed to fetch enums', err); }
    });
  }

  ngAfterViewInit(): void {
    this.previewModal = new bootstrap.Modal(this.previewModalEl?.nativeElement, { backdrop: 'static' });
    this.alertModal   = new bootstrap.Modal(this.alertModalEl?.nativeElement,   { backdrop: 'static' });
  }

  defaultClient() {
    return {
      code: '',
      name: '',
      project_no: '',
      contact_person: '',
      contact_no: '',
      email: '',
      address: '',
      vendor_category: ''
    };
    // If your API wants "vendor" key instead of "vendor_category", rename here + template.
  }

  // Form submit -> open preview
  openPreview(form: NgForm): void {
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

  canSubmitPreview(): boolean {
    const phoneOk =
      !this.client.contact_no ||
      /^[0-9]{7,15}$/.test(this.client.contact_no);

    const emailOk =
      !this.client.email ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.client.email);

    return !!this.client.code && !!this.client.name && !!this.client.vendor_category && phoneOk && emailOk;
  }

  onConfirmSubmit(): void {
    this.loading = true;
    this.closePreview();

    this.apiservice.createVendor(this.client).subscribe({
      next: (response) => {
        this.response_success = true;
        const name = response?.name || this.client.name;
        this.response_msg = `Vendor added successfully: ${name}`;
        this.loading = false;

        // reset the form model
        this.client = this.defaultClient();
        this.alertModal.show();
      },
      error: (error) => {
        console.error('Vendor creation failed:', error);
        this.response_success = false;
        this.response_msg = error?.error?.message || error?.message || 'Failed to add vendor.';
        this.loading = false;
        this.alertModal.show();
      }
    });
  }

  // Old direct submit kept for compatibility (calls preview flow)
  onSubmit(): void {
    this.openPreview({ invalid: false, control: { markAllAsTouched() {} } } as any);
  }

  resetForm(form: NgForm): void {
    form.resetForm(this.defaultClient());
    this.response_msg = null;
    this.response_success = false;
  }
}
