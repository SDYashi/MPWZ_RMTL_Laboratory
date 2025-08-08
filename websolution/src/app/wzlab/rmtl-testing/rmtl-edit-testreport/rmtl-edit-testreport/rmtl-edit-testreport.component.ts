import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
// import { ApiServicesService } from 'src/app/services/api-services.service';

type DeviceType = 'METER' | 'CT';
type ReportType =
  | 'stopdefective'
  | 'contested'
  | 'P4_ONM'
  | 'P4_vig'
  | 'Solar netmeter'
  | 'Solar Generation Meter'
  | 'CT Testing';

@Component({
  selector: 'app-rmtl-edit-testreport',
  templateUrl: './rmtl-edit-testreport.component.html',
  styleUrls: ['./rmtl-edit-testreport.component.css']
})
export class RmtlEditTestreportComponent {


  // constructor(private api: ApiServicesService, private route: ActivatedRoute, private router: Router) {}
  constructor(private route: ActivatedRoute, private router: Router) {}

  reportTypes: ReportType[] = [
    'stopdefective','contested','P4_ONM','P4_vig','Solar netmeter','Solar Generation Meter','CT Testing'
  ];

  // Sample list; replace with API `getAllReportIds()`
  reportIdList: string[] = ['TRPT-1001','TRPT-1002','TRPT-1003'];

  selectedReportId = '';
  ready = false;

  model: any = {
    id: '',
    device_type: 'METER' as DeviceType,
    report_type: 'stopdefective' as ReportType,
    tested_date: '',
    inward_no: '',
    serial_number: '',
    make: '',
    meter_category: '',
    phase: '',
    meter_type: '',
    ct_class: '',
    ct_ratio: '',
    burden_va: null,
    observation: '',
    cause: '',
    site: '',
    load_kw: null,
    inspection_ref: '',
    solar_kwp: null,
    inverter_make: '',
    grid_voltage: null,
    magnetization_test: '',
    ratio_error_pct: null,
    phase_angle_min: null,
    result: '',
    tested_by: '',
    remarks: ''
  };

  ngOnInit(): void {
    const idFromRoute = this.route.snapshot.paramMap.get('id');
    if (idFromRoute) {
      this.selectedReportId = idFromRoute;
      this.loadById();
    }
  }

  // --- UI handlers ---
  onDeviceTypeChange(): void {
    if (this.model.device_type === 'METER') {
      this.model.ct_class = '';
      this.model.ct_ratio = '';
      this.model.burden_va = null;
    } else {
      this.model.meter_category = '';
      this.model.phase = '';
      this.model.meter_type = '';
    }
  }

  onReportTypeChange(): void {
    if (this.model.report_type !== 'CT Testing') {
      this.model.magnetization_test = '';
      this.model.ratio_error_pct = null;
      this.model.phase_angle_min = null;
    }
  }

  // --- Data operations ---
  loadById(): void {
    if (!this.selectedReportId) return;

    // Replace with API call:
    // this.api.getTestReportById(this.selectedReportId).subscribe({...})
    // Mocked sample for now:
    const mock = this.mockReport(this.selectedReportId);

    this.model = { ...mock };
    this.ready = true;
  }

  update(): void {
    if (!this.model.id) return;

    const payload = this.buildPayload();
    // API: this.api.updateTestReport(this.model.id, payload).subscribe(...)
    console.log('UPDATE payload', payload);
    alert('Report updated! (check console)');
  }

  confirmDelete(): void {
    if (!this.model.id) return;
    if (!confirm('Delete this test report?')) return;

    // API: this.api.deleteTestReport(this.model.id).subscribe(...)
    console.log('DELETE id', this.model.id);
    alert('Report deleted! (mock)');
    this.reset();
  }

  goToPrint(): void {
    if (!this.model.id) return;
    this.router.navigate(['/rmtl/testreport/print', this.model.id]);
  }

  reset(): void {
    this.ready = false;
    this.selectedReportId = '';
    this.model = { ...this.model, id:'', result:'', remarks:'' };
  }

  // --- Helpers ---
  buildPayload() {
    const base: any = {
      device_type: this.model.device_type,
      report_type: this.model.report_type,
      inward_no: this.model.inward_no || null,
      tested_date: this.model.tested_date,
      serial_number: this.model.serial_number,
      make: this.model.make || null,
      result: this.model.result,
      tested_by: this.model.tested_by || null,
      remarks: (this.model.remarks || '').trim() || null
    };

    if (this.model.device_type === 'METER') {
      base.meter = {
        category: this.model.meter_category || null,
        phase: this.model.phase || null,
        type: this.model.meter_type || null
      };
    } else {
      base.ct = {
        class: this.model.ct_class || null,
        ratio: this.model.ct_ratio || null,
        burden_va: this.model.burden_va ?? null
      };
    }

    switch (this.model.report_type as ReportType) {
      case 'stopdefective':
      case 'contested':
        base.details = { observation: this.model.observation || null, cause: this.model.cause || null };
        break;
      case 'P4_ONM':
      case 'P4_vig':
        base.details = { site: this.model.site || null, load_kw: this.model.load_kw ?? null, inspection_ref: this.model.inspection_ref || null };
        break;
      case 'Solar netmeter':
      case 'Solar Generation Meter':
        base.details = { solar_kwp: this.model.solar_kwp ?? null, inverter_make: this.model.inverter_make || null, grid_voltage: this.model.grid_voltage ?? null };
        break;
      case 'CT Testing':
        base.details = { magnetization_test: this.model.magnetization_test || null, ratio_error_pct: this.model.ratio_error_pct ?? null, phase_angle_min: this.model.phase_angle_min ?? null };
        break;
    }
    return base;
  }

  // Mock one or two shapes just to show the UI
  private mockReport(id: string): any {
    if (id === 'TRPT-1002') {
      return {
        id,
        device_type: 'CT',
        report_type: 'CT Testing',
        tested_date: '2025-08-02',
        inward_no: 'INW005',
        serial_number: 'CT20022',
        make: 'ELMEX',
        ct_class: '0.5',
        ct_ratio: '300/5',
        burden_va: 10,
        result: 'PASS',
        tested_by: 'AP',
        remarks: 'OK',
        // meter-only fields empty
        meter_category: '',
        phase: '',
        meter_type: '',
        // contested/solar fields empty
        observation: '',
        cause: '',
        site: '',
        load_kw: null,
        inspection_ref: '',
        solar_kwp: null,
        inverter_make: '',
        grid_voltage: null,
        // ct testing extras
        magnetization_test: 'PASS',
        ratio_error_pct: 0.12,
        phase_angle_min: 0.02
      };
    }

    // default mock (meter + stopdefective)
    return {
      id,
      device_type: 'METER',
      report_type: 'stopdefective',
      tested_date: '2025-08-06',
      inward_no: 'INW001',
      serial_number: 'SN10014',
      make: 'Genus',
      meter_category: 'Cat A',
      phase: '1P',
      meter_type: 'DLMS',
      result: 'FAIL',
      tested_by: 'Rakesh',
      remarks: 'Display off',
      // ct fields empty
      ct_class: '',
      ct_ratio: '',
      burden_va: null,
      // report-specific
      observation: 'No display',
      cause: 'LCD driver failure',
      site: '',
      load_kw: null,
      inspection_ref: '',
      solar_kwp: null,
      inverter_make: '',
      grid_voltage: null,
      magnetization_test: '',
      ratio_error_pct: null,
      phase_angle_min: null
    };
  }
}
