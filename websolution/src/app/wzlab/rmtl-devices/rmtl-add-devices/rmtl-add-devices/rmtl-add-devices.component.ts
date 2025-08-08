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
    start: null as number | null,
    end: null as number | null,
    make: '',
    capacity: '',
    phase: '',
    connection_type: '',
    meter_category: '',
    meter_type: ''
  };

  // CTs
  cts: any[] = [];
  ctRange = {
    start: null as number | null,
    end: null as number | null,
    ct_class: '',
    ct_ratio: ''
  };

  constructor(private deviceService: ApiServicesService) {}

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

  // ---------- Meter table ops ----------
  addDevice(): void {
    this.devices.push({
      serial_number: '',
      make: '',
      capacity: '',
      phase: '',
      connection_type: '',
      meter_category: '',
      meter_type: '',
      remark: ''
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
        if (!line.trim()) continue;
        const [serial_number, make, capacity, phase, connection_type, meter_category, meter_type, remark] = line.split(',');
        if (serial_number) {
          this.devices.push({
            serial_number: serial_number?.trim(),
            make: make?.trim(),
            capacity: capacity?.trim(),
            phase: phase?.trim(),
            connection_type: connection_type?.trim(),
            meter_category: meter_category?.trim(),
            meter_type: meter_type?.trim(),
            remark: remark?.trim()
          });
        }
      }
    };
    reader.readAsText(file);
  }

  addSerialRange(): void {
    const { start, end } = this.serialRange;
    if (!start || !end || start > end) {
      alert('Invalid serial number range.');
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
        meter_type: this.serialRange.meter_type,
        remark: ''
      });
    }

    this.serialRange.start = null;
    this.serialRange.end = null;
  }

  // ---------- CT table ops ----------
  addCT(): void {
    this.cts.push({
      serial_number: '',
      ct_class: '',
      ct_ratio: '',
      remark: ''
    });
  }

  removeCT(index: number): void {
    this.cts.splice(index, 1);
  }

  addCTSerialRange(): void {
    const { start, end, ct_class, ct_ratio } = this.ctRange;
    if (!start || !end || start > end) {
      alert('Invalid CT serial number range.');
      return;
    }

    for (let i = start; i <= end; i++) {
      this.cts.push({
        serial_number: `CT${i}`,
        ct_class,
        ct_ratio,
        remark: ''
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
        if (!line.trim()) continue;
        const [serial_number, ct_class, ct_ratio, remark] = line.split(',');
        if (serial_number) {
          this.cts.push({
            serial_number: serial_number?.trim(),
            ct_class: ct_class?.trim(),
            ct_ratio: ct_ratio?.trim(),
            remark: remark?.trim()
          });
        }
      }
    };
    reader.readAsText(file);
  }

  // ---------- Helpers for building payload ----------
  private todayISO(): string {
    // yyyy-MM-dd (date only) to match your sample
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  }

  private baseRecord() {
    // Pull location details safely from filteredSources (if you fetched them)
    const location_code =
      this.filteredSources?.code || this.filteredSources?.location_code || null;
    const location_name =
      this.filteredSources?.name || this.filteredSources?.location_name || null;

    return {
      inward_number: '',  // <— swap if you have a dedicated inward no
      dispatch_number: '',                               // fill when available
      date_of_entry: this.todayISO(),
      lab_id: 1,
      manufacturing_month_year: null,
      consumer_no: null,
      consumer_name: null,
      office_type: this.selectedSourceType || null,
      location_code,
      location_name,
      remark: null,
      standard: null,
      communication_protocol: null,
      testing_for: null,
      initiator: 'CIS'
    };
  }

 // ---------- SUBMIT: Meters as array in required schema ----------
submitDevices(): void {
  if (!this.devices.length) {
    alert('No meter rows to submit.');
    return;
  }

  const payload: any[] = this.devices.map((d: any) => {
    const base = this.baseRecord();
    return {
      ...base,
      device_type: 'METER',
      serial_number: (d.serial_number || '').trim(),
      make: (d.make || '').trim() || null,
      capacity: d.capacity || null,
      phase: d.phase || null,
      meter_category: d.meter_category || null,
      meter_type: d.meter_type?.trim() || null,
      connection_type: d.connection_type || null,
      voltage_rating: '230V',
      current_rating: '5-30A',
      ct_class: null,
      ct_ratio: null
    };
  });

  // call bulk endpoint (see service below)
  this.deviceService.addnewdevice(payload).subscribe({
    next: () => {
      alert('Meters added!');
      this.devices = [];
    },
    error: (err) => {
      console.error(err);
      alert('Error while submitting meters');
    }
  });
}

// ---------- SUBMIT: CTs as array in required schema ----------
submitCTs(): void {
  if (!this.cts.length) {
    alert('No CT rows to submit.');
    return;
  }

  const payload: any[] = this.cts.map((ct: any) => {
    const base = this.baseRecord();
    return {
      ...base,
      device_type: 'CT',
      serial_number: (ct.serial_number || '').trim(),
      make: null,              // set if you capture CT make
      capacity: null,
      phase: null,
      meter_category: null,
      meter_type: null,
      connection_type: null,
      voltage_rating: null,
      current_rating: null,
      ct_class: ct.ct_class || null,
      ct_ratio: ct.ct_ratio || null
    };
  });

  this.deviceService.addnewdevice(payload).subscribe({
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


  // ---------- Modal plumbing ----------
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
}
