import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
declare var bootstrap: any;

@Component({
  selector: 'app-rmtl-add-devices',
  templateUrl: './rmtl-add-devices.component.html',
  styleUrls: ['./rmtl-add-devices.component.css']
})
export class RmtlAddDevicesComponent implements OnInit, AfterViewInit {
  // Shared source (Meters + CTs)
  office_types: string[] = [];
  selectedSourceType: string = '';
  selectedSourceName: string = '';
  filteredSources: any = null;

  // Enums
  makes: string[] = [];
  capacities: string[] = [];
  phases: string[] = [];
  meter_categories: string[] = [];
  meterTypes: string[] = [];
  ct_classes: string[] = [];
  ct_ratios: string[] = [];
  connection_types: string[] = [];
  voltage_ratings: string[] = [];   // NEW
  current_ratings: string[] = [];   // NEW

  // Meters (manual + CSV + range)
  devices: any[] = [];
  serialRange = {
    start: null as number | null,
    end: null as number | null,
    make: '',
    capacity: '',
    phase: '',
    connection_type: '',
    meter_category: '',
    meter_type: '',
    voltage_rating: '',            // optional in UI, enforced at submit
    current_rating: ''             // optional in UI, enforced at submit
  };

  // CTs (manual + CSV + range)
  cts: any[] = [];
  ctRange = {
    start: null as number | null,
    end: null as number | null,
    ct_class: '',
    ct_ratio: ''
  };

  // CT defaults (used for new rows, range, CSV fallback)
  ctMeta = {
    make: '',
    capacity: '',
    phase: '',
    meter_category: '',
    meter_type: '',
    connection_type: '',
    voltage_rating: '',           // NEW
    current_rating: ''            // NEW
  };

  // Alert modal
  @ViewChild('alertModal') alertModalElement!: ElementRef;
  alertTitle: string = '';
  alertMessage: string = '';
  alertInstance: any;

  constructor(private deviceService: ApiServicesService) {}

  ngOnInit(): void {
    this.deviceService.getEnums().subscribe({
      next: (data) => {
        this.makes = data?.makes || [];
        this.capacities = data?.capacities || [];
        this.phases = data?.phases || [];
        this.meter_categories = data?.meter_categories || [];
        this.meterTypes = data?.meter_types || [];
        this.office_types = data?.office_types || [];
        this.ct_classes = data?.ct_classes || [];
        this.ct_ratios = data?.ct_ratios || [];
        this.connection_types = data?.connection_types || ['HT', 'LT'];
        this.voltage_ratings = data?.voltage_ratings || ['230V'];   // sensible default
        this.current_ratings = data?.current_ratings || ['5-30A'];  // sensible default

        // Safe defaults to satisfy backend NOT NULL + enum validators
        this.ctMeta.make = this.makes.includes('HPL') ? 'HPL' : (this.makes[0] || '');
        this.ctMeta.capacity = this.capacities.includes('CT OPERATED') ? 'CT OPERATED' : (this.capacities[0] || '');
        this.ctMeta.phase = this.phases.includes('ALL') ? 'ALL' : (this.phases[0] || '');
        this.ctMeta.meter_category = this.meter_categories?.[0] || (this.meter_categories[0] || '');
        this.ctMeta.meter_type = this.meterTypes.includes('CT') ? 'CT' : (this.meterTypes[0] || '');
        this.ctMeta.connection_type = this.connection_types.includes('LT') ? 'LT' : (this.connection_types[0] || 'LT');
        this.ctMeta.voltage_rating = this.voltage_ratings[0] || '230V';
        this.ctMeta.current_rating = this.current_ratings[0] || '5-30A';

        // defaults for meter range form too
        this.serialRange.connection_type = this.connection_types[0] || 'LT';
        this.serialRange.meter_type = this.meterTypes[0] || this.ctMeta.meter_type;
        this.serialRange.voltage_rating = this.voltage_ratings[0] || '230V';
        this.serialRange.current_rating = this.current_ratings[0] || '5-30A';
      },
      error: (error) => {
        console.error(error);
        this.showAlert('Error', 'Failed to load dropdown data.');
      }
    });
  }

  ngAfterViewInit(): void {
    const modalEl = document.getElementById('alertModal');
    if (modalEl) {
      this.alertInstance = new bootstrap.Modal(modalEl);
    }
  }

  // ---------- Source fetch ----------
  fetchButtonData(): void {
    if (!this.selectedSourceType || !this.selectedSourceName) {
      this.showAlert('Missing Input', 'Please select Source Type and enter Location/Store/Vendor Code.');
      return;
    }
    this.deviceService.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
      next: (data) => (this.filteredSources = data),
      error: (error) => {
        console.error(error);
        this.showAlert('Error', 'Failed to fetch source details. Check the code and try again.');
      }
    });
  }

  onSourceTypeChange(): void {
    this.selectedSourceName = '';
    this.filteredSources = null;
  }

  // ---------- Clamp helpers ----------
  private pickFrom(list: string[], v?: string, fallback?: string): string {
    if (v && list.includes(v)) return v;
    return list[0] || fallback || '';
  }
  private pickMake(v?: string) { return this.pickFrom(this.makes, v); }
  private pickCapacity(v?: string) { return this.pickFrom(this.capacities, v); }
  private pickPhase(v?: string) { return this.pickFrom(this.phases, v); }
  private pickCategory(v?: string) { return this.pickFrom(this.meter_categories, v, 'NA'); }
  private pickMeterType(v?: string) {
    if (v && this.meterTypes.includes(v)) return v;
    return this.meterTypes.includes('CT') ? 'CT' : (this.meterTypes[0] || 'GENERIC');
  }
  private pickConnectionType(v?: string) { return this.pickFrom(this.connection_types, v, 'LT'); }
  private pickVoltageRating(v?: string) { return this.pickFrom(this.voltage_ratings, v, '230V'); }  // NEW
  private pickCurrentRating(v?: string) { return this.pickFrom(this.current_ratings, v, '5-30A'); } // NEW

  // ---------- Meters ops ----------
  addDevice(): void {
    this.devices.push({
      serial_number: '',
      make: this.pickMake(),
      capacity: this.pickCapacity(),
      phase: this.pickPhase(),
      connection_type: this.pickConnectionType(),
      meter_category: this.pickCategory(),
      meter_type: this.pickMeterType(this.meterTypes[0]),
      voltage_rating: this.pickVoltageRating(),   // NEW
      current_rating: this.pickCurrentRating(),   // NEW
      remark: ''
    });
  }
  removeDevice(index: number): void {
    this.devices.splice(index, 1);
  }

  handleCSVUpload(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result as string;
      const lines = text.split(/\r?\n/);
      // header can be:
      // serial_number,make,capacity,phase,connection_type,meter_category,meter_type,remark[,voltage_rating,current_rating]
      for (const line of lines.slice(1)) {
        if (!line.trim()) continue;
        const cols = line.split(',');
        const [
          serial_number, make, capacity, phase, connection_type, meter_category, meter_type, remark,
          voltage_rating, current_rating
        ] = cols;

        if (serial_number?.trim()) {
          this.devices.push({
            serial_number: serial_number.trim(),
            make: this.pickMake((make || '').trim()),
            capacity: this.pickCapacity((capacity || '').trim()),
            phase: this.pickPhase((phase || '').trim()),
            connection_type: this.pickConnectionType((connection_type || '').trim()),
            meter_category: this.pickCategory((meter_category || '').trim()),
            meter_type: this.pickMeterType((meter_type || '').trim()),
            voltage_rating: this.pickVoltageRating((voltage_rating || '').trim()), // NEW
            current_rating: this.pickCurrentRating((current_rating || '').trim()), // NEW
            remark: (remark || '').trim() || ''
          });
        }
      }
    };
    reader.readAsText(file);
  }

  addSerialRange(): void {
    const { start, end } = this.serialRange;
    if (!start || !end || start > end) {
      this.showAlert('Invalid Range', 'Please provide a valid serial number range.');
      return;
    }
    for (let i = start; i <= end; i++) {
      this.devices.push({
        serial_number: `SN${i}`,
        make: this.pickMake(this.serialRange.make),
        capacity: this.pickCapacity(this.serialRange.capacity),
        phase: this.pickPhase(this.serialRange.phase),
        connection_type: this.pickConnectionType(this.serialRange.connection_type),
        meter_category: this.pickCategory(this.serialRange.meter_category),
        meter_type: this.pickMeterType(this.serialRange.meter_type),
        voltage_rating: this.pickVoltageRating(this.serialRange.voltage_rating), // NEW
        current_rating: this.pickCurrentRating(this.serialRange.current_rating), // NEW
        remark: ''
      });
    }
    this.serialRange.start = null;
    this.serialRange.end = null;
  }

  // ---------- CT ops ----------
  addCT(): void {
    this.cts.push({
      serial_number: '',
      ct_class: '',
      ct_ratio: '',
      make: this.ctMeta.make,
      capacity: this.ctMeta.capacity,
      phase: this.ctMeta.phase,
      meter_category: this.ctMeta.meter_category,
      meter_type: this.ctMeta.meter_type,
      connection_type: this.ctMeta.connection_type,
      voltage_rating: this.ctMeta.voltage_rating,   // NEW
      current_rating: this.ctMeta.current_rating,   // NEW
      remark: ''
    });
  }
  removeCT(index: number): void {
    this.cts.splice(index, 1);
  }

  addCTSerialRange(): void {
    const { start, end, ct_class, ct_ratio } = this.ctRange;
    if (!start || !end || start > end) {
      this.showAlert('Invalid Range', 'Please provide a valid CT serial number range.');
      return;
    }
    for (let i = start; i <= end; i++) {
      this.cts.push({
        serial_number: `CT${i}`,
        ct_class: (ct_class || '').trim(),
        ct_ratio: (ct_ratio || '').trim(),
        make: this.ctMeta.make,
        capacity: this.ctMeta.capacity,
        phase: this.ctMeta.phase,
        meter_category: this.ctMeta.meter_category,
        meter_type: this.ctMeta.meter_type,
        connection_type: this.ctMeta.connection_type,
        voltage_rating: this.ctMeta.voltage_rating,   // NEW
        current_rating: this.ctMeta.current_rating,   // NEW
        remark: ''
      });
    }
    this.ctRange = { start: null, end: null, ct_class: '', ct_ratio: '' };
  }

  handleCTCSVUpload(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result as string;
      const lines = text.split(/\r?\n/);
      // header can be:
      // serial_number,ct_class,ct_ratio,make,capacity,phase,meter_category,meter_type,connection_type,voltage_rating,current_rating,remark
      for (const line of lines.slice(1)) {
        if (!line.trim()) continue;
        const cols = line.split(',');
        const [
          serial_number, ct_class, ct_ratio,
          make, capacity, phase, meter_category, meter_type, connection_type,
          voltage_rating, current_rating, remark
        ] = cols;

        if (serial_number?.trim()) {
          const mk   = this.pickMake((make || this.ctMeta.make).trim());
          const cap  = this.pickCapacity((capacity || this.ctMeta.capacity).trim());
          const ph   = this.pickPhase((phase || this.ctMeta.phase).trim());
          const cat  = this.pickCategory((meter_category || this.ctMeta.meter_category).trim());
          const mt   = this.pickMeterType((meter_type || this.ctMeta.meter_type).trim());
          const conn = this.pickConnectionType((connection_type || this.ctMeta.connection_type).trim());
          const vr   = this.pickVoltageRating((voltage_rating || this.ctMeta.voltage_rating).trim());
          const cr   = this.pickCurrentRating((current_rating || this.ctMeta.current_rating).trim());

          this.cts.push({
            serial_number: serial_number.trim(),
            ct_class: (ct_class || '').trim(),
            ct_ratio: (ct_ratio || '').trim(),
            make: mk,
            capacity: cap,
            phase: ph,
            meter_category: cat,
            meter_type: mt,
            connection_type: conn,
            voltage_rating: vr,              // NEW
            current_rating: cr,              // NEW
            remark: (remark || '').trim() || ''
          });
        }
      }
    };
    reader.readAsText(file);
  }

  // ---------- Helpers ----------
  private ensureSourceSelected(): boolean {
    if (!this.selectedSourceType || !this.selectedSourceName || !this.filteredSources) {
      this.showAlert('Missing Source Details', 'Please select Source Type, enter Location/Store/Vendor code, and click Fetch before submitting.');
      return false;
    }
    return true;
  }

  private todayISO(): string {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  private baseRecord() {
    const location_code = this.filteredSources?.code || this.filteredSources?.location_code || null;
    const location_name = this.filteredSources?.name || this.filteredSources?.location_name || null;

    return {
      inward_number: '',                 // set if you capture it elsewhere
      dispatch_number: '',               // set when available
      date_of_entry: this.todayISO(),
      lab_id: 1,                         // adjust if dynamic
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

  // ---------- Submit: Meters ----------
  submitDevices(): void {
    if (!this.devices.length) {
      this.showAlert('No Rows', 'No meter rows to submit.');
      return;
    }
    if (!this.ensureSourceSelected()) return;

    const cleaned = this.devices
      .map((d: any) => ({
        serial_number: (d.serial_number || '').trim(),
        make: this.pickMake((d.make || '').trim()),
        capacity: this.pickCapacity((d.capacity || '').trim()),
        phase: this.pickPhase((d.phase || '').trim()),
        connection_type: this.pickConnectionType((d.connection_type || '').trim()),
        meter_category: this.pickCategory((d.meter_category || '').trim()),
        meter_type: this.pickMeterType((d.meter_type || '').trim()),
        voltage_rating: this.pickVoltageRating((d.voltage_rating || '').trim()), // NEW
        current_rating: this.pickCurrentRating((d.current_rating || '').trim()), // NEW
        remark: (d.remark || '').trim() || null
      }))
      .filter(d => d.serial_number);

    if (!cleaned.length) {
      this.showAlert('Invalid Data', 'Please provide at least one valid meter serial number.');
      return;
    }

    const payload = cleaned.map((d: any) => {
      const base = this.baseRecord();
      return {
        ...base,
        device_type: 'METER',
        serial_number: d.serial_number,
        make: d.make,
        capacity: d.capacity,
        phase: d.phase,
        meter_category: d.meter_category,
        meter_type: d.meter_type,                // NEVER null
        connection_type: d.connection_type,      // NEVER null
        voltage_rating: d.voltage_rating,        // NEVER null
        current_rating: d.current_rating,        // NEVER null
        ct_class: null,
        ct_ratio: null,
        remark: d.remark
      };
    });

    this.deviceService.addnewdevice(payload).subscribe({
      next: () => {
        this.showAlert('Success', 'Meters added!');
        this.devices = [];
      },
      error: (err) => {
        console.error(err);
        this.showAlert('Error', 'Error while submitting meters.');
      }
    });
  }

  // ---------- Submit: CTs ----------
  submitCTs(): void {
    if (!this.cts.length) {
      this.showAlert('No Rows', 'No CT rows to submit.');
      return;
    }
    if (!this.ensureSourceSelected()) return;

    const cleaned = this.cts
      .map((ct: any) => ({
        serial_number: (ct.serial_number || '').trim(),
        ct_class: (ct.ct_class || '').trim() || null,
        ct_ratio: (ct.ct_ratio || '').trim() || null,
        make: this.pickMake((ct.make || this.ctMeta.make).trim()),
        capacity: this.pickCapacity((ct.capacity || this.ctMeta.capacity).trim()),
        phase: this.pickPhase((ct.phase || this.ctMeta.phase).trim()),
        meter_category: this.pickCategory((ct.meter_category || this.ctMeta.meter_category).trim()),
        meter_type: this.pickMeterType((ct.meter_type || this.ctMeta.meter_type).trim()),
        connection_type: this.pickConnectionType((ct.connection_type || this.ctMeta.connection_type).trim()),
        voltage_rating: this.pickVoltageRating((ct.voltage_rating || this.ctMeta.voltage_rating).trim()), // NEW
        current_rating: this.pickCurrentRating((ct.current_rating || this.ctMeta.current_rating).trim()), // NEW
        remark: (ct.remark || '').trim() || null
      }))
      .filter(ct => ct.serial_number);

    if (!cleaned.length) {
      this.showAlert('Invalid Data', 'Please provide at least one valid CT serial number.');
      return;
    }

    const payload = cleaned.map((ct: any) => {
      const base = this.baseRecord();
      return {
        ...base,
        device_type: 'CT',
        serial_number: ct.serial_number,
        // enums required by backend for CTs as well:
        make: ct.make,
        capacity: ct.capacity,
        phase: ct.phase,
        meter_category: ct.meter_category,         // NEVER null
        meter_type: ct.meter_type,                 // NEVER null
        connection_type: ct.connection_type,       // NEVER null
        voltage_rating: ct.voltage_rating,         // NEVER null
        current_rating: ct.current_rating,         // NEVER null
        // CT-specific fields
        ct_class: ct.ct_class,
        ct_ratio: ct.ct_ratio,
        remark: ct.remark
      };
    });

    this.deviceService.addnewdevice(payload).subscribe({
      next: () => {
        this.showAlert('Success', 'CTs added!');
        this.cts = [];
      },
      error: (err) => {
        console.error(err);
        this.showAlert('Error', 'Error while submitting CTs.');
      }
    });
  }

  // ---------- Modal helper ----------
  showAlert(title: string, message: string): void {
    this.alertTitle = title;
    this.alertMessage = message;
    if (this.alertInstance) {
      this.alertInstance.show();
    }
  }
}
