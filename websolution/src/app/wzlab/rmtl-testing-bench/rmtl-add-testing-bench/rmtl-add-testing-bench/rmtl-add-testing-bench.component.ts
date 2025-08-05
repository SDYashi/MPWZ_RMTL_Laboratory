import { Component, OnInit } from '@angular/core';
import { TestingBench } from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-add-testing-bench',
  templateUrl: './rmtl-add-testing-bench.component.html',
  styleUrls: ['./rmtl-add-testing-bench.component.css']
})
export class RmtlAddTestingBenchComponent implements OnInit {
 bench:any={};

response_msg?: string;
constructor(private apiservices: ApiServicesService) {}
testing_bench_types: any[] = [];
testing_bench_statuses: any[] = [];
operation_types: string[] = [];
phases: string[] = [];
maintenance_statuses: string[] = [];
labslist: any[] = [];
ngOnInit(): void {
  this.apiservices.getEnums().subscribe({
    next: (response) => {
     this.testing_bench_types= response.testing_bench_types
     this.testing_bench_statuses= response.testing_bench_statuses
     this.operation_types= response.operation_types
     this.phases= response.phases
     this.maintenance_statuses= response.maintenance_statuses

    },
    error: (error) => {
      console.error(error);
    }
  });
  this.apiservices.getLabs().subscribe({
    next: (response) => {
      this.labslist = response;
    },
    error: (error) => {
      console.error(error);
    }
  })
}
onSubmit() {
  this.apiservices.createTestingBench(this.bench).subscribe( {
    next: (response) => {
      console.log(response);
      this.bench = response;
      this.response_msg = 'Testing Bench Created Successfully';
    },
    error: (error) => {
      console.error(error);
      this.response_msg = 'Testing Bench Creation Failed';
    }
  });
}


}
