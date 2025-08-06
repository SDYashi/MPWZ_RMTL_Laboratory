import { Component } from '@angular/core';

@Component({
  selector: 'app-rmtl-view-dashboard',
  templateUrl: './rmtl-view-dashboard.component.html',
  styleUrls: ['./rmtl-view-dashboard.component.css']
})
export class RmtlViewDashboardComponent {

assignments: any[] = [];
  summary = {
    pending: 0,
    completed: 0,
    overdue: 0
  };

  ngOnInit(): void {
    this.loadAssignments();
  }

  loadAssignments(): void {
    // Example data - replace with API call
    this.assignments = [
      {
        id: 1,
        title: 'Submit Q2 Reports',
        assigned_to: 'John Doe',
        due_date: '2025-08-10',
        status: 'Pending',
        priority: 'High'
      },
      {
        id: 2,
        title: 'Update Inventory Records',
        assigned_to: 'Jane Smith',
        due_date: '2025-08-05',
        status: 'Completed',
        priority: 'Medium'
      },
      {
        id: 3,
        title: 'Finalize Vendor Onboarding',
        assigned_to: 'Team A',
        due_date: '2025-08-01',
        status: 'Overdue',
        priority: 'High'
      }
    ];

    this.updateSummary();
  }

  updateSummary(): void {
    this.summary.pending = this.assignments.filter(a => a.status === 'Pending').length;
    this.summary.completed = this.assignments.filter(a => a.status === 'Completed').length;
    this.summary.overdue = this.assignments.filter(a => a.status === 'Overdue').length;
  }

  viewAssignment(assignment: any): void {
    alert(`Viewing assignment: ${assignment.title}`);
  }

  markCompleted(assignment: any): void {
    assignment.status = 'Completed';
    this.updateSummary();
  }


  
}
