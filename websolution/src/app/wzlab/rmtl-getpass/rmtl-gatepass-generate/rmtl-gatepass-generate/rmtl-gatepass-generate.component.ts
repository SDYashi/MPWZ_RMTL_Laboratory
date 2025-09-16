import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { GatepassPdfService, GatepassDeviceRow } from 'src/app/shared/gatepass-pdf.service';

// If you use Bootstrap JS bundle on the page
declare const bootstrap: any;

type TestResult = 'PASS' | 'FAIL' | string;
type TestStatus = 'PASS' | 'FAIL' | 'UNTESTABLE' | 'IN_PROGRESS' | 'PENDING' | 'COMPLETED' | string;
type TestMethod = 'AUTOMATIC' | 'MANUAL' | string;

export interface DeviceRow {
  // Device basics
  id?: number;
  device_id?: number;
  serial_number?: string;
  make?: string;
  device_type?: string;
  meter_category?: string;
  meter_type?: string;
  phase?: string;
  location_name?: string;
  inward_number?: string;

  // Testing
  report_id?: string;
  report_type?: string;
  test_result?: TestResult;
  test_status?: TestStatus;
  test_method?: TestMethod;
  start_datetime?: string;
  end_datetime?: string;
  details?: string;

  // Physical/inspection
  physical_condition_of_device?: string | null;
  seal_status?: string | null;
  meter_body?: string | null;
  meter_glass_cover?: string | null;
  terminal_block?: string | null;
  other?: string | null;

  // Readings
  ref_start_reading?: number | null;
  ref_end_reading?: number | null;
  reading_before_test?: number | null;
  reading_after_test?: number | null;
  error_percentage?: number | null;

  // Approvals
  approver_id?: number | null;
  approver_remark?: string | null;

  // Assignment
  assignment_id?: number;
  assigned_datetime?: string;
  bench_name?: string;
  user_name?: string;
  assigned_by_name?: string;

  // UI
  selected?: boolean;

  // Raw optional refs
  __raw_testing?: any;
  __raw_device?: any;
  __raw_assignment?: any;
}

@Component({
  selector: 'app-rmtl-gatepass-generate',
  templateUrl: './rmtl-gatepass-generate.component.html',
  styleUrls: ['./rmtl-gatepass-generate.component.css']
})
export class RmtlGatepassGenerateComponent implements OnInit {
  // Date filters (default: current month)
  fromDate: string = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  toDate: string = new Date().toISOString().slice(0, 10);
  assignmentStatus: string = 'APPROVED';

  // Report IDs
  reportIds: string[] = [];
  selectedReportId: string = '';

  // Devices (flat rows)
  devices: DeviceRow[] = [];
  selectAll = false;

  // UI state
  loadingList = false;
  loadingDevices = false;
  errorMsg = '';
  selectedInwordNo: any;

  // Gatepass created summary
  gatepassInfo: any = null;

  // Source lookup (from enums + typed code)
  office_types: string[] = [];
  selectedSourceType: string = '';
  selectedSourceName: string = '';
  filteredSources: any;

  // Gatepass modal form (payload pieces)
  gatepassForm = {
    dispatch_to: '',
    receiver_name: '',
    receiver_designation: '',
    receiver_mobile: '',
    vehicle: '',
    serial_numbers: '', // comma-separated serials (no make, no ids)
    report_ids: ''      // comma-separated report ids (here a single one)
  };

  // Modals
  private gatepassModalRef: any;
  private detailModalRef: any;
  selectedDetail: DeviceRow | null = null;

  // Internal
  private payload: any;
  currentUser: any;
  currentLabId: any;
  inwordNos: any;
  labInfo: any;

  // cache selected device rows for the PDF
  private selectedPdfRows: GatepassDeviceRow[] = [];

  constructor(private api: ApiServicesService, private gatepassPdf: GatepassPdfService) {}

  ngOnInit(): void {
    this.loadinwordnos();
    this.loadReportIds();

    this.api.getEnums().subscribe({
      next: (d) => { this.office_types = d?.office_types || []; }
    });

    const token = localStorage.getItem('access_token');
    if (token) {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      this.currentUser = decoded?.username ? { name: decoded.username } : decoded;
      this.currentLabId = decoded.lab_id;
    }

    this.api.getLab(this.currentLabId).subscribe({
      next: (info: any) => {
        this.labInfo = {
          lab_name: info?.lab_pdfheader_name,
          address_line: info?.address || info?.address_line,
          email: info?.email,
          phone: info?.phone
        };
      },
      error: (e) => { console.error('Lab info error', e); }
    });
  }

  onReportselectedInwordNoChange() {
    this.api.getDevicesByInwardNo(this.selectedInwordNo).subscribe({
      next: (d) => { this.devices = d || []; }
    });
  }

  loadinwordnos() {
    this.api.getinwordnos(this.fromDate, this.toDate, this.assignmentStatus).subscribe({
      next: (d) => { this.inwordNos = d || []; }
    });
  }

  // ---------- Derived ----------
  get selectedCount(): number {
    return this.devices.filter(d => d.selected).length;
  }

  // ---------- Filters ----------
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
      next: (res) => {
        this.reportIds = Array.isArray(res?.report_ids) ? res.report_ids : [];
        this.loadingList = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Failed to load report IDs.';
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
      next: (rows: any[]) => {
        const list = Array.isArray(rows) ? rows : [];
        this.devices = list.map((row: any): DeviceRow => {
          const t = row?.testing || {};
          const dv = row?.device || {};
          const asn = row?.assignment || {};

          const userAssigned = row?.user_assigned?.name || '';
          const assignedByUser = row?.assigned_by_user?.name || '';
          const benchName = row?.testing_bench?.bench_name || '';

          return {
            // device
            id: dv?.id,
            device_id: t?.device_id ?? dv?.id,
            serial_number: dv?.serial_number,
            make: dv?.make,
            device_type: dv?.device_type,
            meter_category: dv?.meter_category,
            meter_type: dv?.meter_type,
            phase: dv?.phase,
            location_name: dv?.location_name,
            inward_number: dv?.inward_number,

            // testing
            report_id: t?.report_id,
            report_type: t?.report_type,
            test_result: t?.test_result,
            test_status: t?.test_status,
            test_method: t?.test_method,
            start_datetime: t?.start_datetime,
            end_datetime: t?.end_datetime,
            details: t?.details,

            // inspection
            physical_condition_of_device: t?.physical_condition_of_device,
            seal_status: t?.seal_status,
            meter_body: t?.meter_body,
            meter_glass_cover: t?.meter_glass_cover,
            terminal_block: t?.terminal_block,
            other: t?.other,

            // readings
            ref_start_reading: t?.ref_start_reading,
            ref_end_reading: t?.ref_end_reading,
            reading_before_test: t?.reading_before_test,
            reading_after_test: t?.reading_after_test,
            error_percentage: t?.error_percentage,

            // approvals
            approver_id: t?.approver_id,
            approver_remark: t?.approver_remark,

            // assignment
            assignment_id: t?.assignment_id ?? asn?.id,
            assigned_datetime: asn?.assigned_datetime,
            bench_name: benchName,
            user_name: userAssigned,
            assigned_by_name: assignedByUser,

            // UI
            selected: false,

            // raw references
            __raw_testing: t,
            __raw_device: dv,
            __raw_assignment: asn
          };
        });

        this.selectAll = false;
        this.loadingDevices = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Failed to load devices for the selected report.';
        this.loadingDevices = false;
      }
    });
  }

  // ---------- Source fetch ----------
  onSourceTypeChange(): void {
    this.selectedSourceName = '';
    this.filteredSources = undefined;
  }

  fetchButtonData(): void {
    if (!this.selectedSourceType || !this.selectedSourceName) {
      alert('Please choose source type and enter a code.');
      return;
    }
    this.api.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
      next: (data) => {
        this.filteredSources = data;
        const code = this.filteredSources?.code || '';
        const name = this.filteredSources?.name || '';
        this.gatepassForm.dispatch_to = [code, name].filter(Boolean).join(' - ');
      },
      error: () => alert('Failed to fetch source details. Check the code and try again.')
    });
  }

  // ---------- Selection ----------
  toggleAllDevices(): void {
    this.devices.forEach(d => (d.selected = this.selectAll));
    this.selectedPdfRows = this.mapSelectedToPdfRows(this.devices.filter(d => d.selected));
  }

  clearSelection(): void {
    this.devices.forEach(d => (d.selected = false));
    this.selectAll = false;
    this.selectedPdfRows = [];
  }

  onRowCheckboxChange(): void {
    this.selectAll = this.devices.length > 0 && this.devices.every(d => !!d.selected);
    this.selectedPdfRows = this.mapSelectedToPdfRows(this.devices.filter(d => d.selected));
  }

  // ---------- Details modal ----------
  openDetailModal(row: DeviceRow): void {
    this.selectedDetail = row;
    const el = document.getElementById('detailModal');
    if (el && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      this.detailModalRef = new bootstrap.Modal(el, { backdrop: 'static' });
      this.detailModalRef.show();
    }
  }
  closeDetailModal(): void {
    if (this.detailModalRef) this.detailModalRef.hide();
    this.selectedDetail = null;
  }

  // ---------- Gatepass modal ----------
  openGatepassModal(): void {
    if (this.selectedCount === 0) return;

    const selected = this.devices.filter(d => d.selected);

    // Serial numbers only (no device ids)
    this.gatepassForm.serial_numbers = this.buildSerials(selected);
    // Single report selection here; if multi-select later, join with comma
    this.gatepassForm.report_ids = this.selectedReportId;

    // cache selected rows for PDF
    this.selectedPdfRows = this.mapSelectedToPdfRows(selected);

    const el = document.getElementById('gatepassModal');
    if (el && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      this.gatepassModalRef = new bootstrap.Modal(el, { backdrop: 'static' });
      this.gatepassModalRef.show();
    } else {
      console.warn('Bootstrap Modal not found. Ensure bootstrap.bundle.js is loaded.');
    }
  }

  closeGatepassModal(): void {
    if (this.gatepassModalRef) this.gatepassModalRef.hide();
  }

  // ---------- Submit Gatepass ----------
  submitGatepass(): void {
    const f = this.gatepassForm;
    if (!f.dispatch_to || !f.receiver_name || !f.receiver_designation || !f.receiver_mobile || !f.vehicle || !f.serial_numbers || !f.report_ids) {
      alert('Please fill all required fields.');
      return;
    }
    if (!/^\d{10}$/.test(f.receiver_mobile)) {
      alert('Receiver mobile must be 10 digits.');
      return;
    }

    this.payload = {
      dispatch_to: f.dispatch_to.trim(),
      receiver_name: f.receiver_name.trim(),
      receiver_designation: f.receiver_designation.trim(),
      receiver_mobile: f.receiver_mobile.trim(),
      vehicle: f.vehicle.trim(),
      serial_numbers: f.serial_numbers.trim(), // already comma-separated serials
      report_ids: f.report_ids.trim()
    };

    this.api.createGatePass(this.payload).subscribe({
      next: (res: any) => {
        this.closeGatepassModal();
        this.gatepassInfo = res?.gatepass ?? res;
        alert('Gatepass Generated!');
        // reset report list and table
        this.loadReportIds();
        this.devices = [];

        // auto-download PDF via service (device table included)
        this.downloadGatepassPdf(this.gatepassInfo, this.selectedPdfRows);
        this.selectedPdfRows = []; // clear cache
      },
      error: (err) => {
        console.error(err);
        alert('Failed to generate gatepass.');
      }
    });
  }

  // ---------- Helpers ----------
  trackBySerial = (_: number, item: DeviceRow) => item?.serial_number ?? item?.device_id ?? _;

  // Build comma-separated serial numbers only
  private buildSerials(selected: DeviceRow[]): string {
    return selected
      .map(d => d.serial_number?.trim())
      .filter((sn): sn is string => !!sn && sn.length > 0)
      .join(', ');
  }

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
      case 'IN_PROGRESS': return 'bg-warning text-dark';
      case 'PENDING':     return 'bg-warning text-dark';
      case 'COMPLETED':   return 'bg-info text-dark';
      default:            return 'bg-primary';
    }
  }

  private parseReportIds(str: string): string[] {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(Boolean);
  }       

  private parseSerials(str: string): string[] {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(Boolean);
  }

  private mapSelectedToPdfRows(selected: DeviceRow[]): GatepassDeviceRow[] {
    return selected.map(d => ({
      serial_number: d.serial_number || '-',
      make: d.make || '-',
      test_result: (d.test_result || d.__raw_testing?.test_result || '-') as string,
      test_status: (d.test_status || d.__raw_testing?.test_status || '-') as string,
    }));
  }

  // ---------- PDF (delegates to service) ----------
  private async downloadGatepassPdf(gp: any, devicesForPdf: GatepassDeviceRow[] = []): Promise<void> {
    await this.gatepassPdf.download(gp, {
      deviceTable: true,
      devices: devicesForPdf,
      generatedBy: this.currentUser?.name,
      supportEmail: this.labInfo?.email || 'rmtl@mpwz.co.in',
      header: {
        orgLine: 'MADHYA PRADESH PASCHIM KHETRA VIDYUT VITARAN COMPANY LIMITED',
        labLine: (this.labInfo?.lab_name || 'REGIONAL METERING TESTING LABORATORY INDORE').toUpperCase(),
        addressLine: this.labInfo?.address_line || this.labInfo?.address || '',
        email: this.labInfo?.email || '-',
        phone: this.labInfo?.phone || '-',
        leftLogoUrl: '/assets/icons/wzlogo.png',
        rightLogoUrl: '/assets/icons/wzlogo.png',
      }
    });
  }
}
