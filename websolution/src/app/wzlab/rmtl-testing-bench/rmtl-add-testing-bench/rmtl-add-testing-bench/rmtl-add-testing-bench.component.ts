import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

declare var bootstrap: any; // Ensure Bootstrap bundle JS is included in index.html

@Component({
  selector: 'app-rmtl-add-testing-bench',
  templateUrl: './rmtl-add-testing-bench.component.html',
  styleUrls: ['./rmtl-add-testing-bench.component.css']
})
export class RmtlAddTestingBenchComponent implements OnInit, AfterViewInit {
  bench: any = this.defaultBench();

  response_msg?: string;
  response_success = false;
  loading = false;

  // enums/options
  testing_bench_types: string[] = [];
  testing_bench_statuses: string[] = [];
  operation_types: string[] = [];
  phases: string[] = [];
  maintenance_statuses: string[] = [];
  labslist: any[] = [];

  // UI helpers
  dateOrderWarning = false;

  // Modals
  @ViewChild('previewModal') previewModalEl!: ElementRef;
  @ViewChild('alertModal') alertModalEl!: ElementRef;
  private previewModal!: any;
  private alertModal!: any;

  constructor(private apiservices: ApiServicesService) {}

  ngOnInit(): void {
    this.apiservices.getEnums().subscribe({
      next: (response) => {
        this.testing_bench_types = response.testing_bench_types || [];
        this.testing_bench_statuses = response.testing_bench_statuses || [];
        this.operation_types = response.operation_types || [];
        this.phases = response.phases || [];
        this.maintenance_statuses = response.maintenance_statuses || [];
      },
      error: (error) => console.error(error)
    });

    this.apiservices.getLabs().subscribe({
      next: (response) => this.labslist = response || [],
      error: (error) => console.error(error)
    });
  }

  ngAfterViewInit(): void {
    this.previewModal = new bootstrap.Modal(this.previewModalEl?.nativeElement, { backdrop: 'static' });
    this.alertModal = new bootstrap.Modal(this.alertModalEl?.nativeElement, { backdrop: 'static' });
  }

  defaultBench() {
    return {
      bench_name: '',
      type: '',
      status: '',
      operation_type: '',
      phase: '',
      last_calibration_date: '',
      next_calibration_due: '',
      maintenance_status: '',
      lab_id: ''
    };
  }

  // Open preview if form valid; compute date warning
  openPreview(form: any): void {
    // guard for date order (only if both provided)
    this.dateOrderWarning = this.isNextBeforeLast(
      this.bench.last_calibration_date,
      this.bench.next_calibration_due
    );

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
      // optional: reset after success
      this.bench = this.defaultBench();
    }
  }

  canSubmitPreview(): boolean {
    const requiredFilled =
      !!this.bench.bench_name &&
      !!this.bench.type &&
      !!this.bench.status &&
      !!this.bench.operation_type &&
      !!this.bench.phase &&
      !!this.bench.lab_id;

    // allow submit even if dates empty; if both present, ensure order is valid
    const datesOk = !this.dateOrderWarning;
    return requiredFilled && datesOk;
  }

  onConfirmSubmit(): void {
    this.loading = true;
    this.closePreview();

    this.apiservices.createTestingBench(this.bench).subscribe({
      next: (response) => {
        // You can keep/replace local bench from server response if needed
        this.bench = { ...this.bench, ...(response || {}) };
        this.response_success = true;
        this.response_msg = 'Testing Bench created successfully!';
        this.loading = false;
        this.alertModal.show();
      },
      error: (error) => {
        console.error(error);
        this.response_success = false;
        this.response_msg = error?.error?.message || 'Testing Bench creation failed.';
        this.loading = false;
        this.alertModal.show();
      }
    });
  }

  // Helpers
  labName(id: any): string | null {
    const lab = this.labslist?.find(l => String(l.id) === String(id));
    return lab ? lab.lab_name : null;
  }

  isNextBeforeLast(last: string, next: string): boolean {
    if (!last || !next) return false;
    try {
      const dLast = new Date(last);
      const dNext = new Date(next);
      if (isNaN(dLast.getTime()) || isNaN(dNext.getTime())) return false;
      return dNext.getTime() < dLast.getTime();
    } catch {
      return false;
    }
  }

  // Backward compatibility: direct submit (not used now)
  onSubmit(): void {
    // Use preview flow by default
    this.openPreview({ invalid: false, control: { markAllAsTouched() {} } });
  }
}
