import { Component, OnInit, AfterViewInit } from '@angular/core';
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
  meter_subcategory: string[] = [];
  meterTypes: string[] = [];
  ct_classes: string[] = [];
  ct_ratios: string[] = [];
  connection_types: string[] = [];
  voltage_ratings: string[] = [];
  current_ratings: string[] = [];
  device_testing_purpose: string[] = [];

  // NEW: default testing purpose for meters UI
  meterDefaultPurpose: string = 'ROUTINE'; // will be set from enums

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
    meter_subcategory: '',
    meter_type: '',
    voltage_rating: '',
    current_rating: '',
    remark: '',
    serial_number: '',
    ct_class: '',
    ct_ratio: '',
    device_testing_purpose: '' // keep filled via defaults
  };

  // CTs (manual + CSV + range)
  cts: any[] = [];
  ctRange = this.defaultCtRange();

  // CT defaults (used for new rows, range, CSV fallback)
  ctMeta = {
    make: '',
    capacity: '',
    phase: '',
    meter_category: '',
    meter_subcategory: '',
    meter_type: '',
    connection_type: '',
    voltage_rating: '',
    current_rating: '',
    serial_number: '',
    ct_class: '',
    ct_ratio: '',
    remark: '',
    device_testing_purpose: '' // ensure default
  };

  // Alert modal
  alertTitle: string = '';
  alertMessage: string = '';
  alertInstance: any;

  // Lab
  labId: number | null = null;
  meter_subcategories: string[] = [];

  constructor(private deviceService: ApiServicesService) {}

  // ---------- Lifecycle ----------
  ngOnInit(): void {
    // Enums for dropdowns
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
        this.voltage_ratings = data?.voltage_ratings || ['230V'];
        this.current_ratings = data?.current_ratings || ['5-30A'];
        this.device_testing_purpose = data?.device_testing_purposes || [];
        this.meter_subcategories = data?.meter_sub_categories || [];

        // Ensure at least one valid Testing Purpose // NEW
        if (!this.device_testing_purpose.length) {
          this.device_testing_purpose = ['ROUTINE'];
        }
        this.meterDefaultPurpose = this.device_testing_purpose[0] || 'ROUTINE';

        // Defaults for CT meta / CSV fallback
        this.ctMeta.make = this.makes[0] || '';
        this.ctMeta.capacity = this.capacities[0] || '';
        this.ctMeta.phase = this.phases[0] || '';
        this.ctMeta.meter_category = this.meter_categories[0] || '';
        this.ctMeta.meter_type = this.meterTypes[0] || '';
        this.ctMeta.connection_type = this.connection_types[0] || 'LT';
        this.ctMeta.voltage_rating = this.voltage_ratings[0] || '230V';
        this.ctMeta.current_rating = this.current_ratings[0] || '5-30A';
        this.ctMeta.device_testing_purpose = this.meterDefaultPurpose; // UPDATED

        // Defaults for meter range form
        this.serialRange.connection_type = this.connection_types[0] || 'LT';
        this.serialRange.meter_type = this.meterTypes[0] || this.ctMeta.meter_type;
        this.serialRange.voltage_rating = this.voltage_ratings[0] || '230V';
        this.serialRange.current_rating = this.current_ratings[0] || '5-30A';
        this.serialRange.device_testing_purpose = this.meterDefaultPurpose; // UPDATED
      },
      error: (error) => {
        console.error(error);
        this.showAlert('Error', 'Failed to load dropdown data.');
      }
    });

    // Lab ID from storage / token
    const labIdStr = localStorage.getItem('currentLabId') ?? localStorage.getItem('lab_id');
    if (labIdStr && !isNaN(Number(labIdStr))) {
      this.labId = Number(labIdStr);
    } else {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1] || ''));
          const raw = payload?.lab_id ?? payload?.labId ?? payload?.user?.lab_id;
          this.labId = (raw !== undefined && !isNaN(Number(raw))) ? Number(raw) : null;
        } catch { this.labId = null; }
      }
    }
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
  private picksubcategory(v?: string) {  return this.pickFrom(this.meter_subcategory, v, 'NA');}
  private pickMeterType(v?: string) {
    if (v && this.meterTypes.includes(v)) return v;
    return this.meterTypes[0] || 'GENERIC';
  }
  private pickConnectionType(v?: string) { return this.pickFrom(this.connection_types, v, 'LT'); }
  private pickVoltageRating(v?: string) { return this.pickFrom(this.voltage_ratings, v, '230V'); }
  private pickCurrentRating(v?: string) { return this.pickFrom(this.current_ratings, v, '5-30A'); }

  // UPDATED: prefer user-chosen meterDefaultPurpose when v is empty
  private pickPurpose(v?: string) {
    return this.pickFrom(this.device_testing_purpose, v, this.meterDefaultPurpose || this.device_testing_purpose[0] || 'ROUTINE');
  }
  // NEW: hard ensure non-empty
  private resolvePurpose(v?: string) {
    const val = (v || '').trim();
    if (val && this.device_testing_purpose.includes(val)) return val;
    return this.meterDefaultPurpose || this.device_testing_purpose[0] || 'ROUTINE';
  }

  // ---------- Meters ops ----------
  addDevice(): void {
    this.devices.push({
      serial_number: '',
      make: this.pickMake(),
      capacity: this.pickCapacity(),
      phase: this.pickPhase(),
      connection_type: this.pickConnectionType(),
      meter_category: this.pickCategory(),
      meter_subcategory: this.picksubcategory(),
      meter_type: this.pickMeterType(this.meterTypes[0]),
      voltage_rating: this.pickVoltageRating(),
      current_rating: this.pickCurrentRating(),
      remark: '',
      ct_class: '',
      ct_ratio: '',
      device_testing_purpose: this.resolvePurpose() // UPDATED
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

      // Header:
      // serial_number,make,capacity,phase,connection_type,meter_category,meter_subcategory,meter_type,remark,voltage_rating,current_rating,device_testing_purpose,ct_class,ct_ratio
      for (const line of lines.slice(1)) {
        if (!line.trim()) continue;
        const cols = line.split(',');
        const [
          serial_number, make, capacity, phase, connection_type, meter_category, meter_subcategory,
          meter_type, remark, voltage_rating, current_rating, device_testing_purpose, ct_class, ct_ratio
        ] = cols;

        if (serial_number?.trim()) {
          this.devices.push({
            serial_number: serial_number.trim(),
            make: this.pickMake((make || '').trim()),
            capacity: this.pickCapacity((capacity || '').trim()),
            phase: this.pickPhase((phase || '').trim()),
            connection_type: this.pickConnectionType((connection_type || '').trim()),
            meter_category: this.pickCategory((meter_category || '').trim()),
            meter_subcategory: this.picksubcategory((meter_subcategory || '').trim()),
            meter_type: this.pickMeterType((meter_type || '').trim()),
            voltage_rating: this.pickVoltageRating((voltage_rating || '').trim()),
            current_rating: this.pickCurrentRating((current_rating || '').trim()),
            device_testing_purpose: this.resolvePurpose((device_testing_purpose || '').trim()), // UPDATED
            ct_class: (ct_class || '').trim(),
            ct_ratio: (ct_ratio || '').trim(),
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
        meter_subcategory: (this.serialRange.meter_subcategory || '').trim(),
        meter_type: this.pickMeterType(this.serialRange.meter_type),
        voltage_rating: this.pickVoltageRating(this.serialRange.voltage_rating),
        current_rating: this.pickCurrentRating(this.serialRange.current_rating),
        device_testing_purpose: this.resolvePurpose(this.serialRange.device_testing_purpose), // UPDATED
        ct_class: (this.serialRange.ct_class || '').trim(),
        ct_ratio: (this.serialRange.ct_ratio || '').trim(),
        remark: (this.serialRange.remark || '').trim()
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
      meter_subcategory: this.ctMeta.meter_subcategory,
      meter_type: this.ctMeta.meter_type,
      connection_type: this.ctMeta.connection_type,
      voltage_rating: this.ctMeta.voltage_rating,
      current_rating: this.ctMeta.current_rating,
      device_testing_purpose: this.resolvePurpose(this.ctMeta.device_testing_purpose), // UPDATED
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
        meter_subcategory: this.ctMeta.meter_subcategory,
        meter_type: this.ctMeta.meter_type,
        connection_type: this.ctMeta.connection_type,
        voltage_rating: this.ctMeta.voltage_rating,
        current_rating: this.ctMeta.current_rating,
        device_testing_purpose: this.resolvePurpose(this.ctMeta.device_testing_purpose), // UPDATED
        remark: ''
      });
    }
    this.ctRange = this.defaultCtRange();
  }

  handleCTCSVUpload(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result as string;
      const lines = text.split(/\r?\n/);

      // Header:
      // serial_number,ct_class,ct_ratio,make,capacity,phase,meter_category,meter_subcategory,meter_type,connection_type,voltage_rating,current_rating,device_testing_purpose,remark
      for (const line of lines.slice(1)) {
        if (!line.trim()) continue;
        const cols = line.split(',');
        const [
          serial_number, ct_class, ct_ratio,
          make, capacity, phase, meter_category, meter_subcategory, meter_type, connection_type,
          voltage_rating, current_rating, device_testing_purpose, remark
        ] = cols;

        if (serial_number?.trim()) {
          const mk   = this.pickMake((make || this.ctMeta.make).trim());
          const cap  = this.pickCapacity((capacity || this.ctMeta.capacity).trim());
          const ph   = this.pickPhase((phase || this.ctMeta.phase).trim());
          const cat  = this.pickCategory((meter_category || this.ctMeta.meter_category).trim());
          const sub  = (meter_subcategory || this.ctMeta.meter_subcategory || '').trim();
          const mt   = this.pickMeterType((meter_type || this.ctMeta.meter_type).trim());
          const conn = this.pickConnectionType((connection_type || this.ctMeta.connection_type).trim());
          const vr   = this.pickVoltageRating((voltage_rating || this.ctMeta.voltage_rating).trim());
          const cr   = this.pickCurrentRating((current_rating || this.ctMeta.current_rating).trim());
          const purp = this.resolvePurpose((device_testing_purpose || this.ctMeta.device_testing_purpose).trim()); // UPDATED

          this.cts.push({
            serial_number: serial_number.trim(),
            ct_class: (ct_class || '').trim(),
            ct_ratio: (ct_ratio || '').trim(),
            make: mk,
            capacity: cap,
            phase: ph,
            meter_category: cat,
            meter_subcategory: sub,
            meter_type: mt,
            connection_type: conn,
            voltage_rating: vr,
            current_rating: cr,
            device_testing_purpose: purp, // UPDATED
            remark: (remark || '').trim() || ''
          });
        }
      }
    };
    reader.readAsText(file);
  }

  // ---------- Validation helpers ----------
  private ensureSourceSelected(): boolean {
    if (!this.selectedSourceType || !this.selectedSourceName || !this.filteredSources) {
      this.showAlert('Missing Source Details', 'Please select Source Type, enter Location/Store/Vendor code, and click Fetch before submitting.');
      return false;
    }
    return true;
  }

  private ensureLabId(): boolean {
    if (this.labId === null || isNaN(Number(this.labId))) {
      this.showAlert('Missing Lab', 'lab_id not found. Please re-login so we can identify your lab.');
      return false;
    }
    return true;
  }

  private todayISO(): string {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  // ---------- Submit: Meters ----------
submitDevices(): void {
  if (!this.devices.length) {
    this.showAlert('No Rows', 'No meter rows to submit.');
    return;
  }
  if (!this.ensureSourceSelected() || !this.ensureLabId()) return;

  // Normalize rows and force-fill purpose
  const cleaned = this.devices
    .map((d: any, idx: number) => {
      const normalizedPurpose = this.resolvePurpose(d.device_testing_purpose);
      return {
        __row: idx + 1, // for possible error display
        serial_number: (d.serial_number || '').trim(),
        make: this.pickMake((d.make || '').trim()),
        capacity: this.pickCapacity((d.capacity || '').trim()),
        phase: this.pickPhase((d.phase || '').trim()),
        connection_type: this.pickConnectionType((d.connection_type || '').trim()),
        meter_category: this.pickCategory((d.meter_category || '').trim()),
        meter_subcategory: (d.meter_subcategory || '').trim() || null,
        meter_type: this.pickMeterType((d.meter_type || '').trim()),
        voltage_rating: this.pickVoltageRating((d.voltage_rating || '').trim()),
        current_rating: this.pickCurrentRating((d.current_rating || '').trim()),
        ct_class: (d.ct_class || '').trim() || null,
        ct_ratio: (d.ct_ratio || '').trim() || null,
        device_testing_purpose: normalizedPurpose, // guaranteed non-empty
        remark: (d.remark || '').trim() || null
      };
    })
    .filter(d => d.serial_number);

  if (!cleaned.length) {
    this.showAlert('Invalid Data', 'Please provide at least one valid meter serial number.');
    return;
  }

  // Final guard: find any row that would still be empty (shouldn’t happen, but belt & suspenders)
  const invalid = cleaned.filter(r => !r.device_testing_purpose);
  if (invalid.length) {
    const rows = invalid.map(r => r.__row).join(', ');
    this.showAlert('Missing Testing Purpose', `Rows missing device_testing_purpose: ${rows}`);
    return;
  }

  const payload = cleaned.map((d: any) => ({
    device_type: 'METER',
    make: d.make,
    capacity: d.capacity,
    phase: d.phase,
    meter_category: d.meter_category,
    meter_subcategory: d.meter_subcategory,
    meter_type: d.meter_type,
    connection_type: d.connection_type,
    voltage_rating: d.voltage_rating,
    current_rating: d.current_rating,
    serial_number: d.serial_number,
    ct_class: d.ct_class,
    ct_ratio: d.ct_ratio,
    remark: d.remark,
    device_testing_purpose: d.device_testing_purpose, // non-null
    lab_id: this.labId,
    office_type: this.selectedSourceType || null,
    location_code: this.filteredSources?.code || this.filteredSources?.location_code || null,
    location_name: this.filteredSources?.name || this.filteredSources?.location_name || null,
    date_of_entry: this.todayISO(),
    initiator: 'CIS'
  }));

  this.deviceService.addnewdevice(payload).subscribe({
    next: () => {
      this.showAlert('Success', 'Meters added!');
      this.devices = [];
    },
    error: (err) => {
      console.error('Submit meters error:', err);
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
  if (!this.ensureSourceSelected() || !this.ensureLabId()) return;

  const cleaned = this.cts
    .map((ct: any, idx: number) => {
      const normalizedPurpose = this.resolvePurpose(ct.device_testing_purpose || this.ctMeta.device_testing_purpose);
      return {
        __row: idx + 1,
        serial_number: (ct.serial_number || '').trim(),
        ct_class: (ct.ct_class || '').trim() || null,
        ct_ratio: (ct.ct_ratio || '').trim() || null,
        make: this.pickMake((ct.make || this.ctMeta.make).trim()),
        capacity: this.pickCapacity((ct.capacity || this.ctMeta.capacity).trim()),
        phase: this.pickPhase((ct.phase || this.ctMeta.phase).trim()),
        meter_category: this.pickCategory((ct.meter_category || this.ctMeta.meter_category).trim()),
        meter_subcategory: (ct.meter_subcategory || this.ctMeta.meter_subcategory || '').trim() || null,
        meter_type: this.pickMeterType((ct.meter_type || this.ctMeta.meter_type).trim()),
        connection_type: this.pickConnectionType((ct.connection_type || this.ctMeta.connection_type).trim()),
        voltage_rating: this.pickVoltageRating((ct.voltage_rating || this.ctMeta.voltage_rating).trim()),
        current_rating: this.pickCurrentRating((ct.current_rating || this.ctMeta.current_rating).trim()),
        device_testing_purpose: normalizedPurpose,
        remark: (ct.remark || '').trim() || null
      };
    })
    .filter(ct => ct.serial_number);

  if (!cleaned.length) {
    this.showAlert('Invalid Data', 'Please provide at least one valid CT serial number.');
    return;
  }

  const invalid = cleaned.filter(r => !r.device_testing_purpose);
  if (invalid.length) {
    const rows = invalid.map(r => r.__row).join(', ');
    this.showAlert('Missing Testing Purpose', `CT rows missing device_testing_purpose: ${rows}`);
    return;
  }

  const payload = cleaned.map((ct: any) => ({
    device_type: 'CT',
    make: ct.make,
    capacity: ct.capacity,
    phase: ct.phase,
    meter_category: ct.meter_category,
    meter_subcategory: ct.meter_subcategory,
    meter_type: ct.meter_type,
    connection_type: ct.connection_type,
    voltage_rating: ct.voltage_rating,
    current_rating: ct.current_rating,
    serial_number: ct.serial_number,
    ct_class: ct.ct_class,
    ct_ratio: ct.ct_ratio,
    remark: ct.remark,
    device_testing_purpose: ct.device_testing_purpose, // non-null
    lab_id: this.labId,
    office_type: this.selectedSourceType || null,
    location_code: this.filteredSources?.code || this.filteredSources?.location_code || null,
    location_name: this.filteredSources?.name || this.filteredSources?.location_name || null,
    date_of_entry: this.todayISO(),
    initiator: 'CIS'
  }));

  this.deviceService.addnewdevice(payload).subscribe({
    next: () => {
      this.showAlert('Success', 'CTs added!');
      this.cts = [];
    },
    error: (err) => {
      console.error('Submit CTs error:', err);
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

  // ---------- Util ----------
  private defaultCtRange() {
    return {
      start: null as number | null,
      end: null as number | null,
      ct_class: '',
      ct_ratio: '',
      make: '',
      capacity: '',
      phase: '',
      connection_type: '',
      meter_category: '',
      meter_subcategory: '',
      meter_type: '',
      voltage_rating: '',
      current_rating: '',
      remark: '',
      serial_number: '',
      device_testing_purpose: '' // keep filled via ctMeta defaults
    };
  }
}
