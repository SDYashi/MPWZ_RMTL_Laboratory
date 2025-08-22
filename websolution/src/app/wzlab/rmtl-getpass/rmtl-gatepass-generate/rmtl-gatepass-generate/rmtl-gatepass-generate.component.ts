// rmtl-gatepass-generate.component.ts
import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;
import TDocumentDefinition from 'pdfmake/interfaces';
type TDocumentDefinition = /*unresolved*/ any;


// If you use Bootstrap JS:
declare const bootstrap: any;

type TestResult = 'PASS' | 'FAIL' | string;
type TestStatus = 'PASS' | 'FAIL' | 'UNTESTABLE' | 'IN_PROGRESS' | 'PENDING' | string;
type TestMethod = 'AUTOMATIC' | 'MANUAL' | string;

export interface DeviceRow {
  id?: number;
  device_id?: number;
  report_id?: string;
  assignment_id?: number;
  serial_number?: string;
  make?: string;
  meter_category?: string;
  meter_type?: string;
  phase?: string;
  test_result?: TestResult;
  test_status?: TestStatus;
  test_method?: TestMethod;
  start_datetime?: string;
  end_datetime?: string;
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
  selected?: boolean;
}

@Component({
  selector: 'app-rmtl-gatepass-generate',
  templateUrl: './rmtl-gatepass-generate.component.html',
  styleUrls: ['./rmtl-gatepass-generate.component.css']
})
export class RmtlGatepassGenerateComponent implements OnInit {
  fromDate: string = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  toDate: string = new Date().toISOString().slice(0, 10);

  reportIds: string[] = [];
  selectedReportId: string = '';

  devices: DeviceRow[] = [];
  selectAll = false;

  loadingList = false;
  loadingDevices = false;
  errorMsg = '';
  gatepassInfo: any = null;

  // Modal form state (payload model)
  gatepassForm = {
    dispatch_to: '',
    receiver_name: '',
    receiver_designation: '',
    receiver_mobile: '',
    vehicle: '',
    serial_numbers: '',
    report_ids: ''
  };

  private gatepassModalRef: any;
  payload: any;

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

  // ---------- Selection ----------
  toggleAllDevices(): void {
    this.devices.forEach(d => (d.selected = this.selectAll));
  }
  clearSelection(): void {
    this.devices.forEach(d => (d.selected = false));
    this.selectAll = false;
  }
  onRowCheckboxChange(): void {
    this.selectAll = this.devices.length > 0 && this.devices.every(d => !!d.selected);
  }

  // ---------- Modal open/close ----------
  openGatepassModal(): void {
    if (this.selectedCount === 0) return;

    const selected = this.devices.filter(d => d.selected);
    this.gatepassForm.serial_numbers = this.buildMakewiseSerials(selected);
    this.gatepassForm.report_ids = this.selectedReportId;

    const el = document.getElementById('gatepassModal');
    if (el && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      this.gatepassModalRef = new bootstrap.Modal(el, { backdrop: 'static' });
      this.gatepassModalRef.show();
    } else {
      // Fallback: if Bootstrap JS not loaded, still allow submission via inline section
      console.warn('Bootstrap Modal not found. Ensure bootstrap.bundle.js is loaded.');
    }
  }

  closeGatepassModal(): void {
    if (this.gatepassModalRef) {
      this.gatepassModalRef.hide();
    }
  }

  private buildMakewiseSerials(selected: DeviceRow[]): string {
    const byMake = new Map<string, string[]>();
    selected.forEach(d => {
      const make = (d.make || 'UNKNOWN').toUpperCase();
      const sn = d.serial_number ?? (d.device_id != null ? String(d.device_id) : '');
      if (!sn) return;
      if (!byMake.has(make)) byMake.set(make, []);
      byMake.get(make)!.push(sn);
    });

    // Format as "MAKE1: SN1, SN2 | MAKE2: SN3"
    return Array.from(byMake.entries())
      .map(([mk, sns]) => `${mk}: ${sns.join(', ')}`)
      .join(' | ');
  }

  // ---------- Submit ----------
  submitGatepass(): void {
    // Basic client checks
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
      serial_numbers: f.serial_numbers.trim(),
      report_ids: f.report_ids.trim()
    };

    // Use a dedicated API for this payload
    this.api.createGatePass(this.payload).subscribe({
      next: (res: any) => {
        this.closeGatepassModal();
        this.gatepassInfo = res?.gatepass ?? res;
        alert('Gatepass Generated!');
        this.loadReportIds(); // Reload report IDs to reset state
        this.devices = []; // Clear devices after gatepass generation
        // this.downloadGatepassPdf(this.gatepassInfo);
      },
      error: err => {
        console.error(err);
        alert('Failed to generate gatepass');
      }
    });
  }

  // ---------- Template helpers ----------
  trackBySerial(_idx: number, item: DeviceRow): string {
    return item?.serial_number ?? String(_idx);
  }
  trackByDeviceId = (_: number, item: DeviceRow) => item?.id ?? item?.device_id ?? _;
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

  printGatepass(): void {
    // window.print();
  if (this.gatepassInfo) this.downloadGatepassPdf(this.gatepassInfo);
  }
  private parseMakewiseSerials(str: string): { make: string; serials: string[] }[] {
  if (!str) return [];
  // Expected format: "MAKE1: SN1, SN2 | MAKE2: SN3"
  return str.split('|')
    .map(s => s.trim())
    .filter(Boolean)
    .map(group => {
      const [mk, rest] = group.split(':');
      const make = (mk || 'UNKNOWN').trim();
      const serials = (rest || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      return { make: make.toUpperCase(), serials };
    });
}

private buildGatepassDoc(gp: any): TDocumentDefinition {
  const createdAt = gp.created_at ? new Date(gp.created_at) : new Date();
  const createdAtStr = createdAt.toLocaleString();

  const groups = this.parseMakewiseSerials(gp.serial_numbers);
  const tableBody: any[] = [
    [{ text: '#', style: 'th' }, { text: 'Make', style: 'th' }, { text: 'Serial Number', style: 'th' }]
  ];

  let idx = 1;
  groups.forEach(g => {
    g.serials.forEach(sn => {
      tableBody.push([
        { text: String(idx++), alignment: 'center' },
        { text: g.make },
        { text: sn }
      ]);
    });
  });

  const totalCount = idx - 1;

  return {
    pageSize: 'A4',
    pageMargins: [36, 48, 36, 48],
    content: [
      {
        columns: [
          {
            stack: [
              { text: 'RMTL Gatepass', style: 'h1' },
              { text: 'M.P. Paschim Kshetra Vidyut Vitran Co. Ltd', style: 'sub' }
            ]
          },
          {
            alignment: 'right',
            stack: [
              { text: `Dispatch No: ${gp.dispatch_number || gp.id}`, style: 'rightLbl' },
              { text: `Created: ${createdAtStr}`, style: 'rightLbl' },
              // QR with dispatch no if present
              gp.dispatch_number ? { qr: gp.dispatch_number, fit: 60, margin: [0, 6, 0, 0] } : {}
            ].filter(Boolean)
          }
        ]
      },

      { canvas: [ { type: 'line', x1:0, y1:0, x2:525, y2:0, lineWidth:1 } ], margin: [0,10,0,10] },

      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            [
              { text: `Dispatch To: ${gp.dispatch_to || '-'}` },
              { text: `Vehicle: ${gp.vehicle || '-'}` },
              { text: `Report ID(s): ${gp.report_ids || '-'}` }
            ],
            [
              { text: `Receiver: ${gp.receiver_name || '-'}` },
              { text: `Designation: ${gp.receiver_designation || '-'}` },
              { text: `Mobile: ${gp.receiver_mobile || '-'}` }
            ]
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 10]
      },

      { text: `Serial Numbers (${totalCount})`, style: 'h2', margin: [0, 6, 0, 6] },

      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', '*'],
          body: tableBody
        },
        layout: 'lightHorizontalLines'
      },

      { text: 'Notes:', style: 'h3', margin: [0, 12, 0, 4] },
      { text: '— Carry out standard handling and verification on receipt.\n— Any discrepancy must be reported immediately.', margin: [0,0,0,10] },

      {
        columns: [
          { text: '\n\n____________________________\nIssued By (Signature & Name)', alignment: 'left' },
          { text: '\n\n____________________________\nReceived By (Signature & Name)', alignment: 'right' }
        ],
        margin: [0, 20, 0, 0]
      }
    ],
    styles: {
      h1: { fontSize: 18, bold: true },
      h2: { fontSize: 14, bold: true },
      h3: { fontSize: 12, bold: true },
      sub: { fontSize: 10, color: '#666' },
      rightLbl: { fontSize: 10 },
      th: { bold: true }
    }
  };
}

private downloadGatepassPdf(gp: any): void {
  const doc = this.buildGatepassDoc(gp);
  const fname = `Gatepass_${gp.dispatch_number || gp.id || 'RMTL'}.pdf`;
  pdfMake.createPdf(doc).download(fname);
}

}
