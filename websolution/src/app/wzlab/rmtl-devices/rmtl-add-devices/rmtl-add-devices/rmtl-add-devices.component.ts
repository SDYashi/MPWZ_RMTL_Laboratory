import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import {
  InwardReceiptPdfService,
  InwardReceiptData,
  InwardReceiptItem
} from 'src/app/shared/inward-receipt-pdf.service';

declare var bootstrap: any;

interface DeviceRow {
  serial_number: string;
  make: string;
  capacity: string;
  phase: string;
  connection_type: string;
  meter_category: string;
  meter_class?: string | null;
  meter_type: string;
  voltage_rating: string;
  current_rating: string;
  device_testing_purpose: string;
  ct_class?: string | null;
  ct_ratio?: string | null;
  remark?: string | null;
  initiator?: string | null;
}

interface CTRow {
  serial_number: string;
  ct_class?: string | null;
  ct_ratio?: string | null;
  make: string;
  connection_type: string;
  device_testing_purpose: string;
  remark?: string | null;
  initiator?: string | null;
}

@Component({
  selector: 'app-rmtl-add-devices',
  templateUrl: './rmtl-add-devices.component.html',
  styleUrls: ['./rmtl-add-devices.component.css']
})
export class RmtlAddDevicesComponent implements OnInit, AfterViewInit {
  // -------- Shared source --------
  office_types: string[] = [];
  selectedSourceType = '';
  selectedSourceName = '';
  filteredSources: any = null;

  // -------- Enums (DB-safe values) --------
  makes: string[] = [];
  capacities: string[] = [];
  phases: string[] = [];
  meter_categories: string[] = [];
  meter_classes: string[] = [];
  meterTypes: string[] = [];
  ct_classes: string[] = [];
  ct_ratios: string[] = [];
  connection_types: string[] = [];
  voltage_ratings: string[] = [];
  current_ratings: string[] = [];
  device_testing_purpose: string[] = [];
  meter_subcategories: string[] = [];
  initiators: string[] = [];

  // -------- Defaults --------
  meterDefaultPurpose = 'ROUTINE';

  // -------- Data --------
  devices: DeviceRow[] = [];
  cts: CTRow[] = [];

  serialRange: any = {
    start: null, end: null,
    connection_type: '', phase: '', make: '', capacity: '',
    meter_category: '', meter_class: '', meter_type: '',
    voltage_rating: '', current_rating: '',
    remark: '', serial_number: '',
    ct_class: '', ct_ratio: '',
    device_testing_purpose: '',
    initiator: ''
  };

  ctRange: any = this.defaultCtRange();

  ctMeta: any = {
    make: '',
    capacity: '',
    phase: '',
    meter_category: '',
    meter_class: '',
    meter_type: '',
    connection_type: '',
    voltage_rating: '',
    current_rating: '',
    serial_number: '',
    ct_class: '',
    ct_ratio: '',
    remark: '',
    device_testing_purpose: '',
    initiator: ''
  };

  // UI helpers (for compact dropdown strips; bind directly to values)
  meterDefaultsUI: Array<{ key: string; label: string; options: string[] }> = [];
  ctDefaultsUI: Array<{ key: string; label: string; options: string[] }> = [];

  // Modal
  alertTitle = '';
  alertMessage = '';
  alertInstance: any;

  // Lab
  labId: number | null = null;

  // Quick manual add (Meters)
  quick = { serial: '' };

  // Quick manual add (CT)
  ctQuick = { serial: '' };
  impkwhs: any;

  constructor(
    private deviceService: ApiServicesService,
    private inwardPdf: InwardReceiptPdfService
  ) {}

  // ---------- Lifecycle ----------
  ngOnInit(): void {
    this.deviceService.getEnums().subscribe({
      next: (data) => {
        this.makes = data?.makes || [];
        this.capacities = data?.capacities || [];
        this.phases = data?.phases || [];
        this.meter_categories = data?.meter_categories || [];
        this.meterTypes = data?.meter_types || [];
        this.meter_classes = data?.meter_classes || [];
        this.office_types = data?.office_types || [];
        this.ct_classes = data?.ct_classes || [];
        this.ct_ratios = data?.ct_ratios || [];
        this.connection_types = data?.connection_types || [];
        this.voltage_ratings = data?.voltage_ratings || ['230V'];
        // this.current_ratings = data?.current_ratings || ['5-30A', '20-40A', '20-100A'];
        this.current_ratings = data?.impkwh || [];
        this.device_testing_purpose = data?.device_testing_purposes || ['ROUTINE'];
        this.meter_subcategories = data?.meter_sub_categories || [];
        this.initiators = data?.initiators || [];
        this.meterDefaultPurpose = this.device_testing_purpose[0] || 'ROUTINE';

        this.serialRange.connection_type = this.serialRange.connection_type || (this.connection_types[0] || 'LT');
        this.serialRange.phase = this.coercePhaseForConn(this.serialRange.connection_type, this.serialRange.phase);

        // this.ctMeta.phase = this.coercePhaseForConn(this.ctMeta.connection_type, this.ctMeta.phase);

        // Defaults for CT meta / CSV fallback
        Object.assign(this.ctMeta, {
          make: this.makes[0] || '',
          ct_class: this.ct_classes[0] || '',
          ct_ratio: this.ct_ratios[0] || '',
          capacity: this.capacities[0] || '',
          connection_type: this.connection_types[0] || 'LT',
          device_testing_purpose: this.meterDefaultPurpose,
          initiator: this.initiators[0] || 'CIS'
        });

        // Defaults for meter range form
        Object.assign(this.serialRange, {
          connection_type: this.connection_types[0] || 'LT',
          phase: this.phases[0] || 'SINGLE PHASE',
          make: this.makes[0] || '',
          capacity: this.capacities[0] || '',
          meter_category: this.meter_categories[0] || '',
          meter_class: this.meter_classes[0] || '',
          meter_type: this.meterTypes[0] || '',
          voltage_rating: this.voltage_ratings[0] || '230V',
          current_rating: this.current_ratings[0] || '5-30A',
          device_testing_purpose: this.meterDefaultPurpose,
          initiator: this.initiators[0] || 'CIS'
        });

        // Build compact UI config arrays
        this.meterDefaultsUI = [
          { key: 'connection_type',        label: 'Conn. Type',  options: this.connection_types },
          { key: 'phase',                  label: 'Phase',       options: this.phases },
          { key: 'make',                   label: 'Make',        options: this.makes },
          { key: 'capacity',               label: 'Capacity',    options: this.capacities },
          { key: 'meter_class',            label: 'Class',       options: this.meter_classes },
          { key: 'meter_category',         label: 'Category',    options: this.meter_categories },
          { key: 'meter_type',             label: 'Meter Type',  options: this.meterTypes },
          { key: 'voltage_rating',         label: 'Voltage',     options: this.voltage_ratings },
          { key: 'current_rating',         label: 'ImpKWH',     options: this.current_ratings },
          { key: 'device_testing_purpose', label: 'Purpose',     options: this.device_testing_purpose },
          { key: 'initiator',              label: 'Initiator',   options: this.initiators }
        ];

        this.ctDefaultsUI = [
          { key: 'make',                   label: 'Make',        options: this.makes },
          { key: 'ct_class',               label: 'CT Class',    options: this.ct_classes },
          { key: 'ct_ratio',               label: 'CT Ratio',    options: this.ct_ratios },
          { key: 'device_testing_purpose', label: 'Purpose',     options: this.device_testing_purpose },
          { key: 'initiator',              label: 'Initiator',   options: this.initiators }
        ];

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
      },
      error: () => this.showAlert('Error', 'Failed to load dropdown data.')
    });
  }
// When connection type changes on the defaults strip (top of Meters tab)
onDefaultsConnectionTypeChange(): void {
  const conn = this.serialRange.connection_type;
  this.serialRange.phase = this.coercePhaseForConn(conn, this.serialRange.phase);
}

// When connection type changes for a specific meter row
onRowConnectionTypeChange(device: DeviceRow): void {
  device.phase = this.coercePhaseForConn(device.connection_type, device.phase);
}


  ngAfterViewInit(): void {
    const modalEl = document.getElementById('alertModal');
    if (modalEl) this.alertInstance = new bootstrap.Modal(modalEl);
  }

  // ---------- Source fetch ----------
  fetchButtonData(): void {
    if (!this.selectedSourceType || !this.selectedSourceName) {
      this.showAlert('Missing Input', 'Please select Source Type and enter Location/Store/Vendor Code.');
      return;
    }
    this.deviceService.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
      next: (data) => (this.filteredSources = data),
      error: () => this.showAlert('Error', 'Failed to fetch source details. Check the code and try again.')
    });
  }

  onSourceTypeChange(): void {
    this.selectedSourceName = '';
    this.filteredSources = null;
  }

  // ---------- Quick add (Meters) ----------
  quickAddMeter(): void {
    const sn = (this.quick.serial || '').trim();
    if (!sn) return;
    if (this.devices.some(d => (d.serial_number || '').trim() === sn)) return;
    this.devices.push({
      serial_number: sn,
      make: this.serialRange.make,
      capacity: this.serialRange.capacity,
      phase: this.serialRange.phase,
      connection_type: this.serialRange.connection_type,
      meter_category: this.serialRange.meter_category,
      meter_class: this.serialRange.meter_class || null,
      meter_type: this.serialRange.meter_type,
      voltage_rating: this.serialRange.voltage_rating,
      current_rating: this.serialRange.current_rating,
      device_testing_purpose: this.serialRange.device_testing_purpose,
      initiator: this.serialRange.initiator || this.initiators[0] || 'CIS',
      remark: null
    });
    this.quick.serial = '';
  }

  // ---------- Quick add (CT) ----------
  quickAddCT(): void {
    const sn = (this.ctQuick.serial || '').trim();
    if (!sn) return;
    if (this.cts.some(ct => (ct.serial_number || '').trim() === sn)) return;
    this.cts.push({
      serial_number: sn,
      ct_class: (this.ctMeta.ct_class || '').trim() || null,
      ct_ratio: (this.ctMeta.ct_ratio || '').trim() || null,
      make: this.ctMeta.make,
      connection_type: this.ctMeta.connection_type,
      device_testing_purpose: this.ctMeta.device_testing_purpose || this.meterDefaultPurpose,
      initiator: this.ctMeta.initiator || this.initiators[0] || 'CIS',
      remark: ''
    });

    this.ctQuick.serial = '';
  }

  // ---------- Meters ops ----------
  addDevice(): void {
    this.devices.push({
      serial_number: '',
      make: this.makes[0] || '',
      capacity: this.capacities[0] || '',
      phase: this.phases[0] || '',
      connection_type: this.connection_types[0] || 'LT',
      meter_category: this.meter_categories[0] || '',
      meter_class: this.meter_classes[0] || '',
      meter_type: this.meterTypes[0] || '',
      voltage_rating: this.voltage_ratings[0] || '230V',
      current_rating: this.current_ratings[0] || '5-30A',
      device_testing_purpose: this.meterDefaultPurpose,
      initiator: this.initiators[0] || 'CIS',
      remark: null
    });
  }

  removeDevice(index: number): void { this.devices.splice(index, 1); }
  clearMeters(): void { this.devices = []; }

// ---------- CSV (Meters): only serial_number required ----------
handleCSVUpload(event: any): void {
  const file = event?.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e: any) => {
    const text = (e.target.result as string) || '';
    // Normalize line endings & strip BOM
    const clean = text.replace(/^\uFEFF/, '').trim();
    if (!clean) return;

    const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;

    // Detect if header present by checking for the word serial in first line
    const hasHeader = /^serial(_|\s|-)?number/i.test(lines[0]) || /^serial/i.test(lines[0]);
    const dataLines = hasHeader ? lines.slice(1) : lines;

    for (const raw of dataLines) {
      if (!raw) continue;

      // Support both single-column and legacy multi-column CSVs
      const cols = raw.split(',').map(c => c.trim());
      const serial_number = (cols[0] || '').trim();

      if (!serial_number) continue;
      if (this.devices.some(d => (d.serial_number || '').trim() === serial_number)) continue;
      // Push with dropdown/default values
      this.devices.push({
        serial_number,
        make: this.serialRange.make,
        capacity: this.serialRange.capacity,
        phase: this.serialRange.phase,
        connection_type: this.serialRange.connection_type,
        meter_category: this.serialRange.meter_category,
        meter_class: (this.serialRange.meter_class || '').trim() || null,
        meter_type: this.serialRange.meter_type,
        voltage_rating: this.serialRange.voltage_rating,
        current_rating: this.serialRange.current_rating,
        device_testing_purpose: this.serialRange.device_testing_purpose || this.meterDefaultPurpose,
        initiator: this.serialRange.initiator || this.initiators[0] || 'CIS',
        remark: null,
        ct_class: (cols[12] || '').trim() || null,
        ct_ratio: (cols[13] || '').trim() || null,
      });
    }
  };
  reader.readAsText(file);
}


  addSerialRange(): void {
    const { start, end } = this.serialRange;
    if (!start || !end || Number(start) > Number(end)) {
      this.showAlert('Invalid Range', 'Please provide a valid serial number range.');
      return;
    }
    for (let i = Number(start); i <= Number(end); i++) {
        const sn = i.toString();
        if (this.devices.some(d => (d.serial_number || '').trim() === sn)) continue;
      this.devices.push({
        serial_number:sn,
        make: this.serialRange.make,
        capacity: this.serialRange.capacity,
        phase: this.serialRange.phase,
        connection_type: this.serialRange.connection_type,
        meter_category: this.serialRange.meter_category,
        meter_class: this.serialRange.meter_class || null,
        meter_type: this.serialRange.meter_type,
        voltage_rating: this.serialRange.voltage_rating,
        current_rating: this.serialRange.current_rating,
        device_testing_purpose: this.serialRange.device_testing_purpose || this.meterDefaultPurpose,
        initiator: this.serialRange.initiator || this.initiators[0] || 'CIS',
        remark: (this.serialRange.remark || '').trim() || null
      });
    }
    this.serialRange.start = null;
    this.serialRange.end = null;
  }

  // ---------- CT ops ----------
  addCT(): void {
    this.cts.push({
      serial_number: this.ctMeta.serial_number,
      ct_class: this.ctMeta.ct_class || '',
      ct_ratio: this.ctMeta.ct_ratio || '',
      make: this.ctMeta.make,
      connection_type: this.ctMeta.connection_type,
      device_testing_purpose: this.ctMeta.device_testing_purpose || this.meterDefaultPurpose,
      initiator: this.ctMeta.initiator || this.initiators[0] || 'CIS',
      remark: ''
    });
  }

  removeCT(index: number): void { this.cts.splice(index, 1); }
  clearCTs(): void { this.cts = []; }

  addCTSerialRange(): void {
    const { start, end, ct_class, ct_ratio } = this.ctRange;
    if (!start || !end || Number(start) > Number(end)) {
      this.showAlert('Invalid Range', 'Please provide a valid CT serial number range.');
      return;
    }
    for (let i = Number(start); i <= Number(end); i++) {
        const sn = i.toString();
        if (this.cts.some(ct => (ct.serial_number || '').trim() === sn)) continue;
      this.cts.push({
        serial_number: sn,
        ct_class: (ct_class || '').trim() || null,
        ct_ratio: (ct_ratio || '').trim() || null,
        make: this.ctMeta.make,
        connection_type: this.ctMeta.connection_type,
        device_testing_purpose: this.ctMeta.device_testing_purpose || this.meterDefaultPurpose,
        initiator: this.ctMeta.initiator || this.initiators[0] || 'CIS',
        remark: ''
      });
    }
    this.ctRange = this.defaultCtRange();
  }

// ---------- CSV (CTs): only serial_number required ----------
handleCTCSVUpload(event: any): void {
  const file = event?.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e: any) => {
    const text = (e.target.result as string) || '';
    const clean = text.replace(/^\uFEFF/, '').trim();
    if (!clean) return;

    const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;

    // Detect header
    const hasHeader = /^serial(_|\s|-)?number/i.test(lines[0]) || /^serial/i.test(lines[0]);
    const dataLines = hasHeader ? lines.slice(1) : lines;

    for (const raw of dataLines) {
      if (!raw) continue;

      const cols = raw.split(',').map(c => c.trim());
      const serial_number = (cols[0] || '').trim();
      if (!serial_number) continue;
      if (this.cts.some(ct => (ct.serial_number || '').trim() === serial_number)) continue;
      this.cts.push({
        serial_number,
        ct_class: (this.ctMeta.ct_class || '').trim() || null,
        ct_ratio: (this.ctMeta.ct_ratio || '').trim() || null,
        make: this.ctMeta.make,
        connection_type: this.ctMeta.connection_type,
        device_testing_purpose: this.ctMeta.device_testing_purpose || this.meterDefaultPurpose,
        initiator: this.ctMeta.initiator || this.initiators[0] || 'CIS',
        remark: ''
      });
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

  // Small helper: treat blank as OK (will become null) and skip check if list empty
  private in(list: string[], v?: string | null) {
    return !v || !list.length || list.includes(v);
  }

  // ---------- Submit: Meters ----------
  submitDevices(): void {
    if (!this.devices.length) {
      this.showAlert('No Rows', 'No meter rows to submit.');
      return;
    }
    if (!this.ensureSourceSelected() || !this.ensureLabId()) return;
    
    // Use values as-is (only trim serial & remark / convert blanks later)
    const cleaned = this.devices
      .map((d: DeviceRow, idx: number) => ({
        __row: idx + 1,
        serial_number: (d.serial_number || '').trim(),
        make: d.make,
        capacity: d.capacity,
        phase: d.phase,
        connection_type: d.connection_type,
        meter_category: d.meter_category,
        meter_class: (d.meter_class ?? '').trim() || null,
        meter_type: d.meter_type,
        voltage_rating: d.voltage_rating,
        current_rating: d.current_rating,
        ct_class: (d.ct_class ?? '').trim() || null,
        ct_ratio: (d.ct_ratio ?? '').trim() || null,
        device_testing_purpose: (d.device_testing_purpose || this.meterDefaultPurpose),
        initiator: d.initiator || this.initiators[0] || 'CIS',
        remark: (d.remark ?? '').toString().trim() || null
      }))
      .filter(d => d.serial_number);

    if (!cleaned.length) {
      this.showAlert('Invalid Data', 'Please provide at least one valid meter serial number.');
      return;
    }

    // Optional pre-submit enum guard
    const bad = cleaned.filter(r =>
      !this.in(this.capacities, r.capacity) ||
      !this.in(this.phases, r.phase) ||
      !this.in(this.connection_types, r.connection_type) ||
      !this.in(this.meter_categories, r.meter_category) ||
      !this.in(this.meter_classes, r.meter_class ?? '') ||
      !this.in(this.meterTypes, r.meter_type) ||
      !this.in(this.voltage_ratings, r.voltage_rating) ||
      !this.in(this.current_ratings, r.current_rating) ||
      !this.in(this.initiators, r.initiator)
    );
    if (bad.length) {
      this.showAlert('Invalid values', 'Some selections are not in the allowed lists. Please correct and try again.');
      return;
    }

    const payload = cleaned.map((d: any) => ({
      device_type: 'METER',
      make: d.make,
      capacity: d.capacity || null,
      phase: d.phase || null,
      meter_category: d.meter_category || null,
      meter_class: d.meter_class || null,
      meter_type: d.meter_type || null,
      connection_type: d.connection_type || null,
      voltage_rating: d.voltage_rating || null,
      current_rating: d.current_rating || null,
      serial_number: d.serial_number,
      ct_class: d.ct_class || null,
      ct_ratio: d.ct_ratio || null,
      remark: d.remark,
      device_testing_purpose: d.device_testing_purpose,
      lab_id: this.labId,
      office_type: this.selectedSourceType || null,
      location_code: this.filteredSources?.code || this.filteredSources?.location_code || null,
      location_name: this.filteredSources?.name || this.filteredSources?.location_name || null,
      date_of_entry: this.todayISO(),
      initiator: d.initiator
    }));

this.deviceService.addnewdevice(payload).subscribe({
  next: (created: any): void => {
    const inwardNo = created?.[0]?.inward_number || '(generated)';
    this.showAlert('Success', `Meters added! Inward No: ${inwardNo} • Count: ${created.length}`);

    const items: InwardReceiptItem[] = created.map((p: any, idx: number) => ({
      sl: idx + 1,
      serial_number: p.serial_number,
      make: p.make,
      capacity: p.capacity ?? '',
      phase: p.phase ?? '',
      connection_type: p.connection_type ?? '',
      meter_category: p.meter_category ?? '',
      meter_type: p.meter_type ?? '',
      voltage_rating: p.voltage_rating ?? '',
      current_rating: p.current_rating ?? '',
      purpose: p.device_testing_purpose,
      remark: p.remark || ''
    }));

    const receipt: InwardReceiptData = {
      title: 'RMTL Inward Receipt',
      orgName: 'M.P. Paschim Kshetra Vidyut Vitran Co. Ltd',
      lab_id: this.labId ?? undefined,
      office_type: this.selectedSourceType,
      location_code: this.filteredSources?.code || this.filteredSources?.location_code || null,
      location_name: this.filteredSources?.name || this.filteredSources?.location_name || null,
      inward_no: inwardNo,
      date_of_entry: this.todayISO(),
      device_type: 'METER',
      total: items.length,
      items,
      serials_csv: items.map(i => i.serial_number).join(', ')
    };

    this.inwardPdf.download(receipt, { fileName: `Inward_Receipt_METER_${this.todayISO()}.pdf` });
    this.devices = [];
  },
  error: (err) => {
    const msg = err?.error?.detail || 'Error while submitting meters.';
    this.showAlert('Error', msg);
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
      .map((ct: CTRow, idx: number) => ({
        __row: idx + 1,
        serial_number: (ct.serial_number || '').trim(),
        ct_class: (ct.ct_class ?? '').trim() || null,
        ct_ratio: (ct.ct_ratio ?? '').trim() || null,
        make: ct.make,
        connection_type: ct.connection_type,
        device_testing_purpose: (ct.device_testing_purpose || this.meterDefaultPurpose),
        initiator: ct.initiator || this.initiators[0] || 'CIS',
        remark: (ct.remark ?? '').trim() || null
      }))
      .filter(ct => ct.serial_number);

    if (!cleaned.length) {
      this.showAlert('Invalid Data', 'Please provide at least one valid CT serial number.');
      return;
    }

    // Optional pre-submit enum guard
    const bad = cleaned.filter(r =>
      !this.in(this.connection_types, r.connection_type) ||
      !this.in(this.initiators, r.initiator)
    );
    if (bad.length) {
      this.showAlert('Invalid values', 'Some selections are not in the allowed lists. Please correct and try again.');
      return;
    }

    const payload = cleaned.map((ct: any) => ({
      device_type: 'CT',
      make: ct.make,
      capacity: ct.capacity || null,
      phase: ct.phase || null,
      meter_category: ct.meter_category || null,
      meter_class: ct.meter_class || null,
      meter_type: ct.meter_type || null,
      connection_type: ct.connection_type || null,
      voltage_rating: ct.voltage_rating || null,
      current_rating: ct.current_rating || null,
      serial_number: ct.serial_number,
      ct_class: ct.ct_class || null,
      ct_ratio: ct.ct_ratio || null,
      remark: ct.remark,
      device_testing_purpose: ct.device_testing_purpose,
      lab_id: this.labId,
      office_type: this.selectedSourceType || null,
      location_code: this.filteredSources?.code || this.filteredSources?.location_code || null,
      location_name: this.filteredSources?.name || this.filteredSources?.location_name || null,
      date_of_entry: this.todayISO(),
      initiator: ct.initiator
    }));
this.deviceService.addnewdevice(payload).subscribe({
  next: (created: any): void => {
    const inwardNo = created?.[0]?.inward_number || '(generated)';
    this.showAlert('Success', `CTs added! Inward No: ${inwardNo} • Count: ${created.length}`);

    const items: InwardReceiptItem[] = created.map((p: any, idx: number) => ({
      sl: idx + 1,
      serial_number: p.serial_number,
      make: p.make,
      connection_type: p.connection_type ?? '',
      ct_class: p.ct_class ?? '',
      ct_ratio: p.ct_ratio ?? '',
      purpose: p.device_testing_purpose,
      remark: p.remark || ''
    }));

    const receipt: InwardReceiptData = {
      title: 'RMTL Inward Receipt',
      orgName: 'M.P. Paschim Kshetra Vidyut Vitran Co. Ltd',
      lab_id: this.labId ?? undefined,
      office_type: this.selectedSourceType,
      location_code: this.filteredSources?.code || this.filteredSources?.location_code || null,
      location_name: this.filteredSources?.name || this.filteredSources?.location_name || null,
      inward_no: inwardNo,
      date_of_entry: this.todayISO(),
      device_type: 'CT',
      total: items.length,
      items,
      serials_csv: items.map(i => i.serial_number).join(', ')
    };

    this.inwardPdf.download(receipt, { fileName: `Inward_Receipt_CT_${this.todayISO()}.pdf` });
    this.cts = [];
  },
  error: (err) => {
    const msg = err?.error?.detail || 'Error while submitting CTs.';
    this.showAlert('Error', msg);
  }
});


  
  }

  // ---------- Duplicates ----------
  isDuplicateSerial(sn: string, type: 'METER' | 'CT'): boolean {
    if (!sn) return false;
    const list: Array<DeviceRow | CTRow> = type === 'METER' ? this.devices : this.cts;
    const s = sn.trim();
    const count = list.filter((r: any) => (r.serial_number || '').trim() === s).length;
    return count > 1;
  }

  // ---------- CSV Templates ----------
downloadMeterCSVTemplate(): void {
  const header = 'serial_number\n'; // only serial now
  const blob = new Blob([header], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'meter_template.csv'; a.click();
  URL.revokeObjectURL(url);
}

downloadCTCSVTemplate(): void {
  const header = 'serial_number\n'; // only serial now
  const blob = new Blob([header], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'ct_template.csv'; a.click();
  URL.revokeObjectURL(url);
}


  // ---------- Modal helper ----------
  showAlert(title: string, message: string): void {
    this.alertTitle = title;
    this.alertMessage = message;
    if (this.alertInstance) this.alertInstance.show();
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
      meter_class: '',
      meter_type: '',
      voltage_rating: '',
      current_rating: '',
      remark: '',
      serial_number: '',
      device_testing_purpose: '',
      initiator: ''
    };
  }

  // ---------- Add below your enums/arrays ----------

// Map Connection → allowed Phase values (using your exact strings)
private PhaseByConn: Record<string, string[]> = {
  LT: [
    'SINGLE PHASE',
    'THREE PHASE WHOLE CURRENT',
    'THREE PHASE CT OPERATED'
  ],
  HT: [
    'CT OPERATED',
    'PT OPERATED'
  ],
  OTHER: [
    'OTHER'
  ]
};

// Return phase options for a given connection type, or all phases
getPhaseOptions(connType?: string): string[] {
  const base = (connType && this.PhaseByConn[connType]) ? this.PhaseByConn[connType] : this.phases;
  return base.filter(p => this.phases.includes(p));
}

// Ensure a (conn, phase) pair is valid. If not, fix it to the first allowed phase.
private coercePhaseForConn(connType: string, currentPhase?: string | null): string {
  const allowed = this.getPhaseOptions(connType);
  if (!allowed.length) return currentPhase || '';
  return currentPhase && allowed.includes(currentPhase) ? currentPhase : allowed[0];
}

}
