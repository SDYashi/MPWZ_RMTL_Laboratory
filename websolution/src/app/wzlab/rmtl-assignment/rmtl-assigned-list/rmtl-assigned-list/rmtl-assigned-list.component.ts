import { Component } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-assigned-list',
  templateUrl: './rmtl-assigned-list.component.html',
  styleUrls: ['./rmtl-assigned-list.component.css']
})
export class RmtlAssignedListComponent {
  statusQuery :any;
   searchTerm = '';
   selectedStatus = 'ASSIGNED';
  assignmentHistory: any[] = [];
  filteredHistory: any[] = [];

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    this.loadHistory();
  }
  
  assignmentStatuses: string[] = [];

  ngAfterViewInit(): void {
    this.api.getEnums().subscribe({
      next: (response) => {
        this.assignmentStatuses = response.assignment_statuses || [];
      },
      error: (error) => {
        console.error('Error fetching assignment statuses:', error);
      }
    });
  }

  loadHistory(): void {
    this.filteredHistory = [];
    this.api.getAssignmentsByStatus( this.selectedStatus).subscribe({
      next: (response) => {
        this.assignmentHistory = response || [];
        this.filterHistory();
      },
      error: (error) => {
        console.error('Error fetching assignment history:', error);
      }
    });
  }

  filterHistory(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredHistory = this.assignmentHistory.filter(record =>
      record?.device?.serial_number?.toLowerCase().includes(term) ||
      record?.user_assigned?.name?.toLowerCase().includes(term) ||
      record?.assigned_by_user?.name?.toLowerCase().includes(term)
    );
  }
}