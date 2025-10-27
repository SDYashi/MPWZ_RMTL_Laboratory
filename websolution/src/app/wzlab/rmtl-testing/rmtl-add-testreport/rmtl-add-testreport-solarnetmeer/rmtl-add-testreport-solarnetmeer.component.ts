import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth.service';
import { TestingBench, UserPublic } from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';
import {
  SolarNetMeterCertificatePdfService,
  SolarHeader,
  SolarRow
} from 'src/app/shared/solarnetmeter-certificate-pdf.service';

interface MeterDevice {
  id: number;
  serial_number: string;
  make?: string;
  capacity?: string;
  location_code?: string | null;
  location_name?: string | null;
}
interface AssignmentItem {
  id: number;           // assignment_id
  device_id: number;
  device?: MeterDevice | null;
  testing_bench?: TestingBench | null;
  user_assigned?: UserPublic | null;
  assigned_by_user?: UserPublic | null;
}

interface CertRow {
  _open?: boolean;
  assignment_id?: number;
  device_id?: number;
  notFound?: boolean;

  consumer_name: string;
  address: string;
  meter_make: string;
  meter_sr_no: string;
  meter_capacity: string;

  certificate_no?: string;
  date_of_testing?: string;

  testing_fees?: any;
  mr_no?: string;
  mr_date?: string;
  ref_no?: string;

  // legacy
  starting_reading?: number;
  final_reading_r?: number;
  final_reading_e?: number;
  difference?: number;

  // Import / Export (meter deltas)
  start_reading_import?: number | null;
  final_reading__import?: number | null;
  difference__import?: number | null;

  start_reading_export?: number | null;
  final_reading_export?: number | null;
  difference_export?: number | null;

  final_Meter_Difference?: number | null;

  // Import/Export reference readings
  import_ref_start_reading?: number | null;
  import_ref_end_reading?: number | null;
  _import_delta_ref?: number | null;

  export_ref_start_reading?: number | null;
  export_ref_end_reading?: number | null;
  _export_delta_ref?: number | null;

  error_percentage_import?: number | null;
  error_percentage_export?: number | null;

  // physical condition (not shown yet in PDF, but sent to API)
  physical_condition_of_device?: string | null;
  seal_status?: string | null;
  meter_glass_cover?: string | null;
  terminal_block?: string | null;
  meter_body?: string | null;

  // SHUNT
  shunt_reading_before_test?: number | null;
  shunt_reading_after_test?: number | null;
  shunt_ref_start_reading?: number | null;
  shunt_ref_end_reading?: number | null;
  shunt_error_percentage?: number | null;
  _shunt_delta_meter?: number | null;
  _shunt_delta_ref?: number | null;

  shunt_current_test?: string | null;
  shunt_creep_test?: string | null;
  shunt_dail_test?: string | null;

  // NUTRAL
  nutral_reading_before_test?: number | null;
  nutral_reading_after_test?: number | null;
  nutral_ref_start_reading?: number | null;
  nutral_ref_end_reading?: number | null;
  nutral_error_percentage?: number | null;
  _nutral_delta_meter?: number | null;
  _nutral_delta_ref?: number | null;

  nutral_current_test?: string | null;
  nutral_creep_test?: string | null;
  nutral_dail_test?: string | null;

  final_remarks?: string;
  remark?: string;
  test_result?: string;
}

type ModalAction = 'submit' | null;

interface ModalState {
  open: boolean;
  title: string;
  action: ModalAction;
  payload?: any;
  message?: string;
}

@Component({
  selector: 'app-rmtl-add-testreport-solarnetmeer',
  templateUrl: './rmtl-add-testreport-solarnetmeer.component.html',
  styleUrls: ['./rmtl-add-testreport-solarnetmeer.component.css']
})
export class RmtlAddTestreportSolarnetmeerComponent implements OnInit {
  header = {
    location_code: '',
    location_name: '',
    testing_bench: '-',
    testing_user: '-',
    approving_user: '-'
  };

  test_methods: any[] = [];
  test_statuses: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;

  channelView: 'SHUNT' | 'NUTRAL' | 'BOTH' = 'BOTH';

  testing_bench: string = '-';
  testing_user: string = '-';
  approving_user: string = '-';

  leftLogoUrl: string = '';
  rightLogoUrl: string = '';

  device_status: 'ASSIGNED' = 'ASSIGNED';
  currentUserId: any;
  currentLabId: any;
  loading = false;

  private serialIndex: Record<
    string,
    { make?: string; capacity?: string; device_id: number; assignment_id: number }
  > = {};

  filterText = '';
  rows: CertRow[] = [this.emptyRow()];

  submitting = false;
  modal: ModalState = { open: false, title: '', action: null };

  banner: {
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    _t?: any;
  } = {
    show: false,
    type: 'info',
    message: ''
  };

  office_types: any;
  commentby_testers: any;
  test_results: any;

  selectedSourceType: any;
  selectedSourceName: string = '';
  filteredSources: any;

  asgPicker = {
    open: false,
    list: [] as AssignmentItem[],
    filter: '',
    selected: {} as Record<number, boolean>,
    replaceExisting: true
  };

  labInfo: {
    lab_name?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    left_logo_url?: string | null;
    right_logo_url?: string | null;
  } | null = null;

  private pdfMode: 'download' | 'print' = 'download';

  device_testing_purpose: any;
  device_type: any;
  testing_request_types: any;
  fees_mtr_cts: any;
  test_dail_current_cheaps: any;
  physical_conditions: any;
  seal_statuses: any;
  glass_covers: any;
  terminal_blocks: any;
  meter_bodies: any;
  makes: any;
  capacities: any;

  constructor(
    private api: ApiServicesService,
    private pdfSvc: SolarNetMeterCertificatePdfService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.device_type = 'METER';
    this.device_testing_purpose = 'SOLAR_NETMETER';
    this.currentUserId = this.authService.getuseridfromtoken();
    this.currentLabId = this.authService.getlabidfromtoken();

    const userNameFromLS = this.authService.getUserNameFromToken() || '';
    if (userNameFromLS) {
      this.testing_user = userNameFromLS;
      this.header.testing_user = userNameFromLS;
    }

    this.api.getEnums().subscribe({
      next: (d) => {
        this.test_methods = d?.test_methods || [];
        this.test_statuses = d?.test_statuses || [];
        this.office_types = d?.office_types || [];
        this.commentby_testers = d?.commentby_testers || [];
        this.test_results = d?.test_results || [];
        this.physical_conditions = d?.physical_conditions || [];
        this.seal_statuses = d?.seal_statuses || [];
        this.glass_covers = d?.glass_covers || [];
        this.terminal_blocks = d?.terminal_blocks || [];
        this.meter_bodies = d?.meter_bodies || [];
        this.makes = d?.makes || [];
        this.capacities = d?.capacities || [];

        this.device_testing_purpose =
          d?.test_report_types?.SOLAR_NETMETER ??
          d?.test_report_types?.SOLAR_NET_METER ??
          d?.test_report_types?.SOLAR_NET_MEER ??
          'SOLAR_NETMETER';

        this.device_type = d?.device_types?.METER ?? 'METER';
        this.testing_request_types = d?.testing_request_types || [];
        this.fees_mtr_cts = d?.fees_mtr_cts || [];
        this.test_dail_current_cheaps = d?.test_dail_current_cheaps || [];
      }
    });

    if (this.currentLabId) {
      this.api.getLabInfo(this.currentLabId).subscribe({
        next: (info: any) => {
          this.labInfo = {
            lab_name: info?.lab_pdfheader_name || info?.lab_name,
            address: info?.lab_pdfheader_address || info?.lab_location,
            email: info?.lab_pdfheader_email || info?.lab_pdfheader_contact_no,
            phone: info?.lab_pdfheader_contact_no || info?.lab_location,
            left_logo_url: info?.left_logo_url || null,
            right_logo_url: info?.right_logo_url || null
          };
          if (this.labInfo.left_logo_url) {
            this.leftLogoUrl = this.labInfo.left_logo_url!;
          }
          if (this.labInfo.right_logo_url) {
            this.rightLogoUrl = this.labInfo.right_logo_url!;
          }
        },
        error: () => {}
      });
    }

    this.reloadAssigned(false); // don't replace existing table
  }

  // ----- validation -----
  private validateContext(): { ok: boolean; msg?: string } {
    if (!this.currentUserId)
      return { ok: false, msg: 'Missing user_id — please sign in again.' };
    if (!this.currentLabId)
      return { ok: false, msg: 'Missing lab_id — select a lab.' };
    if (!this.device_type)
      return { ok: false, msg: 'Missing device_type — refresh enums.' };
    if (!this.device_testing_purpose)
      return {
        ok: false,
        msg: 'Missing device_testing_purpose — refresh enums.'
      };
    return { ok: true };
  }

  private validate(): { ok: boolean; msg?: string } {
    const ctx = this.validateContext();
    if (!ctx.ok) return ctx;

    if (!this.testMethod || !this.testStatus) {
      return { ok: false, msg: 'Select Test Method and Test Status.' };
    }

    const rows = (this.rows || []).filter(
      (r) => (r.meter_sr_no || '').trim()
    );
    if (!rows.length)
      return {
        ok: false,
        msg: 'Add at least one device row with serial number.'
      };

    const badDateIdx = rows.findIndex((r) => !r.date_of_testing);
    if (badDateIdx !== -1) {
      return {
        ok: false,
        msg: `Row #${badDateIdx + 1}: Date of Testing is required.`
      };
    }

    this.header.testing_bench =
      (this.header.testing_bench || this.testing_bench || '').trim() || '-';
    this.header.testing_user =
      (this.header.testing_user || this.testing_user || '').trim() || '-';
    this.header.approving_user =
      (this.header.approving_user || this.approving_user || '').trim() || '-';

    this.testing_bench = this.header.testing_bench;
    this.testing_user = this.header.testing_user;
    this.approving_user = this.header.approving_user;

    return { ok: true };
  }

  // ----- source info -----
  fetchButtonData(): void {
    if (!this.selectedSourceType || !this.selectedSourceName) {
      this.showBanner(
        'warning',
        'Missing Input — Select a source type and enter code.'
      );
      return;
    }
    this.api.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
      next: (data) => {
        this.filteredSources = data;
        this.header.location_name = this.filteredSources?.name ?? '';
        this.header.location_code = this.filteredSources?.code ?? '';
        this.showBanner('success', 'Office/Store/Vendor loaded.');
      },
      error: () =>
        this.showBanner(
          'error',
          'Lookup failed — Check the code and try again.'
        )
    });
  }

  onSourceTypeChange(): void {
    this.selectedSourceName = '';
    this.filteredSources = [];
  }

  // ----- counts -----
  get matchedCount() {
    return (this.rows ?? []).filter(
      (r) => !!r.meter_sr_no && !r.notFound
    ).length;
  }
  get unknownCount() {
    return (this.rows ?? []).filter((r) => !!r.notFound).length;
  }

  // ----- row helpers -----
  private emptyRow(seed?: Partial<CertRow>): CertRow {
    return {
      _open: false,
      consumer_name: '',
      address: '',
      meter_make: '',
      meter_sr_no: '',
      meter_capacity: '',
      test_result: '',

      testing_fees: '',
      mr_no: '',
      mr_date: '',
      ref_no: '',

      start_reading_import: null,
      final_reading__import: null,
      difference__import: null,
      start_reading_export: null,
      final_reading_export: null,
      difference_export: null,
      final_Meter_Difference: null,

      import_ref_start_reading: null,
      import_ref_end_reading: null,
      _import_delta_ref: null,
      export_ref_start_reading: null,
      export_ref_end_reading: null,
      _export_delta_ref: null,
      error_percentage_import: null,
      error_percentage_export: null,

      physical_condition_of_device: null,
      seal_status: null,
      meter_glass_cover: null,
      terminal_block: null,
      meter_body: null,

      shunt_reading_before_test: null,
      shunt_reading_after_test: null,
      shunt_ref_start_reading: null,
      shunt_ref_end_reading: null,
      shunt_error_percentage: null,
      _shunt_delta_meter: null,
      _shunt_delta_ref: null,
      shunt_current_test: null,
      shunt_creep_test: null,
      shunt_dail_test: null,

      nutral_reading_before_test: null,
      nutral_reading_after_test: null,
      nutral_ref_start_reading: null,
      nutral_ref_end_reading: null,
      nutral_error_percentage: null,
      _nutral_delta_meter: null,
      _nutral_delta_ref: null,
      nutral_current_test: null,
      nutral_creep_test: null,
      nutral_dail_test: null,

      final_remarks: '',
      remark: '',

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
        assignment_id: a?.id ?? 0
      };
    }
  }

  // ----- assigned loading -----
  reloadAssigned(replaceRows: boolean = true) {
    const v = this.validateContext();
    if (!v.ok) {
      this.showBanner('warning', 'Context error — ' + v.msg!);
      return;
    }

    this.loading = true;

    this.api
      .getAssignedMeterList(
        this.device_status,
        this.currentUserId,
        this.currentLabId,
        this.device_testing_purpose,
        this.device_type
      )
      .subscribe({
        next: (data: any) => {
          let asg: AssignmentItem[] = Array.isArray(data)
            ? data
            : Array.isArray(data?.results)
              ? data.results
              : [];

          asg = asg.sort((a, b) => {
            const ma = (a.device?.make || '').toLowerCase();
            const mb = (b.device?.make || '').toLowerCase();
            if (ma !== mb) return ma.localeCompare(mb);
            return (a.device?.serial_number || '').localeCompare(
              b.device?.serial_number || ''
            );
          });

          this.rebuildSerialIndex(asg);

          const first = asg.find((a) => a.device);
          if (first?.device) {
            this.header.location_code =
              this.header.location_code ||
              (first.device.location_code ?? '');
            this.header.location_name =
              this.header.location_name ||
              (first.device.location_name ?? '');

            this.header.testing_bench =
              (this.header.testing_bench &&
                this.header.testing_bench !== '-') ?
                this.header.testing_bench :
                (first.testing_bench?.bench_name ?? '-');

            this.header.testing_user =
              (this.header.testing_user &&
                this.header.testing_user !== '-') ?
                this.header.testing_user :
                (first.user_assigned?.name ??
                  first.user_assigned?.username ??
                  '-');

            this.header.approving_user =
              (this.header.approving_user &&
                this.header.approving_user !== '-') ?
                this.header.approving_user :
                (first.assigned_by_user?.name ??
                  first.assigned_by_user?.username ??
                  '-');

            this.testing_bench = this.header.testing_bench;
            this.testing_user = this.header.testing_user;
            this.approving_user = this.header.approving_user;
          }

          this.asgPicker.list = asg;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.showBanner(
            'error',
            'Reload failed — Could not fetch assigned meters.'
          );
        }
      });
  }

  // ----- row editing -----
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

  addRow() {
    this.rows.push(this.emptyRow());
  }
  removeRow(i: number) {
    if (i >= 0 && i < this.rows.length) {
      this.rows.splice(i, 1);
      if (!this.rows.length) this.rows.push(this.emptyRow());
    }
  }

  trackByRow(i: number, r: CertRow) {
    return `${r.assignment_id || 0}_${
      r.device_id || 0
    }_${r.meter_sr_no || ''}_${i}`;
  }

  displayRows(): CertRow[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter(
      (r) =>
        (r.meter_sr_no || '').toLowerCase().includes(q) ||
        (r.meter_make || '').toLowerCase().includes(q) ||
        (r.consumer_name || '').toLowerCase().includes(q)
    );
  }

  // ----- legacy compute -----
  recompute(i: number) {
    const r = this.rows[i];
    const a = Number(r.final_reading_r ?? 0);
    const b = Number(r.starting_reading ?? 0);
    const v =
      isFinite(a) && isFinite(b)
        ? +(a - b).toFixed(4)
        : undefined;
    r.difference = v as any;
  }

  // ----- Import/Export compute -----
  recomputeIE(i: number) {
    const r = this.rows[i];

    const impStart = this.numOrNull(r.start_reading_import);
    const impFinal = this.numOrNull(r.final_reading__import);
    const expStart = this.numOrNull(r.start_reading_export);
    const expFinal = this.numOrNull(r.final_reading_export);

    const impDiff =
      impStart != null && impFinal != null
        ? this.round4(impFinal - impStart)
        : null;
    const expDiff =
      expStart != null && expFinal != null
        ? this.round4(expFinal - expStart)
        : null;

    r.difference__import = impDiff;
    r.difference_export = expDiff;

    const impRefStart = this.numOrNull(r.import_ref_start_reading);
    const impRefEnd = this.numOrNull(r.import_ref_end_reading);
    const expRefStart = this.numOrNull(r.export_ref_start_reading);
    const expRefEnd = this.numOrNull(r.export_ref_end_reading);

    const impRefDelta =
      impRefStart != null && impRefEnd != null
        ? this.round4(impRefEnd - impRefStart)
        : null;
    const expRefDelta =
      expRefStart != null && expRefEnd != null
        ? this.round4(expRefEnd - expRefStart)
        : null;

    r._import_delta_ref = impRefDelta;
    r._export_delta_ref = expRefDelta;

    if (impDiff != null && impRefDelta != null && impRefDelta !== 0) {
      r.error_percentage_import = this.round2(
        ((impDiff - impRefDelta) / impRefDelta) * 100
      );
    } else {
      r.error_percentage_import = null;
    }

    if (expDiff != null && expRefDelta != null && expRefDelta !== 0) {
      r.error_percentage_export = this.round2(
        ((expDiff - expRefDelta) / expRefDelta) * 100
      );
    } else {
      r.error_percentage_export = null;
    }

    // net Δ
    if (impDiff != null || expDiff != null) {
      const fin = (impDiff ?? 0) - (expDiff ?? 0);
      r.final_Meter_Difference = this.round4(fin);
    } else {
      r.final_Meter_Difference = null;
    }
  }

  // ----- SHUNT/NUTRAL compute -----
  recomputeChannel(i: number) {
    const r = this.rows[i];

    // SHUNT
    const sh_m_start = this.numOrNull(r.shunt_reading_before_test);
    const sh_m_final = this.numOrNull(r.shunt_reading_after_test);
    const sh_r_start = this.numOrNull(r.shunt_ref_start_reading);
    const sh_r_final = this.numOrNull(r.shunt_ref_end_reading);

    const sh_m_delta =
      sh_m_start != null && sh_m_final != null
        ? this.round4(sh_m_final - sh_m_start)
        : null;
    const sh_r_delta =
      sh_r_start != null && sh_r_final != null
        ? this.round4(sh_r_final - sh_r_start)
        : null;
    r._shunt_delta_meter = sh_m_delta;
    r._shunt_delta_ref = sh_r_delta;

    if (sh_m_delta != null && sh_r_delta != null && sh_r_delta !== 0) {
      r.shunt_error_percentage = this.round2(
        ((sh_m_delta - sh_r_delta) / sh_r_delta) * 100
      );
    } else {
      r.shunt_error_percentage = null;
    }

    // NUTRAL
    const nu_m_start = this.numOrNull(r.nutral_reading_before_test);
    const nu_m_final = this.numOrNull(r.nutral_reading_after_test);
    const nu_r_start = this.numOrNull(r.nutral_ref_start_reading);
    const nu_r_final = this.numOrNull(r.nutral_ref_end_reading);

    const nu_m_delta =
      nu_m_start != null && nu_m_final != null
        ? this.round4(nu_m_final - nu_m_start)
        : null;
    const nu_r_delta =
      nu_r_start != null && nu_r_final != null
        ? this.round4(nu_r_final - nu_r_start)
        : null;
    r._nutral_delta_meter = nu_m_delta;
    r._nutral_delta_ref = nu_r_delta;

    if (nu_m_delta != null && nu_r_delta != null && nu_r_delta !== 0) {
      r.nutral_error_percentage = this.round2(
        ((nu_m_delta - nu_r_delta) / nu_r_delta) * 100
      );
    } else {
      r.nutral_error_percentage = null;
    }
  }

  // ----- utils -----
  private numOrNull(v: any) {
    const n = Number(v);
    return isFinite(n) ? n : null;
  }
  private isoOn(dateStr?: string) {
    const d = dateStr ? new Date(dateStr + 'T10:00:00') : new Date();
    return new Date(
      d.getTime() - d.getTimezoneOffset() * 60000
    ).toISOString();
  }
  private round4(v: number) {
    return +v.toFixed(4);
  }
  private round2(v: number) {
    return +v.toFixed(2);
  }

  // ----- API payload -----
  private buildPayload(): any[] {
    const requester =
      this.header.location_name || this.filteredSources?.name || null;

    return (this.rows || [])
      .filter((r) => (r.meter_sr_no || '').trim())
      .map((r) => ({
        device_id: r.device_id ?? 0,
        assignment_id: r.assignment_id ?? 0,

        start_datetime: this.isoOn(r.date_of_testing),
        end_datetime: this.isoOn(r.date_of_testing),

        physical_condition_of_device: r.physical_condition_of_device || null,
        seal_status: r.seal_status || null,
        meter_glass_cover: r.meter_glass_cover || null,
        terminal_block: r.terminal_block || null,
        meter_body: r.meter_body || null,
        other: null,
        is_burned: false,

        reading_before_test: this.numOrNull(r.starting_reading),
        reading_after_test: this.numOrNull(r.final_reading_r),
        ref_start_reading: null,
        ref_end_reading: null,
        error_percentage: null,

        start_reading_import: this.numOrNull(r.start_reading_import),
        final_reading__import: this.numOrNull(r.final_reading__import),
        difference__import: this.numOrNull(r.difference__import),

        start_reading_export: this.numOrNull(r.start_reading_export),
        final_reading_export: this.numOrNull(r.final_reading_export),
        difference_export: this.numOrNull(r.difference_export),

        import_ref_start_reading: this.numOrNull(
          r.import_ref_start_reading
        ),
        import_ref_end_reading: this.numOrNull(r.import_ref_end_reading),
        export_ref_start_reading: this.numOrNull(
          r.export_ref_start_reading
        ),
        export_ref_end_reading: this.numOrNull(r.export_ref_end_reading),

        final_Meter_Difference: this.numOrNull(
          r.final_Meter_Difference
        ),
        error_percentage_import: this.numOrNull(
          r.error_percentage_import
        ),
        error_percentage_export: this.numOrNull(
          r.error_percentage_export
        ),

        shunt_reading_before_test: this.numOrNull(
          r.shunt_reading_before_test
        ),
        shunt_reading_after_test: this.numOrNull(
          r.shunt_reading_after_test
        ),
        shunt_ref_start_reading: this.numOrNull(
          r.shunt_ref_start_reading
        ),
        shunt_ref_end_reading: this.numOrNull(
          r.shunt_ref_end_reading
        ),
        shunt_error_percentage: this.numOrNull(
          r.shunt_error_percentage
        ),

        shunt_current_test: r.shunt_current_test || null,
        shunt_creep_test: r.shunt_creep_test || null,
        shunt_dail_test: r.shunt_dail_test || null,

        nutral_reading_before_test: this.numOrNull(
          r.nutral_reading_before_test
        ),
        nutral_reading_after_test: this.numOrNull(
          r.nutral_reading_after_test
        ),
        nutral_ref_start_reading: this.numOrNull(
          r.nutral_ref_start_reading
        ),
        nutral_ref_end_reading: this.numOrNull(
          r.nutral_ref_end_reading
        ),
        nutral_error_percentage: this.numOrNull(
          r.nutral_error_percentage
        ),

        nutral_current_test: r.nutral_current_test || null,
        nutral_creep_test: r.nutral_creep_test || null,
        nutral_dail_test: r.nutral_dail_test || null,

        details: r.remark || null,
        test_result: r.test_result || null,
        test_method: this.testMethod || null,
        test_status: this.testStatus || null,

        consumer_name: r.consumer_name || null,
        consumer_address: r.address || null,
        certificate_number: r.certificate_no || null,

        // fees to API: stay string, no Number()
        testing_fees: r.testing_fees ?? null,
        fees_mr_no: r.mr_no || null,
        fees_mr_date: r.mr_date || null,
        ref_no: r.ref_no || null,

        test_requester_name: requester,
        meter_removaltime_reading: null,
        meter_removaltime_metercondition: null,
        any_other_remarkny_zone: null,

        dail_test_kwh_rsm: null,
        recorderedbymeter_kwh: null,

        final_remarks: r.final_remarks || null,

        p4_division: null,
        p4_no: null,
        p4_date: null,
        p4_metercodition: null,

        approver_id: null,
        approver_remark: null,

        report_id: null,
        report_type: 'SOLAR_NETMETER',

        created_by: String(this.currentUserId || '')
      }));
  }

  // ----- modal flow -----
  openConfirm(action: ModalAction) {
    this.modal.action = action;

    if (action === 'submit') {
      const v = this.validate();
      if (!v.ok) {
        this.showBanner('warning', 'Validation error — ' + v.msg!);
        return;
      }
      this.modal.title = 'Submit Batch — Preview';
      this.modal.message = '';
      this.modal.open = true;
    }
  }
  closeModal() {
    this.modal.open = false;
    this.modal.action = null;
  }

  // ----- picker modal -----
  openAssignedPicker() {
    const v = this.validateContext();
    if (!v.ok) {
      this.showBanner('warning', 'Context error — ' + v.msg!);
      return;
    }

    if (!this.asgPicker.list.length) this.reloadAssigned(false);
    this.asgPicker.selected = {};
    this.asgPicker.filter = '';
    this.asgPicker.replaceExisting = true;
    this.asgPicker.open = true;
  }
  closeAssignedPicker() {
    this.asgPicker.open = false;
  }

  get filteredAssigned(): AssignmentItem[] {
    const q = this.asgPicker.filter.trim().toLowerCase();
    let list = this.asgPicker.list || [];
    if (!q) return list;
    return list.filter((a) => {
      const d = a.device || ({} as MeterDevice);
      return (
        (d.serial_number || '').toLowerCase().includes(q) ||
        (d.make || '').toLowerCase().includes(q) ||
        (d.capacity || '').toLowerCase().includes(q)
      );
    });
  }

  toggleSelectAllVisible(checked: boolean) {
    for (const a of this.filteredAssigned) {
      this.asgPicker.selected[a.id] = checked;
    }
  }

  confirmAssignedSelection() {
    const chosen = this.asgPicker.list.filter(
      (a) => this.asgPicker.selected[a.id]
    );
    if (!chosen.length) {
      this.showBanner(
        'warning',
        'No selection — Select at least one device.'
      );
      return;
    }

    const newRows = chosen.map((a) => {
      const d = a.device || ({} as MeterDevice);
      return this.emptyRow({
        meter_sr_no: d.serial_number || '',
        meter_make: d.make || '',
        meter_capacity: d.capacity || '',
        assignment_id: a.id ?? 0,
        device_id: d.id ?? a.device_id ?? 0,
        _open: false,
        notFound: false
      });
    });

    if (this.asgPicker.replaceExisting) {
      this.rows = newRows.length ? newRows : [this.emptyRow()];
    } else {
      const seen = new Set(
        this.rows.map((r) => (r.meter_sr_no || '').toUpperCase())
      );
      newRows.forEach((r) => {
        const key = (r.meter_sr_no || '').toUpperCase();
        if (!seen.has(key)) {
          this.rows.push(r);
          seen.add(key);
        }
      });
    }

    this.closeAssignedPicker();
    this.showBanner(
      'success',
      `${newRows.length} device(s) added to the table.`
    );
  }

  // ----- submit flow -----
  async confirmSubmitFromModal() {
    await this.doSubmit();
  }

  private async doSubmit() {
    const v = this.validate();
    if (!v.ok) {
      this.showBanner('warning', 'Validation error — ' + v.msg!);
      return;
    }

    const payload = this.buildPayload();
    this.submitting = true;

    this.api.postTestReports(payload).subscribe({
      next: async (_resp: any) => {
        this.submitting = false;

        // prefer lab info from API response, fallback to cached labInfo
        const labFromResp = _resp?.lab_info || _resp?.lab || null;
        const effLab = labFromResp || this.labInfo || {};

        const hdr: SolarHeader = {
          location_code: this.header.location_code,
          location_name: this.header.location_name,
          testMethod: this.testMethod,
          testStatus: this.testStatus,
          testing_bench:
            this.header.testing_bench || this.testing_bench || '-',
          testing_user:
            this.header.testing_user || this.testing_user || '-',
          date: new Date().toISOString().slice(0, 10),

          lab_name:
            (effLab as any)?.lab_pdfheader_name ||
            (effLab as any)?.lab_name ||
            this.labInfo?.lab_name ||
            '-',
          lab_address:
            (effLab as any)?.address ||
            (effLab as any)?.address_line ||
            this.labInfo?.address ||
            '-',
          lab_email:
            (effLab as any)?.email ||
            this.labInfo?.email ||
            '-',
          lab_phone:
            (effLab as any)?.phone ||
            this.labInfo?.phone ||
            '-',

          leftLogoUrl:
            (effLab as any)?.left_logo_url ||
            this.leftLogoUrl ||
            '/assets/icons/wzlogo.png',
          rightLogoUrl:
            (effLab as any)?.right_logo_url ||
            this.rightLogoUrl ||
            '/assets/icons/wzlogo.png'
        };

        // Map UI rows -> PDF rows
        const rows: SolarRow[] = (this.rows || [])
          .filter((r) => (r.meter_sr_no || '').trim())
          .map((r) => ({
            certificate_no: r.certificate_no,
            consumer_name: r.consumer_name,
            address: r.address,
            meter_make: r.meter_make,
            meter_sr_no: r.meter_sr_no,
            meter_capacity: r.meter_capacity,
            date_of_testing: r.date_of_testing || null,

            // convert to number if possible for PDF money formatting
            testing_fees:
              r.testing_fees != null && r.testing_fees !== ''
                ? Number(r.testing_fees)
                : null,
            mr_no: r.mr_no || null,
            mr_date: r.mr_date || null,
            ref_no: r.ref_no || null,

            // legacy
            starting_reading: this.numOrNull(r.starting_reading),
            final_reading_r: this.numOrNull(r.final_reading_r),
            final_reading_e: this.numOrNull(r.final_reading_e),
            difference: this.numOrNull(r.difference),

            // import/export meter readings
            start_reading_import: this.numOrNull(r.start_reading_import),
            final_reading__import: this.numOrNull(r.final_reading__import),
            difference__import: this.numOrNull(r.difference__import),

            start_reading_export: this.numOrNull(r.start_reading_export),
            final_reading_export: this.numOrNull(r.final_reading_export),
            difference_export: this.numOrNull(r.difference_export),

            final_Meter_Difference: this.numOrNull(
              r.final_Meter_Difference
            ),

            // reference + error
            import_ref_start_reading: this.numOrNull(
              r.import_ref_start_reading
            ),
            import_ref_end_reading: this.numOrNull(
              r.import_ref_end_reading
            ),
            error_percentage_import: this.numOrNull(
              r.error_percentage_import
            ),

            export_ref_start_reading: this.numOrNull(
              r.export_ref_start_reading
            ),
            export_ref_end_reading: this.numOrNull(
              r.export_ref_end_reading
            ),
            error_percentage_export: this.numOrNull(
              r.error_percentage_export
            ),

            // SHUNT
            shunt_reading_before_test: this.numOrNull(
              r.shunt_reading_before_test
            ),
            shunt_reading_after_test: this.numOrNull(
              r.shunt_reading_after_test
            ),
            shunt_ref_start_reading: this.numOrNull(
              r.shunt_ref_start_reading
            ),
            shunt_ref_end_reading: this.numOrNull(
              r.shunt_ref_end_reading
            ),
            shunt_error_percentage: this.numOrNull(
              r.shunt_error_percentage
            ),

            // NUTRAL
            nutral_reading_before_test: this.numOrNull(
              r.nutral_reading_before_test
            ),
            nutral_reading_after_test: this.numOrNull(
              r.nutral_reading_after_test
            ),
            nutral_ref_start_reading: this.numOrNull(
              r.nutral_ref_start_reading
            ),
            nutral_ref_end_reading: this.numOrNull(
              r.nutral_ref_end_reading
            ),
            nutral_error_percentage: this.numOrNull(
              r.nutral_error_percentage
            ),

            // qualitative
            starting_current_test:
              r.shunt_current_test || r.nutral_current_test || null,
            creep_test:
              r.shunt_creep_test || r.nutral_creep_test || null,
            dial_test:
              r.shunt_dail_test || r.nutral_dail_test || null,

            remark: r.remark || r.final_remarks || null,
            final_remark: r.final_remarks || null,
            test_result: r.test_result || null
          }));

        this.showBanner('success', 'Batch submitted successfully!');

        try {
          if (this.pdfMode === 'print') {
            await this.pdfSvc.print(hdr, rows);
          } else {
            await this.pdfSvc.download(
              hdr,
              rows,
              'SOLAR_NETMETER_CERTIFICATES.pdf'
            );
          }
          this.showBanner(
            'success',
            this.pdfMode === 'print'
              ? 'Certificates sent to print dialog.'
              : 'Certificates downloaded.'
          );
        } catch {
          this.showBanner(
            'warning',
            'Saved, but PDF could not be generated.'
          );
        }

        this.rows = [this.emptyRow()];
        setTimeout(() => this.closeModal(), 600);
      },
      error: (e) => {
        console.error(e);
        this.submitting = false;
        this.showBanner(
          'error',
          'Submission failed — Something went wrong while submitting the batch.'
        );
      }
    });
  }

  // ----- banner helpers -----
  showBanner(
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    autoCloseMs: number = 4000
  ) {
    if (this.banner._t) {
      clearTimeout(this.banner._t);
      this.banner._t = null;
    }
    this.banner.type = type;
    this.banner.message = message;
    this.banner.show = true;
    if (autoCloseMs && autoCloseMs > 0) {
      this.banner._t = setTimeout(() => this.clearBanner(), autoCloseMs);
    }
  }
  clearBanner() {
    if (this.banner._t) {
      clearTimeout(this.banner._t);
      this.banner._t = null;
    }
    this.banner.show = false;
    this.banner.message = '';
  }

  setPdfMode(mode: 'download' | 'print') {
    this.pdfMode = mode;
  }
}
