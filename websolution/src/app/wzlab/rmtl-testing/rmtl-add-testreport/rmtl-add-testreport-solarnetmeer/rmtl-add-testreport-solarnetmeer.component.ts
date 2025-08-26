import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

type TDocumentDefinitions = any;

interface MeterDevice {
  id: number;
  serial_number: string;
  make?: string;
  capacity?: string;
  location_code?: string | null;
  location_name?: string | null;
}
interface AssignmentItem { id: number; device_id: number; device?: MeterDevice | null; }

interface CertRow {
  _open?: boolean;
  // link back to assignment
  assignment_id?: number;
  device_id?: number;
  notFound?: boolean;

  // consumer + meter
  consumer_name: string;
  address: string;
  meter_make: string;
  meter_sr_no: string;
  meter_capacity: string;

  // certificate
  certificate_no?: string;
  date_of_testing?: string;

  // payments / refs
  testing_fees?: number;
  mr_no?: string;
  mr_date?: string;
  ref_no?: string;

  // readings
  starting_reading?: number;
  final_reading_r?: number;
  final_reading_e?: number;
  difference?: number;

  // tests + remark
  starting_current_test?: string;
  creep_test?: string;
  dial_test?: string;
  remark?: string;
}

@Component({
  selector: 'app-rmtl-add-testreport-solarnetmeer',
  templateUrl: './rmtl-add-testreport-solarnetmeer.component.html',
  styleUrls: ['./rmtl-add-testreport-solarnetmeer.component.css']
})
export class RmtlAddTestreportSolarnetmeerComponent implements OnInit {

  // ======= Batch header (new) =======
  header = { location_code: '', location_name: '' };
  test_methods: any[] = [];
  test_statuses: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;

  // ======= Assignment loading =======
  device_status: 'ASSIGNED' = 'ASSIGNED';
  currentUserId = 0;
  currentLabId  = 0;
  loading = false;

  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: number; assignment_id: number; }> = {};

  // ======= Table + UI =======
  filterText = '';
  rows: CertRow[] = [ this.emptyRow() ];

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    // IDs for assignment API
    this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    this.currentLabId  = Number(localStorage.getItem('currentLabId') || 0);

    // enums for method/status
    this.api.getEnums().subscribe({
      next: (d) => {
        this.test_methods = d?.test_methods || [];
        this.test_statuses = d?.test_statuses || [];
      }
    });

    // prebuild serial index (no UI change)
    this.reloadAssigned(false);
  }

  // ======= Computed chips in header =======
  get matchedCount(){ return (this.rows ?? []).filter(r => !!r.meter_sr_no && !r.notFound).length; }
  get unknownCount(){ return (this.rows ?? []).filter(r => !!r.notFound).length; }

  // ======= Assignment helpers =======
  private emptyRow(seed?: Partial<CertRow>): CertRow {
    return {
      _open: true,
      consumer_name: '',
      address: '',
      meter_make: '',
      meter_sr_no: '',
      meter_capacity: '',
      ...seed
    };
  }

  private rebuildSerialIndex(asg: AssignmentItem[]) {
    this.serialIndex = {};
    for (const a of asg) {
      const d = a?.device ?? null;
      const s = (d?.serial_number || '').toUpperCase().trim();
      if (!s) continue;
      this.serialIndex[s] = {
        make: d?.make || '',
        capacity: d?.capacity || '',
        device_id: d?.id ?? a.device_id ?? 0,
        assignment_id: a?.id ?? 0,
      };
    }
  }

  /** Load assigned meters and optionally replace table rows. */
  reloadAssigned(replaceRows: boolean = true) {
    this.loading = true;
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        this.rebuildSerialIndex(asg);

        // set DC/Zone header from first device
        const first = asg.find(a => a.device);
        if (first?.device) {
          this.header.location_code = first.device.location_code ?? '';
          this.header.location_name = first.device.location_name ?? '';
        }

        if (replaceRows) {
          this.rows = asg.map(a => {
            const d = a.device || ({} as MeterDevice);
            return this.emptyRow({
              meter_sr_no: d.serial_number || '',
              meter_make: d.make || '',
              meter_capacity: d.capacity || '',
              assignment_id: a.id ?? 0,
              device_id: d.id ?? a.device_id ?? 0,
              _open: false,
              notFound: false,
            });
          });
          if (!this.rows.length) this.rows.push(this.emptyRow());
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onSerialChanged(i: number, serial: string) {
    const key = (serial || '').toUpperCase().trim();
    const row = this.rows[i];
    const hit = this.serialIndex[key];

    if (hit) {
      row.meter_make = hit.make || '';
      row.meter_capacity = hit.capacity || '';
      row.device_id = hit.device_id || 0;
      row.assignment_id = hit.assignment_id || 0;
      row.notFound = false;
    } else {
      row.meter_make = '';
      row.meter_capacity = '';
      row.device_id = 0;
      row.assignment_id = 0;
      row.notFound = key.length > 0;
    }
  }

  // ======= Table ops =======
  addRow() { this.rows.push(this.emptyRow()); }
  removeRow(i: number) { this.rows.splice(i, 1); }
  trackByRow(i: number, r: CertRow) { return `${r.assignment_id || 0}_${r.device_id || 0}_${r.meter_sr_no || ''}_${i}`; }

  displayRows(): CertRow[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter(r =>
      (r.meter_sr_no || '').toLowerCase().includes(q) ||
      (r.meter_make || '').toLowerCase().includes(q) ||
      (r.consumer_name || '').toLowerCase().includes(q));
  }

  recompute(i: number) {
    const r = this.rows[i];
    const a = Number(r.final_reading_r ?? 0);
    const b = Number(r.starting_reading ?? 0);
    const v = isFinite(a) && isFinite(b) ? +(a - b).toFixed(4) : undefined;
    r.difference = v;
  }

  // ================= PDF =================
  private row2page(r: CertRow, meta: { zone: string; method: string; status: string }): any[] {
    const title = [
      { text: 'OFFICE OF THE ASSISTANT ENGINEER (R.M.T.L.) M.T. DN.-I', alignment: 'center', bold: true },
      { text: 'M.P.P.K.V.V.CO.LTD. INDORE', alignment: 'center', bold: true, margin: [0, 2, 0, 0] },
      { text: 'CERTIFICATE FOR A.C. SINGLE/THREE PHASE METER', alignment: 'center', margin: [0, 6, 0, 2] },
      { text: `DC/Zone: ${meta.zone}    •    Test Method: ${meta.method || '-' }    •    Test Status: ${meta.status || '-'}`,
        alignment: 'center', fontSize: 9, color: '#555', margin: [0,0,0,6] }
    ];

    const hdrRight = r.certificate_no
      ? { text: r.certificate_no, alignment: 'right', margin: [0, -30, 0, 0] }
      : { text: '' };

    const two = (label: string, value: string | number | undefined) =>
      [{ text: label, style: 'lbl' }, { text: (value ?? '').toString(), colSpan: 2 }, {}];

    const threeFinal = [
      { text: 'Final Reading', style: 'lbl' },
      { text: `R- ${r.final_reading_r ?? ''}` },
      { text: `E- ${r.final_reading_e ?? ''}` }
    ];

    const mrLine = two('M.R. No & Date',
      `${r.mr_no ?? ''}${r.mr_no && r.mr_date ? '  DT  ' : ''}${r.mr_date ?? ''}`);

    const table = {
      layout: 'lightHorizontalLines',
      table: {
        widths: [140, '*', '*'],
        body: [
          two('Name of consumer', r.consumer_name),
          two('Address', r.address),
          two('Meter Make', r.meter_make),
          two('Meter Sr. No.', r.meter_sr_no),
          two('Meter Capacity', r.meter_capacity),
          two('Testing Fees Rs.', r.testing_fees),
          mrLine,
          two('Ref.', r.ref_no),
          two('Date of Testing', r.date_of_testing),
          two('Starting Reading', r.starting_reading),
          threeFinal,
          two('Difference', r.difference),
          two('Starting Current Test', r.starting_current_test),
          two('Creep Test', r.creep_test),
          two('Dial Test', r.dial_test),
          two('Remark', r.remark),
        ]
      }
    };

    const sign = {
      margin: [0, 16, 0, 0],
      columns: [
        { width: '*', text: '' },
        {
          width: 220,
          stack: [
            { text: 'A.E. (RMTL)', alignment: 'left', margin: [0, 0, 0, 2] },
            { text: 'M.P.P.K.V.V. CO. LTD', alignment: 'left' },
            { text: 'INDORE', alignment: 'left' },
          ]
        }
      ]
    };

    return [...title, hdrRight, table, sign];
  }

  private buildDoc(): TDocumentDefinitions {
    const pages: any[] = [];
    const meta = {
      zone: (this.header.location_code ? this.header.location_code + ' - ' : '') + (this.header.location_name || ''),
      method: this.testMethod || '',
      status: this.testStatus || ''
    };

    const data = this.rows.filter(r => (r.meter_sr_no || '').trim());
    data.forEach((r, i) => {
      pages.push(...this.row2page(r, meta));
      if (i < data.length - 1) pages.push({ text: '', pageBreak: 'after' });
    });

    return {
      pageSize: 'A4',
      pageMargins: [28, 28, 28, 36],
      defaultStyle: { fontSize: 10 },
      styles: { lbl: { bold: true } },
      content: pages,
      footer: (current: number, total: number) => ({
        columns: [
          { text: `Page ${current} of ${total}`, alignment: 'left', margin: [28, 0, 0, 0] },
          { text: 'M.P.P.K.V.V.CO. LTD., INDORE', alignment: 'right', margin: [0, 0, 28, 0] }
        ],
        fontSize: 8
      }),
      info: { title: 'Solar_NetMeter_Certificate' }
    };
  }

  downloadPdf() {
    const doc = this.buildDoc();
    pdfMake.createPdf(doc).download('SOLAR_NETMETER_CERTIFICATES.pdf');
  }
}
