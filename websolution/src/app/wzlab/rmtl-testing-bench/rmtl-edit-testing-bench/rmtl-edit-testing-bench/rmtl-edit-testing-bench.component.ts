import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { environment } from 'src/environment/environment';

@Component({
  selector: 'app-rmtl-edit-testing-bench',
  templateUrl: './rmtl-edit-testing-bench.component.html',
  styleUrls: ['./rmtl-edit-testing-bench.component.css']
})
export class RmtlEditTestingBenchComponent {

  bench: any = null;
  response_msg: string | null = null;
  response_success: boolean | null = null;

  // Dropdown data
    testing_bench_types: any[] = [];
    testing_bench_statuses: any[] = [];
    operation_types: string[] = [];
    phases: string[] = [];
    maintenance_statuses: string[] = [];
    labslist: any[] = [];
    benches: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private apiservices: ApiServicesService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.fetchBench(id);
    this.fetchLabs();
    this.getenumsall();
  }
  getenumsall(): void {
    this.apiservices.getEnums().subscribe({
      next: (response) => {
        this.testing_bench_types = response.testing_bench_types;
        this.testing_bench_statuses = response.testing_bench_statuses;
        this.operation_types = response.operation_types;
        this.phases = response.phases;
        this.maintenance_statuses = response.maintenance_statuses;
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  fetchBench(id: number): void {
    this.apiservices.getTestingBench(id).subscribe(
      {
            next: (response) => {
              this.bench = response;
            },
            error: (error) => {
           alert(error);
      }}
    );
  }

  fetchLabs(): void {
    this.apiservices.getLabs().subscribe({
    next: (response) => {
      this.labslist = response;
    },
    error: (error) => {
      console.error(error);
    }
  })
  }

  onUpdate(): void {
    const url = `${environment.apiUrl}/testing-benches/${this.bench.id}`;
    this.http.put(url, this.bench).subscribe({
      next: () => {
        this.response_msg = 'Bench updated successfully!';
        setTimeout(() => this.router.navigate(['/testing-benches']), 1500);
        response_success: true
        setTimeout(() => {
            this.router.navigate(['/wzlab/testing-bench/view-bench-list']);
        }, 1500);

      },
      error: (err) => {
        console.error('Update failed:', err);
        this.response_msg = 'Failed to update bench.';
        response_success: false
      }
    });
  }

  cancelEdit(): void {
    this.router.navigate(['/testing-benches']);
  }
}
