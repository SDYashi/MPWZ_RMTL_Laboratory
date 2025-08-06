import { Component } from '@angular/core';

@Component({
  selector: 'app-rmtl-assigned-list',
  templateUrl: './rmtl-assigned-list.component.html',
  styleUrls: ['./rmtl-assigned-list.component.css']
})
export class RmtlAssignedListComponent {

 searchTerm = '';
  assignmentHistory: any[] = [];
  filteredHistory: any[] = [];

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    // Replace with real API call
    this.assignmentHistory = [
      {
        inward_no: 'INW-1001',
        device: 'Meter A',
        status: 'ASSIGNED',
        assigned_to: 'User1',
        assigned_by: 'Admin',
        date: new Date('2025-08-05T09:30:00')
      },
      {
        inward_no: 'INW-1002',
        device: 'Meter B',
        status: 'COMPLETED',
        assigned_to: 'User2',
        assigned_by: 'Admin',
        date: new Date('2025-08-06T12:15:00')
      },
      {
        inward_no: 'INW-1003',
        device: 'Meter C',
        status: 'PENDING',
        assigned_to: 'User3',
        assigned_by: 'Supervisor',
        date: new Date('2025-08-07T14:20:00')
      }
    ];

    this.filteredHistory = [...this.assignmentHistory];
  }

  filterHistory(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredHistory = this.assignmentHistory.filter(record =>
      record.device.toLowerCase().includes(term) ||
      record.assigned_to.toLowerCase().includes(term) ||
      record.assigned_by.toLowerCase().includes(term)
    );
  }
}
