import { Component, OnInit } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { AuthService } from 'src/app/core/auth.service';
import { TestReportPayload } from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';

type ReportUnion =
  | 'stopdefective'
  | 'contested'
  | 'P4_ONM'
  | 'P4_vig'
  | 'Solar netmeter'
  | 'Solar Generation Meter'
  | 'CT Testing';



@Component({
  selector: 'app-rmtl-add-testreport',
  templateUrl: './rmtl-add-testreport.component.html',
  styleUrls: ['./rmtl-add-testreport.component.css']
})
export class RmtlAddTestreportComponent implements OnInit {
  reportType: ReportUnion = 'stopdefective';
  reportTypes: ReportUnion[] = [
    'stopdefective','contested','P4_ONM','P4_vig','Solar netmeter','Solar Generation Meter','CT Testing'
  ];

  // for CT certificate visibility condition already used in your print template
  deviceType:any;

  // Common selectors/ids for payload
  testMethod:any;
  testStatus:any;
  approverId :any;
  assignmentId:any;

  // 1) Batch sheet
  batch = {
    header: { zone: 'M.M.-2', phase: '3Ø', date: '2025-08-06' },
    rows: [] as { serial: string; make: string; capacity: string; result: string }[]
  };

  // 2) Contested/consumer set
  contested = {
    consumer_name: 'HITES WORLD',
    ivrs: 'N3360400844',
    address: 'NIL',
    by_whom: 'By Consumer / Electronic Complaint',
    fees: '1680/-',
    mr_no: 'Online Txn 2507xxxxxx DT 28/07/2025',
    testing_date: '2025-07-31',
    meter: { serial: 'SS22123888', make: 'SECURE', capacity: '3X10-100A', reading: '5523.283' },
    checks: {
      physical: 'OK', burnt: 'NO', seal: 'OK', glass: 'OK', terminal: 'OK', body: 'OK', other: '-'
    },
    before: '5523.283', after: '5528.295',
    error_pct: '0.16%',
    starting: 'OK',
    creep: 'OK',
    other: 'Dial Test OK',
    // optional ref meter readings (added to form)
    ref_start: '0',
    ref_end: '0'
  };

  // 3) CT certificate
  ctCert = {
    header: {
      consumer: 'FOCUS RENEWABLE ENERGY',
      address: 'NIL',
      ct_count: 8,
      ct_class: '0.5',
      testing_date: '2025-08-02',
      txn: 'Online Txn 2507xxxxxx DT 24/07/2025',
      amount: '7360/-'
    },
    rows: [
      { ct_no: '250630314-00067', make: 'ELMEX', capacity: '300/5A', ratio: '300/5', polarity: 'OK', result: 'OK', remark: '' },
      { ct_no: '250630314-00080', make: 'ELMEX', capacity: '300/5A', ratio: '300/5', polarity: 'OK', result: 'OK', remark: '' },
      { ct_no: '250630314-00066', make: 'ELMEX', capacity: '300/5A', ratio: '300/5', polarity: 'OK', result: 'OK', remark: '' },
      { ct_no: '250630314-00076', make: 'ELMEX', capacity: '300/5A', ratio: '300/5', polarity: 'OK', result: 'OK', remark: '' },
      { ct_no: '250630314-00087', make: 'ELMEX', capacity: '300/5A', ratio: '300/5', polarity: 'OK', result: 'OK', remark: '' },
      { ct_no: '250630314-00081', make: 'ELMEX', capacity: '300/5A', ratio: '300/5', polarity: 'OK', result: 'OK', remark: '' },
      { ct_no: '250630314-00098', make: 'ELMEX', capacity: '300/5A', ratio: '300/5', polarity: 'OK', result: 'OK', remark: '' },
      { ct_no: '250630314-00092', make: 'ELMEX', capacity: '300/5A', ratio: '300/5', polarity: 'OK', result: 'OK', remark: '' }
    ],
    // optional ref meter readings for CT test batch
    ref_start: '0',
    ref_end: '0'
  };
  device_status: string= 'ASSIGNED';
  test_methods: any;
  test_statuses: any;
  phases: any;
  office_types: string[] = [];
  selectedSourceType: string = '';
  selectedSourceName: string = '';
  filteredSources: any = null;
  currentLabId: any;

  constructor(private api: ApiServicesService, private auth: AuthService) {}

  ngOnInit(): void {
    this.api.getEnums().subscribe({
      next: (data) => {
        this.device_status = data.device_status;
        this.test_methods = data.test_methods;
        this.test_statuses = data.test_statuses;
        this.phases= data.phases
        this.office_types = data.office_types;
      },
      error: (err) => {
        console.log(err);
      }
    });
   this.assignmentId = localStorage.getItem('currentUserId');
   this.currentLabId = localStorage.getItem('currentLabId');
   this.loadBatch();
  }
loadBatch() {
  this.api.getAssignedMeterList('ASSIGNED',this.assignmentId,Number(this.currentLabId)).subscribe({
    next: (data) => {
      // this.batch.rows = data.meters.map((m:any) => ({ serial: m.serial_number, make: m.make, capacity: m.capacity, result: '' }));
      this.batch.rows = data.meters.map((m:any) => ({ serial: m.serial_number, make: m.make, capacity: m.capacity, result: '' }));
      if (this.batch.rows.length === 0) {
        this.addBatchRow();
      }

    },
    error: (error) => {
      console.error(error);
      // this.showAlert('Error', 'Failed to fetch source details. Check the code and try again.');
  }
})
}
  fetchButtonData(): void {
    if (!this.selectedSourceType || !this.selectedSourceName) {
      // this.showAlert('Missing Input', 'Please select Source Type and enter Location/Store/Vendor Code.');
      return;
    }
    this.api.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
      next: (data) => (this.filteredSources = data),
      error: (error) => {
        console.error(error);
        // this.showAlert('Error', 'Failed to fetch source details. Check the code and try again.');
      }
    });
  }
    onSourceTypeChange(): void {
    this.selectedSourceName = '';
    this.filteredSources = null;
  }



  // UI ops
  addBatchRow(): void { this.batch.rows.push({ serial: '', make: '', capacity: '', result: '' }); }
  removeBatchRow(i: number): void { this.batch.rows.splice(i, 1); }
  clearBatchRows(): void { this.batch.rows = []; }
  addCtRow(): void { this.ctCert.rows.push({ ct_no: '', make: '', capacity: '', ratio: '', polarity: '', result: '', remark: '' }); }
  removeCtRow(i: number): void { this.ctCert.rows.splice(i, 1); }
  clearCtRows(): void { this.ctCert.rows = []; }

  print(): void { window.print(); }

  // helpers
  private isoOn(dateStr?: string): string {
    const d = dateStr ? new Date(dateStr + 'T10:00:00') : new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  }
  private toNum(v: any): number { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
  private passFailFromText(txt: string): 'PASS' | 'FAIL' { return /ok|pass/i.test(txt || '') ? 'PASS' : 'FAIL'; }
  private passFailFromError(val: string | number): 'PASS' | 'FAIL' {
    const n = typeof val === 'number' ? val : this.toNum(String(val).replace('%',''));
    return Math.abs(n) <= 1 ? 'PASS' : 'FAIL'; // adjust tolerance here
  }

  // ---- API helpers (optional: resolve device ids by serial) ----
  private async getIdMap(serials: string[]): Promise<Record<string, number>> {
    try {
      if (!serials.length) return {};
      return await firstValueFrom(
        this.api.getDevicesByInwardNo(serials[0]).pipe(
          map((devices: any[]) => devices.reduce((acc: any, d: { inward_no: any; id: any; }) => ({ ...acc, [d.inward_no]: d.id }), {} as Record<string, number>))
        )
      );
      
    } catch { return {}; }
  }


  // ---- SUBMITTERS ------------------------------------------------------

  async submitBatch(): Promise<void> {
    const serials = (this.batch.rows || []).map(r => r.serial).filter(Boolean);
    const idMap = await this.getIdMap(serials);
    const when = this.isoOn(this.batch.header.date);
    const payload: TestReportPayload[] = (this.batch.rows || [])
      .filter(r => r.serial)
      .map(r => ({
        id: 0,
        device_id: idMap[r.serial] ?? 0,
        assignment_id: this.assignmentId,
        start_datetime: when,
        end_datetime: when,
        physical_condition_of_device: '-',
        seal_status: '-',
        meter_glass_cover: '-',
        terminal_block: '-',
        meter_body: '-',
        other: r.result || '-',
        is_burned: /burn/i.test(r.result || ''),
        reading_before_test: 0,
        reading_after_test: 0,
        details: `Zone:${this.batch.header.zone || ''} Phase:${this.batch.header.phase || ''}`,
        test_result: this.passFailFromText(r.result),
        test_method: this.testMethod,
        ref_start_reading: 0,
        ref_end_reading: 0,
        test_status: this.testStatus,
        error_percentage: 0,
        approver_id: this.approverId
      }));

    this.api.postTestReports(payload).subscribe({
      next: () => alert('Batch test reports submitted'),
      error: (e) => { console.error(e); alert('Failed to submit batch test reports'); }
    });
  }

  async submitContested(): Promise<void> {
    const serial = this.contested.meter.serial;
    const idMap = await this.getIdMap(serial ? [serial] : []);
    const device_id = serial ? (idMap[serial] ?? 0) : 0;

    const startISO = this.isoOn(this.contested.testing_date);
    const endISO = startISO;
    const before = this.toNum(this.contested.before);
    const after  = this.toNum(this.contested.after);
    const errPct = this.toNum(String(this.contested.error_pct).replace('%',''));
    const refStart = this.toNum(this.contested.ref_start);
    const refEnd   = this.toNum(this.contested.ref_end);

    const payload: TestReportPayload[] = [{
      id: 0,
      device_id,
      assignment_id: this.assignmentId,
      start_datetime: startISO,
      end_datetime: endISO,
      physical_condition_of_device: this.contested.checks.physical || '-',
      seal_status: this.contested.checks.seal || '-',
      meter_glass_cover: this.contested.checks.glass || '-',
      terminal_block: this.contested.checks.terminal || '-',
      meter_body: this.contested.checks.body || '-',
      other: this.contested.checks.other || '-',
      is_burned: /yes|burn/i.test(this.contested.checks.burnt || ''),
      reading_before_test: before,
      reading_after_test:  after,
      details: `By:${this.contested.by_whom} MR:${this.contested.mr_no} Fees:${this.contested.fees}`,
      test_result: this.passFailFromError(errPct),
      test_method: this.testMethod,
      ref_start_reading: refStart,
      ref_end_reading: refEnd,
      test_status: this.testStatus,
      error_percentage: errPct,
      approver_id: this.approverId
    }];

    this.api.postTestReports(payload).subscribe({
      next: () => alert('Contested test report submitted'),
      error: (e) => { console.error(e); alert('Failed to submit contested report'); }
    });
  }

  async submitCtTesting(): Promise<void> {
    const serials = (this.ctCert.rows || []).map(r => r.ct_no).filter(Boolean);
    const idMap = await this.getIdMap(serials);
    const when = this.isoOn(this.ctCert.header.testing_date);
    const refStart = this.toNum(this.ctCert.ref_start);
    const refEnd   = this.toNum(this.ctCert.ref_end);

    const payload: TestReportPayload[] = (this.ctCert.rows || [])
      .filter(r => r.ct_no)
      .map(r => ({
        id: 0,
        device_id: idMap[r.ct_no] ?? 0,
        assignment_id: this.assignmentId,
        start_datetime: when,
        end_datetime: when,
        physical_condition_of_device: '-',
        seal_status: '-',
        meter_glass_cover: '-',
        terminal_block: '-',
        meter_body: '-',
        other: r.remark || '-',
        is_burned: false,
        reading_before_test: 0,
        reading_after_test: 0,
        details: `Ratio:${r.ratio || '-'} Polarity:${r.polarity || '-'}`,
        test_result: this.passFailFromText(r.result),
        test_method: this.testMethod,
        ref_start_reading: refStart,
        ref_end_reading: refEnd,
        test_status: this.testStatus,
        error_percentage: 0,
        approver_id: this.approverId
      }));

    this.api.postTestReports(payload).subscribe({
      next: () => alert('CT test reports submitted'),
      error: (e) => { console.error(e); alert('Failed to submit CT reports'); }
    });
  }
}
