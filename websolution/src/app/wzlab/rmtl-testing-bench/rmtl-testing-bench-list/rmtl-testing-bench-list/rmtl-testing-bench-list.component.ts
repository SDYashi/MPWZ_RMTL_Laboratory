import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { environment } from 'src/environment/environment';

@Component({
  selector: 'app-rmtl-testing-bench-list',
  templateUrl: './rmtl-testing-bench-list.component.html',
  styleUrls: ['./rmtl-testing-bench-list.component.css']
})
export class RmtlTestingBenchListComponent {
 benches: any[] = [];

  constructor(private http: HttpClient, private apiservice: ApiServicesService, private router: Router) {}

  ngOnInit(): void {
    this.fetchBenches();
  }

  fetchBenches(): void {
     this.apiservice.getTestingBenches().subscribe(
      {
            next: (response) => {
              this.benches = response;
            },
            error: (error) => {
              console.error(error);
      }}
    );
  }
  editBench(bench: any) {
   this.router.navigate(['/wzlab/testing-bench/edit-bench', { state: { labId: bench.id } }]);
   
  }
  editBench1(id: number): void {
  this.router.navigate(['/wzlab/testing-bench/edit-bench', id]);
  }

}

