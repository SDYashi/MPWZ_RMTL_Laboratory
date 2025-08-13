import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ApiServicesService } from 'src/app/services/api-services.service';

declare var bootstrap: any; // Ensure Bootstrap JS bundle is loaded in index.html

interface StorePayload {
  code: string;
  name: string;
  division_code: number | null;
  division_name: string;
  circle_code: number | null;
  circle_name: string;
  region_code: number | null;
  region_name: string;
  org_code: number | null;
  org_name: string;
}

@Component({
  selector: 'app-rmtl-add-store',
  templateUrl: './rmtl-add-store.component.html',
  styleUrls: ['./rmtl-add-store.component.css']
})
export class RmtlAddStoreComponent implements OnInit, AfterViewInit {
  store: StorePayload = this.defaultStore();
payload: any;
  loading = false;
  response_msg: string | null = null;
  response_success = false;

  // Modals
  @ViewChild('previewModal') previewModalEl!: ElementRef;
  @ViewChild('alertModal')   alertModalEl!: ElementRef;
  private previewModal!: any;
  private alertModal!: any;

  constructor(private apiservice: ApiServicesService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.previewModal = new bootstrap.Modal(this.previewModalEl?.nativeElement, { backdrop: 'static' });
    this.alertModal   = new bootstrap.Modal(this.alertModalEl?.nativeElement,   { backdrop: 'static' });
  }

  defaultStore(): StorePayload {
    return {
      code: '',
      name: '',
      division_code: null,
      division_name: '',
      circle_code: null,
      circle_name: '',
      region_code: null,
      region_name: '',
      org_code: null,
      org_name: ''
    };
  }

  // Convert number-like fields to numbers or null
  private coerceNumbers(p: StorePayload): StorePayload {
    const toNum = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v));
    return {
      ...p,
      division_code: toNum(p.division_code),
      circle_code:   toNum(p.circle_code),
      region_code:   toNum(p.region_code),
      org_code:      toNum(p.org_code)
    };
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
    if (this.response_success) {
      // after success, reset for a fresh entry
      this.store = this.defaultStore();
    }
  }

  canSubmitPreview(): boolean {
    // only code + name required; numeric fields can be empty or >= 0
    const codeOK = !!this.store.code?.trim();
    const nameOK = !!this.store.name?.trim();

    const ge0 = (v: any) => v === null || v === undefined || v === '' || Number(v) >= 0;

    return (
      codeOK &&
      nameOK &&
      ge0(this.store.division_code) &&
      ge0(this.store.circle_code) &&
      ge0(this.store.region_code) &&
      ge0(this.store.org_code)
    );
  }

  onConfirmSubmit(): void {
    this.loading = true;
    this.closePreview();

    this.payload = this.coerceNumbers(this.store);

    // Adjust method name if your service uses a different endpoint name
    this.apiservice.createStore(this.payload).subscribe({
      next: (res) => {
        this.response_success = true;
        this.response_msg = `Store created successfully!'}`;
        this.loading = false;
        this.alertModal.show();
      },
      error: (err) => {
        this.response_success = false;
        this.response_msg = err?.error?.message || err?.message || 'Failed to create store.';
        this.loading = false;
        this.alertModal.show();
      }
    });
  }

  // Back-compat handler, in case someone still calls (ngSubmit)="onSubmit()"
  onSubmit(): void {
    this.openPreview({ invalid: false, control: { markAllAsTouched() {} } } as any);
  }
}
