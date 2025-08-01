import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-user-list',
  templateUrl: './rmtl-user-list.component.html',
  styleUrls: ['./rmtl-user-list.component.css']
})
export class RmtlUserListComponent implements OnInit{
  users: any[] = [];
  response_msg: any;

  constructor(private  http: HttpClient, private router: Router, private apiservice: ApiServicesService) { }
  ngOnInit(): void {
    this.apiservice.getallUsers().subscribe({
      next: (response) => {
        this.users = response;
        // this.response_msg = response.msg;
      },
      error: (error) => {
        console.error('Error fetching users:', error);
        this.response_msg = error;

      }
    });
  }
onEdit(user: any): void {
  this.router.navigate(['wzlab/user/edit-user'], { state: { user } });
}
  
}
