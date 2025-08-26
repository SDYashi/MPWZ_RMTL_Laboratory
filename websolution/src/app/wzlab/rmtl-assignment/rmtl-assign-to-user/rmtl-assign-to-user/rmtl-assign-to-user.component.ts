import { Component } from '@angular/core';
import { Router } from '@angular/router';
import * as bootstrap from 'bootstrap';
import { AuthService } from 'src/app/core/auth.service';
import { Assignment } from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';
@Component({
  selector: 'app-rmtl-assign-to-user',
  templateUrl: './rmtl-assign-to-user.component.html',
  styleUrls: ['./rmtl-assign-to-user.component.css']
})
export class RmtlAssignToUserComponent {
inward_nos : any = [];
device_statuses = [];
benches:any = [];

fromDate: string = '';
toDate: string = '';

devices = [
    { id: 1, name: 'Meter A', status: 'UNASSIGNED', selected: false },
    { id: 2, name: 'Meter B', status: 'PENDING', selected: false },
    { id: 3, name: 'Meter C', status: 'UNASSIGNED', selected: false }
  ];
  payload :any;
  users:any = [];
   responseMessage = '';
   responseSuccess = false;
  selectedInward: string = '';
  selectedStatus: string = 'UNASSIGNED';
  assignedUser: string = '';
  assignedBench: string = '';
  currentuser: string = 'SYSADMIN';
  filteredDevices: any[] = [];
  roles:string[] = ['TESTING_ASSISTANT'];

  constructor(private api: ApiServicesService, private authapi: AuthService, private router: Router) {}

  ngOnInit(): void {
    // this.filterDevices();
    this.filterinwordno();
    this.api.getEnums().subscribe({
      next: (res) => {
        this.device_statuses = res.assignment_statuses;
        this.responseSuccess = true;
      },
      error: (err) => {
        console.error('Failed to fetch labs', err);
        this.responseSuccess = false;
      }
    })
  }
  filterinwordno(): void {


   this.api.getdistinctinwordno().subscribe({
    next: (res) => {
      this.inward_nos = res;
      this.responseMessage= 'Data fetched successfully!';
       this.responseSuccess = true;
    },
    error: (err) => {
       this.responseMessage= err?.error?.details || 'Failed to fetch data.';
        this.responseSuccess = false;
    }
   })
  }

  fetchfilterinwordno(): void {
    this.fromDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    this.toDate = new Date().toISOString().slice(0, 10);
    this.api.getdistinctinwordno( this.fromDate, this.toDate).subscribe({
      next: (res) => {
        this.inward_nos = res;
        this.responseMessage = `Data fetched successfully from ${this.fromDate} to ${this.toDate}!`;
        this.responseSuccess = true;
      },
      error: (err) => {
        this.responseMessage = err?.error?.details || `Failed to fetch data from ${this.fromDate} to ${this.toDate}.`;
        this.responseSuccess = false;
      }
    })
  }

  filterDevices(): void {
    this.api.getDevicelistbyinwordno(this.selectedInward).pipe().subscribe({
      next: (res) => {
        this.filteredDevices = res;
        this.responseMessage= 'Data fetched successfully!';
        this.responseSuccess = true;
      },
      error: (err) => {
       this.responseMessage= err?.error?.details || 'Failed to fetch data.';
        this.responseSuccess = false;
      }
    })
  }

  toggleAllDevices(event: any): void {
    const checked = event.target.checked;
    this.filteredDevices.forEach(d => d.selected = checked);
  }

  hasSelectedDevices(): boolean {
    return this.filteredDevices.some(d => d.selected);
  }

  openAssignModal(): void {
    
    this.api.getUsers(this.roles).subscribe({
      next: (res) => {
        this.users = res;
      },
      error: (err) => {
        console.error('Failed to fetch users', err);
      }
    })
    this.api.getTestingBenches().subscribe({
      next: (res) => {
        this.benches = res;
      },
      error: (err) => {
        console.error('Failed to fetch devices', err);
      }
    })
    const modal = new bootstrap.Modal(document.getElementById('assignModal')!);
    modal.show();
  }

  submitAssignment(): void {
    this.currentuser = this.authapi.getUserNameFromToken() ?? '';
    const selectedDeviceIds = this.filteredDevices
      .filter(d => d.selected)
      .map(d => d.id);   

     this.payload= {
      inward_no: this.selectedInward,
      assigned_to: this.assignedUser,
      device_ids: selectedDeviceIds,
      user_id: this.assignedUser,
      assigned_by: 1,
      bench_id: parseInt(this.assignedBench, 10)

    };
    //  alert(this.payload);
    this.api.createAssignmentbulk(this.payload).subscribe({

      next: () => {
        alert('Assignment successful!');
        this.filteredDevices.forEach(d => d.selected = false); 
        this.filteredDevices=[]
        this.router.navigate(['/wzlab/assignement/assign-to-user']);     
      },
      error: (err) => {
        console.error('Assignment failed:', err);
      }
    });

    bootstrap.Modal.getInstance(document.getElementById('assignModal')!)?.hide();
  }
}
