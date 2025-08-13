import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  selector: 'app-rmtl-store-edit',
  templateUrl: './rmtl-store-edit.component.html',
  styleUrls: ['./rmtl-store-edit.component.css']
})
export class RmtlStoreEditComponent implements OnInit, AfterViewInit {
  // Adjust this to your real list route
  private readonly LIST_ROUTE = '/wzlab/store/list-stores';

  storeId!: number;
  store:any ;
  loading = false;
  response_msg: string | null = null;
  response_success = false;

  // Keep a copy to allow reset-to-original if needed
  private originalStore!: StorePayload;

  // Modals
  @ViewChild('previewModal') previewModalEl!: ElementRef;
  @ViewChild('alertModal')   alertModalEl!: ElementRef;
  private previewModal!: any;
  private alertModal!: any;
  payload: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiServicesService
  ) {}

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.params['id']);
    this.fetchStore(this.storeId);
  }

  ngAfterViewInit(): void {
    this.previewModal = new bootstrap.Modal(this.previewModalEl?.nativeElement, { backdrop: 'static' });
    this.alertModal   = new bootstrap.Modal(this.alertModalEl?.nativeElement,   { backdrop: 'static' });
  }

  // --- Data Loading ---
  fetchStore(id: number): void {
    // Expect your service to expose getStore(id)
    this.api.getStore(id).subscribe({
      next: (res: any) => {
        // accept extra fields but map to our payload
        this.store = {
          code: res?.code ?? '',
          name: res?.name ?? '',
          division_code: this.toNumOrNull(res?.division_code),
          division_name: res?.division_name ?? '',
          circle_code: this.toNumOrNull(res?.circle_code),
          circle_name: res?.circle_name ?? '',
          region_code: this.toNumOrNull(res?.region_code),
          region_name: res?.region_name ?? '',
          org_code: this.toNumOrNull(res?.org_code),
          org_name: res?.org_name ?? ''
        };
        this.originalStore = JSON.parse(JSON.stringify(this.store));
      },
      error: (err) => {
        console.error('Failed to fetch store', err);
        this.router.navigate([this.LIST_ROUTE]);
      }
    });
  }

  // --- Form Flow ---
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
      // this.router.navigate([this.LIST_ROUTE]);
         this.router.navigate(['/wzlab/store/view-store-list']);
    }
  }

  canSubmitPreview(): boolean {
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

  onConfirmUpdate(): void {
    this.loading = true;
    this.closePreview();

    this.payload = this.coerceNumbers(this.store);

    // Expect your service to expose updateStore(id, payload)
    this.api.updateStore(this.storeId, this.payload).subscribe({
      next: () => {
        this.response_success = true;
        this.response_msg = 'Store updated successfully!';
        this.loading = false;
        this.alertModal.show();
     
      },
      error: (err) => {
        this.response_success = false;
        this.response_msg = err?.error?.message || err?.message || 'Failed to update store.';
        this.loading = false;
        this.alertModal.show();
      }
    });
  }

  // --- Helpers ---
  cancelEdit(): void {
    this.router.navigate([this.LIST_ROUTE]);
  }

  private toNumOrNull(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  private coerceNumbers(p: StorePayload): StorePayload {
    return {
      ...p,
      division_code: this.toNumOrNull(p.division_code),
      circle_code:   this.toNumOrNull(p.circle_code),
      region_code:   this.toNumOrNull(p.region_code),
      org_code:      this.toNumOrNull(p.org_code)
    };
  }
}
