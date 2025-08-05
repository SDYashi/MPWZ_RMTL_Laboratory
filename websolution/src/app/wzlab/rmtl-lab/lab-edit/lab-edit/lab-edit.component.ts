import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';
// import { Lab } from 'src/app/interface/models';

@Component({
  selector: 'app-lab-edit',
  templateUrl: './lab-edit.component.html',
  styleUrls: ['./lab-edit.component.css']
})
export class LabEditComponent {
lab: any = {
  id: '',
  lab_name: '',
  lab_location: '',
  status: ''
};
Lab: any = []

constructor(
  private router: Router,
  private apiService: ApiServicesService
) {}

ngOnInit(): void {
  const state = history.state;

  // Option 1: Full lab object passed from list
  if (state.lab && state.lab.id) {
    this.lab = state.lab;
  } 
  // Option 2: Only lab ID passed from list
  else if (state.labId) {
    this.getLabDetails(state.labId);
  } 
  else {
    alert('No lab data provided.');
    this.router.navigate(['/wzlab/lab/lab-list']);
  }
}

getLabDetails(id: number) {
  this.apiService.getLab(id).subscribe({
    next: (data) => {
      this.lab = data;
    },
    error: (err) => {
      console.error('Error fetching lab details', err);
      alert('Lab not found!');
      this.router.navigate(['/wzlab/lab/lab-list']);
    }
  });
}

onUpdate() {
  const userId = this.getCurrentUserIdFromToken();

  // Clone and sanitize lab object
  const sanitizedLab: any = { ...this.lab };

  for (const key in sanitizedLab) {
    if (sanitizedLab[key] === null || sanitizedLab[key] === undefined) {
      delete sanitizedLab[key];
    }
  }

  // Set updated_by and updated_at
  sanitizedLab.updated_by = 1;
  sanitizedLab.updated_at = new Date().toISOString();

  this.apiService.updateLab(this.lab.id, sanitizedLab).subscribe({
    next: () => {
      alert('Lab updated successfully!');
      this.router.navigate(['/wzlab/lab/lab-list']);
    },
    error: (err) => {
      console.error('Update failed', err);
      alert('Failed to update lab.');
    }
  });
}

getCurrentUserIdFromToken(): number | null {
  const token = localStorage.getItem('access_token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.user_id || payload?.id || null;
    } catch (err) {
      console.error('Invalid token format', err);
    }
  }
  return null;
}



cancel() {
  this.router.navigate(['/wzlab/lab/labs-list']);
}

}
