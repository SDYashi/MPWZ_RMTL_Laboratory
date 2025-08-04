import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
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
export class LabViewListComponent {

}
