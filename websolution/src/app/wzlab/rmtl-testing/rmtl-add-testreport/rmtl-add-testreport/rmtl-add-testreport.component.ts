import { Component, OnInit } from '@angular/core';

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
export class RmtlAddTestreportComponent {


  deviceType: 'METER' | 'CT' = 'METER';
  reportType: ReportUnion = 'stopdefective';

  reportTypes: ReportUnion[] = [
    'stopdefective','contested','P4_ONM','P4_vig','Solar netmeter','Solar Generation Meter','CT Testing'
  ];

  // 1) Batch sheet data (first photo)
  batch = {
    header: { zone: 'M.M.-2', phase: '3Ø', date: '2025-08-06' },
    rows: [] as { serial: string; make: string; capacity: string; result: string }[]
  };

  // 2) Contested/consumer form data (green form)
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
    other: 'Dial Test OK'
  };

  // 3) CT certificate data (last photo)
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
    ]
  };

  ngOnInit(): void {
    this.loadSample();
  }

  onTypeChange(): void {
    // If user flips to CT ensure reportType is valid
    if (this.deviceType === 'CT' && this.reportType !== 'CT Testing') {
      this.reportType = 'CT Testing';
    }
  }

  loadSample(): void {
    // sample rows similar to the handwritten batch sheet
    this.batch.rows = [
      { serial: '3778054', make: 'Genus', capacity: '20-80', result: 'OK' },
      { serial: '3801205', make: 'Genus', capacity: '20-80', result: 'Display Off' },
      { serial: '3017336', make: 'HPL', capacity: '10-40', result: 'OK' },
      { serial: '3775366', make: 'Genus', capacity: '20-80', result: 'Stop on R Phase' },
      { serial: '3016400', make: 'HPL', capacity: '10-40', result: 'OK' }
    ];
  }

  print(): void {
    window.print();
  }
}
