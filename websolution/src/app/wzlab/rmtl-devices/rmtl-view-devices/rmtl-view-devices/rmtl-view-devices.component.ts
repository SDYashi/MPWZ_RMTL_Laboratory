import { Component } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-view-devices',
  templateUrl: './rmtl-view-devices.component.html',
  styleUrls: ['./rmtl-view-devices.component.css']
})
export class RmtlViewDevicesComponent {


  devices: any[] = [];
  constructor( private api: ApiServicesService) {}

  ngOnInit(): void {
    // Simulating API response
    // this.devices = [
    //   {
    //     id: 0,
    //     inward_number: 'INW-1-2025-001',
    //     dispatch_number: '',
    //     device_type: 'METER',
    //     serial_number: 'SN1234567890',
    //     make: 'HPL',
    //     capacity: '5-30 AMPERE',
    //     date_of_entry: '2025-08-06',
    //     phase: '1P',
    //     manufacturing_month_year: '07/2025',
    //     lab_id: 1,
    //     consumer_no: 'C001122',
    //     consumer_name: 'Ram Kumar',
    //     office_type: 'STORE',
    //     location_code: 'LC001',
    //     location_name: 'Indore',
    //     initiator: 'CIS',
    //     transaction_type: '',
    //     transaction_amount: 0,
    //     transaction_number: '',
    //     transaction_datetime: '2025-08-06T12:26:00.211Z',
    //     payment_remarks: '',
    //     meter_category: 'DLMS',
    //     meter_type: 'NET METER',
    //     remark: 'Testing purpose',
    //     box_number: 'B001',
    //     device_status: 'INWARDED',
    //     warranty_period: 66,
    //     connection_type: 'HT',
    //     voltage_rating: '230V',
    //     current_rating: '5-30A',
    //     ct_class: '0.2',
    //     ct_ratio: '100/5',
    //     standard: 'IS13779',
    //     communication_protocol: 'MODBUS',
    //     testing_for: 'Routine Check',
    //     created_at: '2025-08-06T12:26:00.211Z',
    //     updated_at: '2025-08-06T12:26:00.211Z',
    //     created_by: 1,
    //     updated_by: 1
    //   }
    // ];

    this.api.getDevices().subscribe({
      next: (response) => {
        this.devices = response;
      },
      error: (error) => {
        console.error('Error fetching devices:', error);
      }
    });
  }

}
