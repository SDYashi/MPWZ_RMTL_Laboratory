import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth.service';
import { UserPublic } from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';
export interface Lab {
  id?: number;
  lab_name: string;
  lab_location: string;
  status: 'operational' | 'inactive' | 'maintenance';
  created_at?: string;   // "YYYY-MM-DDTHH:mm:ss"
  updated_at?: string;   // "YYYY-MM-DDTHH:mm:ss"
  created_by?: string | null;
  updated_by?: string | null;
}

@Component({
  selector: 'app-lab-view-list',
  templateUrl: './lab-view-list.component.html',
  styleUrls: ['./lab-view-list.component.css']
})
export class LabViewListComponent implements OnInit {
  labs:any = [];
  newLab: Lab = { lab_name: '', lab_location: '', status: 'operational' };
  selectedLab: Lab | null = null;
  updateLabData: Lab = { lab_name: '', lab_location: '', status: 'operational' };
  message: string | null = null;
  isEditMode = false;
  currentUser: UserPublic | null = null;


  constructor(private apiService: ApiServicesService, private authService: AuthService, private router: Router) { }
  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
    this.loadLabs();
  }

  loadLabs(): void {
    this.apiService.getLabs().subscribe({
      next: (data) => {
        this.labs = data;
        this.message = null;
      },
      error: (err) => {
        this.message = 'Failed to load labs: ' + (err.error?.detail || err.message);
        console.error('Error loading labs:', err);
      }
    });
  }

// editLab(lab: any) {
//   // this.router.navigate(['labs-edit', lab.id]);
//    this.router.navigate(['wzlab/lab/labs-edit'], { state: { lab: lab.id } });
// }

editLab(lab: any) {
  // this.router.navigate(['wzlab/lab/labs-edit'], { state: { lab } });
  this.router.navigate(['wzlab/lab/labs-edit'], { state: { labId: lab.id } });

}




}
