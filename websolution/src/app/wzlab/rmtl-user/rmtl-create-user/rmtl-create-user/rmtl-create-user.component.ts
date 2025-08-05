import { Component, OnInit } from '@angular/core';
import { Lab } from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-create-user',
  templateUrl: './rmtl-create-user.component.html',
  styleUrls: ['./rmtl-create-user.component.css']
})
export class RmtlCreateUserComponent implements OnInit {
  user: any = {
    lab_id: '',
    username: '',
    password: '',
    name: '',
    email: '',
    designation: '',
    status: 'ACTIVE',
    mobile: '',
    rolesStr: ''
  };
  
  availableRoles: string[] = ['admin', 'user'];
  response_msg: any;
  response_success: any;

  constructor(private apiservice: ApiServicesService) {}

  statuses: string[] = ['ACTIVE', 'INACTIVE', 'PENDING'];
  labs:Lab[] = [];
  roles: string[] = ['ADMIN', 'OFFICER_INCHARGE'];

  ngOnInit(): void {
    this.apiservice.getLabs().subscribe({
      next: (response) => {
        this.labs = response;
      },
      error: (error) => {
        console.error('Error fetching labs:', error);
      }
    });
    this.apiservice.getEnums().subscribe({
      next: (response) => {
        this.roles = response.roles;
      },
      error: (error) => {
        console.error('Error fetching users:', error);
      }
    })
  }

  onSubmit(): void {
    const roles = this.user.rolesStr
      ? this.user.rolesStr.split(',').map((r: string) => r.trim())
      : [];

    const payload = {
      lab_id: this.user.lab_id,
      username: this.user.username,
      password: this.user.password,
      name: this.user.name,
      email: this.user.email,
      designation: this.user.designation,
      status: this.user.status,
      mobile: this.user.mobile,
      roles: roles
    };

    this.apiservice.createUser(payload).subscribe({
      next: (response) => {
        this.response_msg = 'User created successfully!';
        // Reset form
        this.user = {
          lab_id: '',
          username: '',
          password: '',
          name: '',
          email: '',
          designation: '',
          status:'ACTIVE',
          mobile: '',
          rolesStr: ''
        };
        this.response_success = true
      },
      error: (error) => {
        console.error('User creation failed:', error);
        this.response_msg = 'Error: ' + (error?.error?.message || error.message);
         this.response_success = false
      }
    });
  }
}
