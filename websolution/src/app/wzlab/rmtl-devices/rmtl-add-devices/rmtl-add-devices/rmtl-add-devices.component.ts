import { Component, OnInit } from '@angular/core';
import { Device } from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { AfterViewInit, ElementRef, ViewChild } from '@angular/core';
declare var bootstrap: any;


@Component({
  selector: 'app-rmtl-add-devices',
  templateUrl: './rmtl-add-devices.component.html',
  styleUrls: ['./rmtl-add-devices.component.css']
})
export class RmtlAddDevicesComponent implements OnInit {
  
  sourceTypes: any[] = [];
  selectedSourceType: any = '';
  selectedSourceId: any = '';
  selectedSourceName: any = '';
  payload: any;
  office_types: any[] = [];

  // Mock source list
  allSources: any[] = [];
  filteredSources: any;

  // Devices
  devices: any[] = [];


// Dropdown options
makes = [];
capacities = [];
phases = [];
meter_categories = [];
meterTypes = [];

// Range form model
serialRange = {
  start: null,
  end: null,
  make: '',
  capacity: '',
  phase: '',
  connection_type: '',
  meter_category: '',
  meter_type: ''
};
cts: any[] = [];

ctRange = {
  start: null,
  end: null,
  ct_class: '',
  ct_ratio: ''
};


  constructor(private deviceService: ApiServicesService) {
  
  }
  ngOnInit(): void {
   
     this.deviceService.getEnums().subscribe({
    next: (data) => {
      this.makes = data.makes;
      this.capacities = data.capacities;
      this.phases = data.phases;
      this.meter_categories = data.meter_categories;
      this.meterTypes = data.meter_types;
      this.office_types = data.office_types;
    },
    error: (error) => {
      console.log(error);
    }
   });
  }
    fetchButtonData(): void {
      this.deviceService.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
        next: (data) => {
          this.filteredSources = data;
          // alert(JSON.stringify(this.filteredSources));
          // Disable inputs after successful data fetching
          const sourceTypeInput = document.querySelector('select[name="source_type"]') as HTMLSelectElement;
          const sourceNameInput = document.querySelector('input[name="source_name"]') as HTMLInputElement;
          if (sourceTypeInput && sourceNameInput) {
            sourceTypeInput.disabled = true;
            sourceNameInput.disabled = true;
          }

        },
        error: (error) => {
          console.log(error);
        
        }
      }); 
    }

  onSourceTypeChange(): void {
      this.selectedSourceName = '';
      this.filteredSources = [];

  }

  addDevice(): void {
    this.devices.push({
      serial_number: '',
      make: '',
      capacity: '',
      phase: '',
      connection_type: '',
      meter_category: '',
      meter_type: ''
    });
  }

  removeDevice(index: number): void {
    this.devices.splice(index, 1);
  }

  handleCSVUpload(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const lines = e.target.result.split('\n');
      for (let line of lines.slice(1)) {
        const [serial_number, make, capacity, phase, connection_type, meter_category, meter_type] = line.split(',');
        if (serial_number) {
          this.devices.push({ serial_number, make, capacity, phase, connection_type, meter_category, meter_type });
        }
      }
    };
    reader.readAsText(file);
  }

addSerialRange(): void {
  const { start, end } = this.serialRange;
  if (!start || !end || start > end) {
    alert("Invalid serial number range.");
    return;
  }

  for (let i = start; i <= end; i++) {
    this.devices.push({
      serial_number: `SN${i}`,
      make: this.serialRange.make,
      capacity: this.serialRange.capacity,
      phase: this.serialRange.phase,
      connection_type: this.serialRange.connection_type,
      meter_category: this.serialRange.meter_category,
      meter_type: this.serialRange.meter_type
    });
  }

  this.serialRange.start = null;
  this.serialRange.end = null;
}

submitDevices(): void {
  const deviceList = this.devices.map(device => ({
    serial_number: device.serial_number,
    make: device.make,
    capacity: device.capacity,
    phase: device.phase,
    connection_type: device.connection_type,
    meter_category: device.meter_category,
    meter_type: device.meter_type?.trim(),  // Trim \r or extra space
    source_type: this.selectedSourceType,
    source_id: this.selectedSourceName,
    created_at: new Date().toISOString()
  }));

  const payload = { ...this.serialRange, devices: deviceList };  // Create a new object with `serialRange` properties and `devices` property

  this.deviceService.addnewdevice(payload as unknown as Device).subscribe({
    next: () => {
      alert('Devices added!');
      this.devices = [];
    },
    error: (err) => {
      console.error(err);
      alert('Error while submitting devices');
    }
  });
}

  @ViewChild('alertModal') alertModalElement!: ElementRef;

  alertTitle: string = '';
  alertMessage: string = '';
  alertInstance: any;

  ngAfterViewInit(): void {
    const modalEl = document.getElementById('alertModal');
    if (modalEl) {
      this.alertInstance = new bootstrap.Modal(modalEl);
    }
  }

  showAlert(title: string, message: string): void {
    this.alertTitle = title;
    this.alertMessage = message;
    if (this.alertInstance) {
      this.alertInstance.show();
    }

}

addCT(): void {
  this.cts.push({
    serial_number: '',
    ct_class: '',
    ct_ratio: ''
  });
}

removeCT(index: number): void {
  this.cts.splice(index, 1);
}

addCTSerialRange(): void {
  const { start, end, ct_class, ct_ratio } = this.ctRange;
  if (!start || !end || start > end) {
    alert("Invalid CT serial number range.");
    return;
  }

  for (let i = start; i <= end; i++) {
    this.cts.push({
      serial_number: `CT${i}`,
      ct_class,
      ct_ratio
    });
  }

  this.ctRange = { start: null, end: null, ct_class: '', ct_ratio: '' };
}

handleCTCSVUpload(event: any): void {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e: any) => {
    const lines = e.target.result.split('\n');
    for (let line of lines.slice(1)) {
      const [serial_number, ct_class, ct_ratio] = line.split(',');
      if (serial_number) {
        this.cts.push({ serial_number, ct_class, ct_ratio });
      }
    }
  };
  reader.readAsText(file);
}

submitCTs(): void {
  const ctList = this.cts.map(ct => ({
    serial_number: ct.serial_number,
    ct_class: ct.ct_class,
    ct_ratio: ct.ct_ratio,
    source_type: this.selectedSourceType,
    source_id: this.selectedSourceName,
    created_at: new Date().toISOString()
  }));

  const payload = {
    ct_class: this.ctRange.ct_class,
    ct_ratio: this.ctRange.ct_ratio,
    devices: ctList
  };

  this.deviceService.addnewdevice(payload as unknown as Device).subscribe({
    next: () => {
      alert('CTs added!');
      this.cts = [];
    },
    error: (err) => {
      console.error(err);
      alert('Error while submitting CTs');
    }
  });
}




}



