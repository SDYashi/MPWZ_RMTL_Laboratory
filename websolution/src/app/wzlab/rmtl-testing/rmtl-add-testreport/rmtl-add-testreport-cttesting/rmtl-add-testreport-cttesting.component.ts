import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

type TDocumentDefinitions = any;

interface DeviceLite {
  id: number;
  serial_number: string;   // maps to CT No.
  make?: string;
  capacity?: string;       // maps to Cap.
  location_code?: string | null;
  location_name?: string | null;
}
interface AssignmentItem { id: number; device_id: number; device?: DeviceLite | null; }

interface CtRow {
  ct_no: string;
  make: string;
  cap: string;
  ratio: string;
  polarity: string;
  remark: string;

  // assignment hints
  assignment_id?: number;
  device_id?: number;
  notFound?: boolean;
}

@Component({
  selector: 'app-rmtl-add-testreport-cttesting',
  templateUrl: './rmtl-add-testreport-cttesting.component.html',
  styleUrls: ['./rmtl-add-testreport-cttesting.component.css']
})
export class RmtlAddTestreportCttestingComponent implements OnInit {

  // ===== Batch header (new) =====
  header = {
    location_code: '', location_name: '',
    consumer_name: '', address: '',
    no_of_ct: '', city_class: '',
    ref_no: '', ct_make: '',
    mr_no: '', mr_date: '',
    amount_deposited: '',
    date_of_testing: '',
    primary_current: '', secondary_current: ''
  };

  // Test method / status
  test_methods: any[] = [];
  test_statuses: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;

  // ===== Assignment loading =====
  device_status: 'ASSIGNED' = 'ASSIGNED';
  currentUserId = 0;
  currentLabId  = 0;
  loading = false;

  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: number; assignment_id: number; }> = {};

  // ===== Rows =====
  ctRows: CtRow[] = [ this.emptyCtRow() ];

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    this.currentLabId  = Number(localStorage.getItem('currentLabId') || 0);

    // enums for method/status
    this.api.getEnums().subscribe({
      next: (d) => {
        this.test_methods = d?.test_methods || [];
        this.test_statuses = d?.test_statuses || [];
      }
    });

    // Prebuild serial index quietly
    this.reloadAssigned(false);
  }

  // ===== Derived counts =====
  get matchedCount(){ return (this.ctRows ?? []).filter(r => !!r.ct_no && !r.notFound).length; }
  get unknownCount(){ return (this.ctRows ?? []).filter(r => !!r.notFound).length; }

  // ===== Row helpers =====
  emptyCtRow(seed?: Partial<CtRow>): CtRow {
    return { ct_no: '', make: '', cap: '', ratio: '', polarity: '', remark: '', ...seed };
  }
  addCtRow() { this.ctRows.push(this.emptyCtRow()); }
  removeCtRow(i: number) { this.ctRows.splice(i, 1); if (!this.ctRows.length) this.addCtRow(); }
  clearCtRows() { this.ctRows = [ this.emptyCtRow() ]; }
  trackByCtRow(i: number, r: CtRow) { return `${r.assignment_id || 0}_${r.device_id || 0}_${r.ct_no || ''}_${i}`; }

  // ===== Assignment: build index + load =====
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

  /** Loads assigned items. If replaceRows=true, it replaces table rows. */
  reloadAssigned(replaceRows: boolean = true) {
    this.loading = true;
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        this.rebuildSerialIndex(asg);

        // DC/Zone header from first device (editable)
        const first = asg.find(a => a.device);
        if (first?.device) {
          this.header.location_code = first.device.location_code ?? '';
          this.header.location_name = first.device.location_name ?? '';
        }

        if (replaceRows) {
          this.ctRows = asg.map(a => {
            const d = a.device || ({} as DeviceLite);
            return this.emptyCtRow({
              ct_no: d.serial_number || '',
              make: d.make || '',
              cap: d.capacity || '',
              assignment_id: a.id ?? 0,
              device_id: d.id ?? a.device_id ?? 0,
              notFound: false
            });
          });
          if (!this.ctRows.length) this.ctRows.push(this.emptyCtRow());
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onCtNoChanged(i: number, value: string) {
    const key = (value || '').toUpperCase().trim();
    const row = this.ctRows[i];
    const hit = this.serialIndex[key];

    if (hit) {
      row.make = hit.make || '';
      row.cap  = hit.capacity || '';
      row.device_id = hit.device_id || 0;
      row.assignment_id = hit.assignment_id || 0;
      row.notFound = false;
    } else {
      row.make = '';
      row.cap  = '';
      row.device_id = 0;
      row.assignment_id = 0;
      row.notFound = key.length > 0;
    }
  }

  // ===== PDF =====
  private infoTable() {
    const two = (label: string, value: any) => ([{ text: label, style: 'lbl' }, { text: (value ?? '').toString() }]);
    return {
      layout: 'lightHorizontalLines',
      table: {
        widths: [210, '*'],
        body: [
          two('Name of consumer', this.header.consumer_name),
          two('Address', this.header.address),
          two('No. of C.T', this.header.no_of_ct),
          two('CITY CLASS', this.header.city_class),
          two('Ref.', this.header.ref_no),
          two('C.T Make', this.header.ct_make),
          two('M.R. No / Online Tran. ID & Date',
            `${this.header.mr_no || ''}${this.header.mr_no && this.header.mr_date ? '  DT  ' : ''}${this.header.mr_date || ''}`),
          two('Amount Deposited', this.header.amount_deposited),
          two('Date of Testing', this.header.date_of_testing),
        ]
      }
    };
  }

  private detailsTable() {
    const body:any[] = [[
      { text: 'Sr No.', style: 'th', alignment: 'center' },
      { text: 'C.T No.', style: 'th' },
      { text: 'Make', style: 'th' },
      { text: 'Cap.', style: 'th' },
      { text: 'Ratio', style: 'th' },
      { text: 'Polarity', style: 'th' },
      { text: 'Remark', style: 'th' },
    ]];

    this.ctRows.forEach((r, i) => {
      body.push([
        { text: String(i + 1), alignment: 'center' },
        r.ct_no || '',
        r.make || '',
        r.cap || '',
        r.ratio || '',
        r.polarity || '',
        r.remark || ''
      ]);
    });

    return {
      layout: 'lightHorizontalLines',
      table: {
        headerRows: 1,
        widths: ['auto', '*', '*', 'auto', 'auto', 'auto', '*'],
        body
      },
      margin: [0, 8, 0, 0]
    };
  }

  private footerLines() {
    const p = this.header.location_code ? `${this.header.location_code} - ` : '';
    const zone = `${p}${this.header.location_name || ''}`;
    return [
      { text: `DC/Zone: ${zone}    •    Test Method: ${this.testMethod || '-' }    •    Test Status: ${this.testStatus || '-'}`,
        alignment: 'center', fontSize: 9, color: '#555', margin: [0, 6, 0, 8] },
      { text: `Primary Current…… ${this.header.primary_current || ''} ……Amp`, margin: [0, 4, 0, 0] },
      { text: `Secondary Current…… ${this.header.secondary_current || ''} ……Amp`, margin: [0, 2, 0, 0] },
      {
        margin: [0, 16, 0, 0],
        columns: [
          { width: '*', text: '' },
          {
            width: 220,
            stack: [
              { text: 'Junior Engineer', alignment: 'left', margin: [0, 0, 0, 2] },
              { text: 'M.P.P.K.V.V. CO. LTD', alignment: 'left' },
              { text: 'INDORE', alignment: 'left' }
            ]
          }
        ]
      }
    ];
  }

  private buildDoc(): TDocumentDefinitions {
    const zoneLine = (this.header.location_code ? this.header.location_code + ' - ' : '') + (this.header.location_name || '');
    return {
      pageSize: 'A4',
      pageMargins: [28, 28, 28, 36],
      defaultStyle: { fontSize: 10 },
      styles: { lbl: { bold: true }, th: { bold: true } },
      content: [
        { text: 'OFFICE OF THE ASSISTANT ENGINEER (R.M.T.L.) M.T. DN.-I', alignment: 'center', bold: true },
        { text: 'M.P.P.K.V.V.CO.LTD. INDORE', alignment: 'center', bold: true, margin: [0, 2, 0, 0] },
        { text: 'CERTIFICATE FOR C.T', alignment: 'center', margin: [0, 6, 0, 2] },
        { text: `DC/Zone: ${zoneLine}    •    Test Method: ${this.testMethod || '-' }    •    Test Status: ${this.testStatus || '-'}`,
          alignment: 'center', fontSize: 9, color: '#555', margin: [0,0,0,6] },

        this.infoTable(),
        { text: 'Details of C.T', bold: true, margin: [0, 8, 0, 2] },
        this.detailsTable(),
        ...this.footerLines()
      ],
      footer: (current: number, total: number) => ({
        columns: [
          { text: `Page ${current} of ${total}`, alignment: 'left', margin: [28, 0, 0, 0] },
          { text: 'M.P.P.K.V.V.CO. LTD., INDORE', alignment: 'right', margin: [0, 0, 28, 0] }
        ],
        fontSize: 8
      }),
      info: { title: 'CT_Testing_Certificate' }
    };
  }

  downloadPdf() {
    const doc = this.buildDoc();
    pdfMake.createPdf(doc).download('CT_TESTING_CERTIFICATE.pdf');
  }
}
