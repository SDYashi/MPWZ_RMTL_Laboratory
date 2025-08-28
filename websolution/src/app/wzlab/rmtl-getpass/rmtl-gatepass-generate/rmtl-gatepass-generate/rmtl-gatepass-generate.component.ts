// rmtl-gatepass-generate.component.ts
import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

// Avoid type import conflicts from pdfmake; keep it simple.
type TDocumentDefinition = any;

// If you use Bootstrap JS (bundle)
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
  office_types: any;
  selectedSourceType: any;
  selectedSourceName: string = '';
  filteredSources: any;
  // Modal form state (payload)
  gatepassForm = {
    dispatch_to: '',
    receiver_name: '',
    receiver_designation: '',
    receiver_mobile: '',
    vehicle: '',
    serial_numbers: '',   // comma-separated serials (no make)
    report_ids: ''
  };

  private gatepassModalRef: any;
  payload: any;

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    this.loadReportIds();
    this.api.getEnums().subscribe({
      next: (d) => {
        this.office_types = d?.office_types || [];
      }
    })
  }
      // ---------- Source fetch ----------
  fetchButtonData(): void {
    if (!this.selectedSourceType || !this.selectedSourceType) {
       alert('Missing Input');
      return;
    }
    this.api.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
      next: (data) => (this.filteredSources = data, 
        this.gatepassForm.dispatch_to = `${this.filteredSources.code} - ${this.filteredSources.name}` ) ,
      error: () => alert('Failed to fetch source details. Check the code and try again.')
    });
  }

  onSourceTypeChange(): void {
    this.selectedSourceName = '';
    this.filteredSources = [];
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

    // Build a flat, comma-separated serials string (NO MAKE)
    this.gatepassForm.serial_numbers = this.buildSerials(selected);
    this.gatepassForm.report_ids = this.selectedReportId;

    const el = document.getElementById('gatepassModal');
    if (el && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      this.gatepassModalRef = new bootstrap.Modal(el, { backdrop: 'static' });
      this.gatepassModalRef.show();
    } else {
      console.warn('Bootstrap Modal not found. Ensure bootstrap.bundle.js is loaded.');
    }
  }

  closeGatepassModal(): void {
    if (this.gatepassModalRef) {
      this.gatepassModalRef.hide();
    }
  }

  // Build comma-separated serial numbers only
  private buildSerials(selected: DeviceRow[]): string {
    return selected
      .map(d => d.serial_number ?? (d.device_id != null ? String(d.device_id) : ''))
      .filter(sn => !!sn)
      .join(', ');
  }

  // ---------- Submit ----------
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
      serial_numbers: f.serial_numbers.trim(), // already comma-separated
      report_ids: f.report_ids.trim()
    };

    this.api.createGatePass(this.payload).subscribe({
      next: (res: any) => {
        this.closeGatepassModal();
        this.gatepassInfo = res?.gatepass ?? res;
        alert('Gatepass Generated!');
        this.loadReportIds(); // reset report IDs
        this.devices = [];    // clear list
        // Optionally auto-download:
        this.downloadGatepassPdf(this.gatepassInfo);
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
    if (this.gatepassInfo) this.downloadGatepassPdf(this.gatepassInfo);
  }

  // Parse plain comma-separated serial numbers
  private parseSerials(str: string): string[] {
    if (!str) return [];
    return str
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  // ---------- PDF ----------
  // private buildGatepassDoc(gp: any): TDocumentDefinition {
  //   const createdAt = gp.created_at ? new Date(gp.created_at) : new Date();
  //   const createdAtStr = createdAt.toLocaleString();

  //   const serials = this.parseSerials(gp.serial_numbers);
  //   const tableBody: any[] = [
  //     [{ text: 'Serial Number', style: 'th' }]
  //   ];

  //   const serialsStr = serials.join(', ');
  //   tableBody.push([
  //     { text: serialsStr, colSpan: 2 }
  //   ]);

  //   const totalCount = serials.length;

  //   return {
  //     pageSize: 'A4',
  //     pageMargins: [36, 48, 36, 48],
  //     content: [
  //       {
  //         columns: [
  //           {
  //             stack: [
  //               { text: 'RMTL Gatepass', style: 'h1' },
  //               { text: 'M.P. Paschim Kshetra Vidyut Vitran Co. Ltd', style: 'sub' }
  //             ]
  //           },
  //           {
  //             alignment: 'right',
  //             stack: [
  //               { text: `Dispatch No: ${gp.dispatch_number || gp.id}`, style: 'rightLbl' },
  //               { text: `Created: ${createdAtStr}`, style: 'rightLbl' },
  //               gp.dispatch_number ? { qr: gp.dispatch_number, fit: 60, margin: [0, 6, 0, 0] } : {}
  //             ].filter(Boolean)
  //           }
  //         ]
  //       },

  //       { canvas: [ { type: 'line', x1:0, y1:0, x2:525, y2:0, lineWidth:1 } ], margin: [0,10,0,10] },

  //       {
  //         table: {
  //           widths: ['*', '*', '*'],
  //           body: [
  //             [
  //               { text: `Dispatch To: ${gp.dispatch_to || '-'}` },
  //               { text: `Vehicle: ${gp.vehicle || '-'}` },
  //               { text: `Report ID(s): ${gp.report_ids || '-'}` }
  //             ],
  //             [
  //               { text: `Receiver: ${gp.receiver_name || '-'}` },
  //               { text: `Designation: ${gp.receiver_designation || '-'}` },
  //               { text: `Mobile: ${gp.receiver_mobile || '-'}` }
  //             ]
  //           ]
  //         },
  //         layout: 'lightHorizontalLines',
  //         margin: [0, 0, 0, 10]
  //       },

  //       { text: `Serial Numbers (${totalCount})`, style: 'h2', margin: [0, 6, 0, 6] },

  //       {
  //         table: {
  //           headerRows: 1,
  //           widths: ['auto', '*'],
  //           body: tableBody,
  //           pageBreak: 'auto'
  //         },
  //         layout: 'lightHorizontalLines'
  //       },

  //       { text: 'Notes:', style: 'h3', margin: [0, 12, 0, 4] },
  //       { text: '— Carry out standard handling and verification on receipt.\n— Any discrepancy must be reported immediately.', margin: [0,0,0,10] },

  //       {
  //         columns: [
  //           { text: '\n\n____________________________\nIssued By (Signature & Name)', alignment: 'left' },
  //           { text: '\n\n____________________________\nReceived By (Signature & Name)', alignment: 'right' }
  //         ],
  //         margin: [0, 20, 0, 0]
  //       }
  //     ],
  //     styles: {
  //       h1: { fontSize: 18, bold: true },
  //       h2: { fontSize: 14, bold: true },
  //       h3: { fontSize: 12, bold: true },
  //       sub: { fontSize: 10, color: '#666' },
  //       rightLbl: { fontSize: 10 },
  //       th: { bold: true }
  //     }
  //   };
  // }

  private buildGatepassDoc(gp: any): TDocumentDefinition {
  const createdAt = gp.created_at ? new Date(gp.created_at) : new Date();
  const createdAtStr = createdAt.toLocaleString();

  const serials = this.parseSerials(gp.serial_numbers);
  const totalCount = serials.length;

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

      // >>> REPLACED the old table with this multi-column text block <<<
      this.buildSerialColumns(serials, 3), // change 3->4 if you want tighter columns

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

  // Add this helper inside the component class
private buildSerialColumns(serials: string[], colCount = 3) {
  if (!serials?.length) return { text: '-' };

  // split serials into N roughly equal columns
  const perCol = Math.ceil(serials.length / colCount);
  const cols = Array.from({ length: colCount }, (_, i) =>
    serials.slice(i * perCol, (i + 1) * perCol).join(', ')
  );

  return {
    columns: cols.map(txt => ({
      text: txt,
      fontSize: 10,
      lineHeight: 1.2,
      margin: [0, 0, 0, 0]
    })),
    columnGap: 10 // spacing between columns
  };
}

}
