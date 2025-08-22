// rmtl-gatepass-generate.component.ts
import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

type TestResult = 'PASS' | 'FAIL' | string;
type TestStatus = 'PASS' | 'FAIL' | 'UNTESTABLE' | 'IN_PROGRESS' | 'PENDING' | string;
type TestMethod = 'AUTOMATIC' | 'MANUAL' | string;

export interface DeviceRow {
  /** Testing record PK (if present) */
  id?: number;

  /** Physical device id */
  device_id?: number;

  /** Gatepass/Test report grouping id */
  report_id?: string;

  /** Optional assignment id */
  assignment_id?: number;

  /** Legacy/display fields */
  serial_number?: string;
  make?: string;
  meter_category?: string;
  meter_type?: string;
  phase?: string;

  /** Testing info */
  test_result?: TestResult;
  test_status?: TestStatus;
  test_method?: TestMethod;

  start_datetime?: string;   // ISO
  end_datetime?: string;     // ISO

  physical_condition_of_device?: string;
  seal_status?: string;
  meter_body?: string;
  meter_glass_cover?: string;
  terminal_block?: string;
  other?: string;
  details?: string;

  ref_start_reading?: number;
  ref_end_reading?: number;
  reading_before_test?: number;
  reading_after_test?: number;
  error_percentage?: number;

  approver_id?: number | null;
  approver_remark?: string | null;

  /** UI state */
  selected?: boolean;
}

@Component({
  selector: 'app-rmtl-gatepass-generate',
  templateUrl: './rmtl-gatepass-generate.component.html',
  styleUrls: ['./rmtl-gatepass-generate.component.css']
})
export class RmtlGatepassGenerateComponent implements OnInit {
  // Filters
  fromDate: string = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  toDate: string = new Date().toISOString().slice(0, 10);

  // Report IDs & selection
  reportIds: string[] = [];
  selectedReportId: string = '';

  // Devices
  devices: DeviceRow[] = [];
  selectAll: boolean = false;

  // UI state
  loadingList = false;
  loadingDevices = false;
  errorMsg = '';
  gatepassInfo: any = null;

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    this.loadReportIds();
  }

  get selectedCount(): number {
    return this.devices.filter(d => d.selected).length;
  }

  onDatesChange(): void {
    this.selectedReportId = '';
    this.devices = [];
    this.gatepassInfo = null;
    this.loadReportIds();
  }

  loadReportIds(): void {
    this.loadingList = true;
    this.errorMsg = '';
    this.api.getReportIds(this.fromDate, this.toDate).subscribe({
      next: res => {
        // API shape: { report_ids: string[] }
        this.reportIds = Array.isArray(res?.report_ids) ? res.report_ids : [];
        this.loadingList = false;
      },
      error: err => {
        console.error(err);
        this.errorMsg = 'Failed to load report ids';
        this.loadingList = false;
      }
    });
  }

  onReportChange(): void {
    this.devices = [];
    this.gatepassInfo = null;
    if (!this.selectedReportId) return;
    this.fetchDevices();
  }

  fetchDevices(): void {
    this.loadingDevices = true;
    this.errorMsg = '';
    this.api.getDevicesByReportId(this.selectedReportId).subscribe({
      next: (rows: DeviceRow[]) => {
        const list = Array.isArray(rows) ? rows : [];
        this.devices = list.map(d => ({ ...d, selected: false }));
        this.selectAll = false;
        this.loadingDevices = false;
      },
      error: err => {
        console.error(err);
        this.errorMsg = 'Failed to load devices for the selected report';
        this.loadingDevices = false;
      }
    });
  }

  toggleAllDevices(): void {
    this.devices.forEach(d => (d.selected = this.selectAll));
  }

  clearSelection(): void {
    this.devices.forEach(d => (d.selected = false));
    this.selectAll = false;
  }

  onRowCheckboxChange(): void {
    // Keep the "Select All" checkbox in sync with row selections
    this.selectAll = this.devices.length > 0 && this.devices.every(d => !!d.selected);
  }

  generateGatepass(): void {
    if (this.selectedCount === 0) return;

    const selected = this.devices.filter(d => d.selected);

    const payload = {
      report_id: this.selectedReportId,
      devices: selected.map(d => ({
        // keep serial if present; fallback to device_id as string
        serial_number: d.serial_number ?? (d.device_id != null ? String(d.device_id) : ''),
        make: d.make,
        meter_category: d.meter_category,
        meter_type: d.meter_type,
        phase: d.phase
      }))
    };

    this.api.postGatepass(payload).subscribe({
      next: (res: any) => {
        this.gatepassInfo = res?.gatepass ?? res;
        alert('Gatepass Generated!');
      },
      error: err => {
        console.error(err);
        alert('Failed to generate gatepass');
      }
    });
  }

  printGatepass(): void {
    window.print();
  }

  // ---- Template helpers ----
  trackBySerial(_idx: number, item: DeviceRow): string {
    return item?.serial_number ?? String(_idx);
  }

  trackByDeviceId = (_: number, item: DeviceRow) =>
    item?.id ?? item?.device_id ?? _;

  resultClass(result?: string) {
    switch ((result || '').toUpperCase()) {
      case 'PASS': return 'bg-success';
      case 'FAIL': return 'bg-danger';
      default:     return 'bg-secondary';
    }
  }

  statusClass(status?: string) {
    switch ((status || '').toUpperCase()) {
      case 'PASS':        return 'bg-success';
      case 'FAIL':        return 'bg-danger';
      case 'UNTESTABLE':  return 'bg-secondary';
      case 'IN_PROGRESS': return 'bg-warning';
      case 'PENDING':     return 'bg-warning';
      default:            return 'bg-info';
    }
  }
}
