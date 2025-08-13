import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { environment } from 'src/environment/environment';

declare var bootstrap: any; // Ensure Bootstrap bundle JS is included in index.html

@Component({
  selector: 'app-rmtl-edit-testing-bench',
  templateUrl: './rmtl-edit-testing-bench.component.html',
  styleUrls: ['./rmtl-edit-testing-bench.component.css']
})
export class RmtlEditTestingBenchComponent implements OnInit, AfterViewInit {
  bench: any = null;

  response_msg: string | null = null;
  response_success = false;
  loading = false;
  dateOrderWarning = false;

  // Dropdown data
  testing_bench_types: string[] = [];
  testing_bench_statuses: string[] = [];
  operation_types: string[] = [];
  phases: string[] = [];
  maintenance_statuses: string[] = [];
  labslist: any[] = [];

  // Modals
  @ViewChild('previewModal') previewModalEl!: ElementRef;
  @ViewChild('alertModal') alertModalEl!: ElementRef;
  private previewModal!: any;
  private alertModal!: any;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private apiservices: ApiServicesService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.params['id']);
    this.fetchBench(id);
    this.fetchLabs();
    this.loadEnums();
  }

  ngAfterViewInit(): void {
    this.previewModal = new bootstrap.Modal(this.previewModalEl?.nativeElement, { backdrop: 'static' });
    this.alertModal   = new bootstrap.Modal(this.alertModalEl?.nativeElement,   { backdrop: 'static' });
  }

  loadEnums(): void {
    this.apiservices.getEnums().subscribe({
      next: (response) => {
        this.testing_bench_types   = response.testing_bench_types   || [];
        this.testing_bench_statuses= response.testing_bench_statuses|| [];
        this.operation_types       = response.operation_types       || [];
        this.phases                = response.phases                || [];
        this.maintenance_statuses  = response.maintenance_statuses  || [];
      },
      error: (error) => console.error(error)
    });
  }

  fetchBench(id: number): void {
    this.apiservices.getTestingBench(id).subscribe({
      next: (response) => { this.bench = response; },
      error:  (error)   => { console.error(error); alert('Failed to fetch bench.'); this.router.navigate(['/wzlab/testing-bench/view-bench-list']); }
    });
  }

  fetchLabs(): void {
    this.apiservices.getLabs().subscribe({
      next: (response) => { this.labslist = response || []; },
      error: (error)    => { console.error(error); }
    });
  }

  // Helpers
  labName(id: any): string | null {
    const lab = this.labslist?.find(l => String(l.id) === String(id));
    return lab ? lab.lab_name : null;
  }

  private isNextBeforeLast(last: string, next: string): boolean {
    if (!last || !next) return false;
    const dLast = new Date(last);
    const dNext = new Date(next);
    if (isNaN(dLast.getTime()) || isNaN(dNext.getTime())) return false;
    return dNext.getTime() < dLast.getTime();
  }

  canSubmitPreview(): boolean {
    if (!this.bench) return false;
    const requiredFilled =
      !!this.bench.bench_name &&
      !!this.bench.type &&
      !!this.bench.status &&
      !!this.bench.operation_type &&
      !!this.bench.phase &&
      !!this.bench.lab_id;
    return requiredFilled && !this.dateOrderWarning;
  }

  // Form submit -> open preview
  openPreview(form: any): void {
    // date order check (only if both are present)
    this.dateOrderWarning = this.isNextBeforeLast(this.bench?.last_calibration_date, this.bench?.next_calibration_due);

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
      this.router.navigate(['/wzlab/testing-bench/view-bench-list']);
    }
  }

  // Confirm in modal -> actual update
  onConfirmUpdate(): void {
    if (!this.bench?.id) return;

    this.loading = true;
    this.closePreview();

    const url = `${environment.apiUrl}/testing-benches/${this.bench.id}`;
    this.http.put(url, this.bench).subscribe({
      next: () => {
        this.response_success = true;
        this.response_msg = 'Bench updated successfully!';
        this.loading = false;
        this.alertModal.show();
      },
      error: (err) => {
        console.error('Update failed:', err);
        this.response_success = false;
        this.response_msg = err?.error?.message || 'Failed to update bench.';
        this.loading = false;
        this.alertModal.show();
      }
    });
  }

  // Backward-compat: if something still calls (ngSubmit)="onUpdate()"
  onUpdate(): void {
    this.openPreview({ invalid: false, control: { markAllAsTouched() {} } });
  }

  cancelEdit(): void {
    this.router.navigate(['/wzlab/testing-bench/view-bench-list']);
  }
}
