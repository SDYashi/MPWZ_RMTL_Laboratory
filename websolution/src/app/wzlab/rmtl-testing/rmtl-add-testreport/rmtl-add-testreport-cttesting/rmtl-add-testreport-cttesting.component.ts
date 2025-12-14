import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth.service';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { CtReportPdfService, CtHeader, CtPdfRow } from 'src/app/shared/ct-report-pdf.service';

type Working = 'OK' | 'FAST' | 'SLOW' | 'NOT WORKING';
type CTRatio = '100/5' | '200/5' | '300/5' | '400/5' | '600/5';

interface DeviceLite {
  id: number;
  serial_number: string;
  make?: string;
  capacity?: string;
  location_code?: string | null;
  location_name?: string | null;
  [key: string]: any;
}

interface AssignmentItem {
  id: number;
  device_id: number;
  device?: DeviceLite | null;
  testing_bench?: { bench_name?: string } | null;
  user_assigned?: { name?: string } | null;
  assigned_by_user?: { name?: string } | null;
}

interface CtRow {
  serial_number: string;
  make: string;
  cap: string;
  ratio: string;
  class:string;
  polarity: string;
  remark: string;
  working?: Working;
  assignment_id?: number;
  device_id?: number;
  notFound?: boolean;
}

interface ModalState {
  open: boolean;
  title: string;
  message: string;
  action: 'clear' | 'submit' | null;
  payload?: any;
}

type InlineMsgType = 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'app-rmtl-add-testreport-cttesting',
  templateUrl: './rmtl-add-testreport-cttesting.component.html',
  styleUrls: ['./rmtl-add-testreport-cttesting.component.css']
})
export class RmtlAddTestreportCttestingComponent implements OnInit {
  header = {
    location_code: '',
    location_name: '',
    consumer_name: '',
    address: '',
    no_of_ct: '',
    city_class: '',
    ref_no: '',
    ct_make: '',
    mr_no: '',
    mr_date: '',
    amount_deposited: '',
    date_of_testing: '',
    primary_current: '',
    secondary_current: '',
    testing_user: '',
    approving_user: '',
    testing_bench: ''
  };

  testing_bench: any = '';
  testing_user: any = '';
  approving_user: any = '';

  pdf_date: string = '';

  lab_name: string = '';
  lab_address: string = '';
  lab_email: string = '';
  lab_phone: string = '';

  test_methods: any[] = [];
  test_statuses: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;

  makes: any;
  ct_classes: any;

  workingOptions: Working[] = ['OK', 'FAST', 'SLOW', 'NOT WORKING'];
  ratioOptions: CTRatio[] = ['100/5', '200/5', '300/5', '400/5', '600/5'];

  device_status: 'ASSIGNED' = 'ASSIGNED';
  currentUserId: any;
  currentLabId: any;
  report_type = 'CT_TESTING';
  device_testing_purpose: any;
  device_type: any;

  loading = false;
  submitting = false;

  private serialIndex: Record<string, {
    make?: string;
    capacity?: string;
    ratio?: string;
    device_id: number;
    assignment_id: number;
  }> = {};

  ctRows: CtRow[] = [this.emptyCtRow()];
  filterText = '';

  modal: ModalState = { open: false, title: '', message: '', action: null };

  approverId: number | null = null;

  capacities: any;
  fees_mtr_cts: any;
  test_dail_current_cheaps: any;

  // ✅ INLINE message state (replaces alert modal)
  inlineMsg = { type: 'info' as InlineMsgType, title: '', text: '' };

  // ✅ KEEP assignedPicker modal state
  assignedPicker = {
    open: false,
    items: [] as Array<{
      ratio: string;
      id: number;
      device_id: number;
      serial_number: string;
      make?: string;
      capacity?: string;
      selected: boolean;
      testing_bench?: { bench_name?: string } | null;
      testing_user?: { name?: string } | null;
      approving_user?: { name?: string } | null;
      device?: DeviceLite | null;
    }>,
    query: ''
  };

  constructor(
    private api: ApiServicesService,
    private ctPdf: CtReportPdfService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.device_type = 'CT';
    this.device_testing_purpose = 'CT_TESTING';

    this.currentUserId = this.authService.getuseridfromtoken();
    this.currentLabId = this.authService.getlabidfromtoken();

    const userName =
      this.authService.getUserNameFromToken?.() ||
      localStorage.getItem('currentUserName') ||
      '';

    if (userName) {
      this.testing_user = userName;
      this.header.testing_user = userName;
    }

    this.api.getEnums().subscribe({
      next: (d) => {
        this.test_methods = d?.test_methods || [];
        this.test_statuses = d?.test_statuses || [];
        this.report_type = d?.test_report_types?.CT_TESTING || this.report_type;

        this.makes = d?.makes || [];
        this.ct_classes = d?.ct_classes || [];

        this.device_testing_purpose = d?.test_report_types?.CT_TESTING ?? 'CT_TESTING';
        this.device_type = d?.device_types?.CT ?? 'CT';

        this.capacities = d?.capacities || [];
        this.fees_mtr_cts = d?.fees_mtr_cts || [];
        this.test_dail_current_cheaps = d?.test_dail_current_cheaps || [];

        this.setInlineMsg('info', '', 'Assigned CTs loaded successfully.');
      },
      error: () => this.setInlineMsg('error', 'Error', 'Unable to load enums. Please reload.')
    });

    this.loadLabInfo();
    this.loadAssignedPrefill();
  }

  // ===================== Inline msg =====================
  setInlineMsg(type: InlineMsgType, title: string, text: string) {
    this.inlineMsg = { type, title, text };
  }
  clearInlineMsg() {
    this.inlineMsg = { type: 'info', title: '', text: '' };
  }

  private pickRatio(dev?: Partial<DeviceLite> | null): string {
    if (!dev) return '';
    const direct = (dev as any).ratio ?? (dev as any).ct_ratio ?? (dev as any).ctRatio ?? (dev as any).ctratio;
    if (direct != null) return String(direct);

    const p = (dev as any).primary_current ?? this.header.primary_current;
    const s = (dev as any).secondary_current ?? this.header.secondary_current;
    return (p && s) ? `${p}/${s}` : '';
  }

  private validateContext(): { ok: boolean; reason?: string } {
    if (!this.device_type) return { ok: false, reason: 'Missing device_type — refresh enums.' };
    if (!this.device_testing_purpose) return { ok: false, reason: 'Missing device_testing_purpose — refresh enums.' };
    if (!this.currentUserId || this.currentUserId <= 0) return { ok: false, reason: 'Missing user_id — sign in again.' };
    if (!this.currentLabId || this.currentLabId <= 0) return { ok: false, reason: 'Missing lab_id — select a lab.' };
    return { ok: true };
  }

  private validate(): { ok: boolean; reason?: string } {
    const ctx = this.validateContext();
    if (!ctx.ok) return ctx;

    if (!this.testMethod || !this.testStatus) {
      return { ok: false, reason: 'Select Test Method and Test Status.' };
    }
    if (!this.header.date_of_testing) {
      return { ok: false, reason: 'Date of testing is required.' };
    }

    const validRows = (this.ctRows || []).filter(r => (r.serial_number || '').trim());
    if (!validRows.length) {
      return { ok: false, reason: 'Add at least one CT row.' };
    }

    // mapping check
    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      if (r.notFound) return { ok: false, reason: `Row #${i + 1}: CT not found in assigned list.` };
      if (!r.assignment_id || !r.device_id) return { ok: false, reason: `Row #${i + 1}: Missing assignment/device mapping.` };
    }

    this.testing_bench   = String(this.testing_bench ?? '').trim()   || '-';
    this.testing_user    = String(this.testing_user ?? '').trim()    || '-';
    this.approving_user  = String(this.approving_user ?? '').trim()  || '-';

    this.header.testing_bench   = this.testing_bench;
    this.header.testing_user    = this.testing_user;
    this.header.approving_user  = this.approving_user;

    this.header.no_of_ct = validRows.length.toString();
    if (!this.header.ct_make && validRows[0]) {
      this.header.ct_make = validRows[0].make || '';
    }

    return { ok: true };
  }

  private loadLabInfo() {
    if (!this.currentLabId) return;
    this.api.getLabInfo?.(this.currentLabId)?.subscribe?.({
      next: (lab: any) => {
        this.lab_name    = lab?.lab_pdfheader_name || lab?.lab_name || this.lab_name;
        this.lab_address = lab?.lab_pdfheader_address || lab?.lab_location || this.lab_address;
        this.lab_email   = lab?.lab_pdfheader_email || this.lab_email;
        this.lab_phone   = lab?.lab_pdfheader_contaserial_number || this.lab_phone;
      },
      error: () => {}
    });
  }

  private loadAssignedPrefill(): void {
    const ctx = this.validateContext();
    if (!ctx.ok) return;

    this.api.getAssignedMeterList(
      this.device_status,
      this.currentUserId,
      this.currentLabId,
      this.device_testing_purpose,
      this.device_type
    ).subscribe({
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.results) ? data.results : []);

        this.serialIndex = {};
        for (const a of asg) {
          const d = a.device as DeviceLite | undefined;
          const key = (d?.serial_number || '').toUpperCase().trim();
          if (!key) continue;
          this.serialIndex[key] = {
            make: d?.make || '',
            capacity: d?.capacity || '',
            ratio: this.pickRatio(d),
            device_id: d?.id ?? a.device_id ?? 0,
            assignment_id: a?.id ?? 0
          };
        }

        const first = asg[0];
        if (first) {
          const dev = first.device as DeviceLite | undefined;
          this.header.location_code = dev?.location_code || this.header.location_code;
          this.header.location_name = dev?.location_name || this.header.location_name;

          this.testing_bench   = this.testing_bench   || first.testing_bench?.bench_name  || '-';
          this.testing_user    = this.testing_user    || first.user_assigned?.name || '-';
          this.approving_user  = this.approving_user  || first.assigned_by_user?.name || '-';

          this.header.testing_bench   = this.testing_bench;
          this.header.testing_user    = this.testing_user;
          this.header.approving_user  = this.approving_user;

          if (!this.header.ct_make) this.header.ct_make = dev?.make || '';
        }
      },
      error: () => {}
    });
  }

  private emptyCtRow(seed?: Partial<CtRow>): CtRow {
    return {
      serial_number: '',
      make: '',
      cap: '',
      ratio: '',
      class: '',
      polarity: '',
      remark: '',
      ...seed
    };
  }

  addCtRow() {
    this.ctRows.push(this.emptyCtRow());
  }

  removeCtRow(i: number) {
    if (i >= 0 && i < this.ctRows.length) {
      this.ctRows.splice(i, 1);
      if (!this.ctRows.length) this.ctRows = [this.emptyCtRow()];
      this.header.no_of_ct = this.ctRows.filter(r => (r.serial_number || '').trim()).length.toString();
    }
  }

  trackByCtRow(i: number, r: CtRow) {
    return `${r.assignment_id || 0}_${r.device_id || 0}_${r.serial_number || ''}_${i}`;
  }

  displayRows(): CtRow[] {
    const q = (this.filterText || '').trim().toLowerCase();
    if (!q) return this.ctRows;
    return this.ctRows.filter(r =>
      (r.serial_number || '').toLowerCase().includes(q) ||
      (r.make || '').toLowerCase().includes(q) ||
      (r.remark || '').toLowerCase().includes(q)
    );
  }

  // ===================== Assigned Picker modal =====================
  openAssignPicker() {
    const v = this.validateContext();
    if (!v.ok) {
      this.setInlineMsg('warning', 'Context Error', v.reason!);
      return;
    }

    this.loading = true;
    this.api.getAssignedMeterList(
      this.device_status,
      this.currentUserId,
      this.currentLabId,
      this.device_testing_purpose,
      this.device_type
    ).subscribe({
      next: (data: any) => {
        const asg: AssignmentItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.results) ? data.results : [];

        this.serialIndex = {};
        const items = asg.map(a => {
          const d = a.device || ({} as DeviceLite);
          const key = (d.serial_number || '').toUpperCase().trim();

          const ratio = this.pickRatio(d);

          if (key) {
            this.serialIndex[key] = {
              make: d?.make || '',
              capacity: d?.capacity || '',
              ratio,
              device_id: d?.id ?? a.device_id ?? 0,
              assignment_id: a?.id ?? 0
            };
          }

          return {
            id: a.id ?? 0,
            device_id: d.id ?? a.device_id ?? 0,
            serial_number: d.serial_number || '',
            make: d.make || '',
            capacity: d.capacity || '',
            ratio,
            selected: false,
            testing_bench: a.testing_bench ?? null,
            testing_user: a.user_assigned ?? null,
            approving_user: a.assigned_by_user ?? null,
            device: d || null
          };
        });

        this.assignedPicker.items = items;
        this.assignedPicker.query = '';
        this.assignedPicker.open = true;
        this.loading = false;

        this.setInlineMsg('success', 'Loaded', `Assigned CTs loaded: ${items.length}`);
      },
      error: () => {
        this.loading = false;
        this.setInlineMsg('error', 'Load failed', 'Could not fetch assigned devices.');
      }
    });
  }

  get filteredAssigned() {
    const q = (this.assignedPicker.query || '').toLowerCase().trim();
    if (!q) return this.assignedPicker.items;
    return this.assignedPicker.items.filter(it =>
      (it.serial_number || '').toLowerCase().includes(q) ||
      (it.make || '').toLowerCase().includes(q) ||
      (it.capacity || '').toLowerCase().includes(q)
    );
  }

  toggleSelectAll(ev: any) {
    const on = !!ev?.target?.checked;
    this.filteredAssigned.forEach(i => (i.selected = on));
  }

  confirmAssignPicker() {
    const chosen = this.assignedPicker.items.filter(i => i.selected);
    if (!chosen.length) {
      this.assignedPicker.open = false;
      this.setInlineMsg('warning', 'No Selection', 'Please select at least one CT.');
      return;
    }

    const onlyOneEmpty =
      this.ctRows.length === 1 &&
      !Object.values(this.ctRows[0]).some(v => (v ?? '').toString().trim());
    if (onlyOneEmpty) this.ctRows = [];

    const existing = new Set(this.ctRows.map(r => (r.serial_number || '').toUpperCase().trim()));

    let added = 0;
    for (const c of chosen) {
      const ctno = (c.serial_number || '').trim();
      if (!ctno || existing.has(ctno.toUpperCase())) continue;

      this.ctRows.push(
        this.emptyCtRow({
          serial_number: ctno,
          make: c.make || '',
          cap: c.capacity || '',
          ratio: c.ratio || '',
          device_id: c.device_id || 0,
          assignment_id: c.id || 0,
          notFound: false
        })
      );
      existing.add(ctno.toUpperCase());
      added++;
    }

    if (!this.ctRows.length) this.ctRows.push(this.emptyCtRow());

    const first = chosen[0];
    const dev = first.device;
    if (dev) {
      if (!this.header.location_code) this.header.location_code = dev.location_code || '';
      if (!this.header.location_name) this.header.location_name = dev.location_name || '';
    }

    this.testing_bench = first.testing_bench?.bench_name || this.testing_bench || '-';
    this.testing_user = first.testing_user?.name || this.testing_user || '-';
    this.approving_user = first.approving_user?.name || this.approving_user || '-';

    this.header.testing_bench = this.testing_bench;
    this.header.testing_user = this.testing_user;
    this.header.approving_user = this.approving_user;

    this.header.no_of_ct = this.ctRows.filter(r => (r.serial_number || '').trim()).length.toString();
    this.header.ct_make = this.ctRows[0]?.make || '';

    this.assignedPicker.open = false;
    this.setInlineMsg('success', 'Added', `${added} CT row(s) added.`);
  }

  onCtNoChanged(i: number, value: string) {
    const key = (value || '').toUpperCase().trim();
    const row = this.ctRows[i];
    const hit = this.serialIndex[key];

    if (hit) {
      row.make = hit.make || '';
      row.cap = hit.capacity || '';
      row.device_id = hit.device_id || 0;
      row.ratio = hit.ratio || '';
      row.assignment_id = hit.assignment_id || 0;
      row.notFound = false;
    } else {
      row.make = '';
      row.cap = '';
      row.device_id = 0;
      row.ratio = '';
      row.assignment_id = 0;
      row.notFound = key.length > 0;
    }

    this.header.no_of_ct = this.ctRows.filter(r => (r.serial_number || '').trim()).length.toString();
    if (!this.header.ct_make) this.header.ct_make = row.make || '';
  }

  // ===================== Preview Modal (Confirm submit) =====================
  openConfirm(action: ModalState['action']) {
    if (action === 'clear') {
      this.modal = { open: true, title: 'Clear All Rows', message: 'Clear all rows and leave one empty row?', action: 'clear' };
      return;
    }

    const v = this.validate();
    if (!v.ok) {
      this.setInlineMsg('warning', 'Validation', v.reason || 'Invalid data');
      return;
    }

    this.modal = { open: true, title: 'Submit CT Report — Preview', message: '', action: 'submit' };
  }

  closeModal() {
    this.modal.open = false;
    this.modal.action = null;
  }

  confirmModal() {
    const a = this.modal.action;
    this.closeModal();

    if (a === 'clear') {
      this.ctRows = [this.emptyCtRow()];
      this.header.no_of_ct = '1';
      this.setInlineMsg('info', 'Cleared', 'All rows cleared.');
      return;
    }

    if (a === 'submit') {
      this.doSubmit();
    }
  }

  // ===================== Submit =====================
  private isoOn(dateStr?: string) {
    const d = dateStr ? new Date(dateStr + 'T10:00:00') : new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  }

  private parseFloatOrNull(v: string | number | undefined | null): number | null {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return isFinite(n) ? n : null;
  }

  private parseRatioFloat(ratioStr: string): number | null {
    if (!ratioStr) return null;
    const parts = ratioStr.split('/');
    if (parts.length !== 2) return null;
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (!isFinite(num) || !isFinite(den) || den === 0) return null;
    return num / den;
  }

  private inferWorkingFromRemark(remark: string): Working | undefined {
    const t = (remark || '').toLowerCase();
    if (!t) return undefined;
    if (/\bok\b/.test(t)) return 'OK';
    if (/\bfast\b/.test(t)) return 'FAST';
    if (/\bslow\b/.test(t)) return 'SLOW';
    if (/\bnot\s*working\b|\bfail\b|\bdef\b|\bdefective\b/.test(t)) return 'NOT WORKING';
    return undefined;
  }

  private buildPayload(): any[] {
    const when = this.isoOn(this.header.date_of_testing);

    const zone_dc =
      (this.header.location_code ? this.header.location_code + ' - ' : '') +
      (this.header.location_name || '');

    return (this.ctRows || [])
      .filter(r => (r.serial_number || '').trim())
      .map(r => {
        const working: Working =
          r.working ||
          this.inferWorkingFromRemark(r.remark) ||
          'OK';

        const ct_ratio_val = this.parseRatioFloat(r.ratio);

        const detailsObj = {
          consumer_name: this.header.consumer_name || '',
          address: this.header.address || '',
          ref_no: this.header.ref_no || '',
          no_of_ct: this.header.no_of_ct || '',
          city_class: this.header.city_class || '',
          ct_make: this.header.ct_make || '',
          mr_no: this.header.mr_no || '',
          mr_date: this.header.mr_date || '',
          amount_deposited: this.header.amount_deposited || '',
          primary_current: this.header.primary_current || '',
          secondary_current: this.header.secondary_current || '',
          zone_dc: zone_dc,

          serial_number: r.serial_number || '',
          make: r.make || '',
          cap: r.cap || '',
          ratio: r.ratio || '',
          polarity: r.polarity || '',
          remark: r.remark || ''
        };

        return {
          device_id: r.device_id ?? 0,
          assignment_id: r.assignment_id ?? 0,

          start_datetime: when,
          end_datetime: when,

          consumer_name: this.header.consumer_name || null,
          consumer_address: this.header.address || null,
          testing_fees: this.header.amount_deposited || null,
          fees_mr_no: this.header.mr_no || null,
          fees_mr_date: this.header.mr_date || null,
          ref_no: this.header.ref_no || null,

          ct_class: this.header.city_class || null,
          ct_primary_current: this.parseFloatOrNull(this.header.primary_current),
          ct_secondary_current: this.parseFloatOrNull(this.header.secondary_current),
          ct_ratio: ct_ratio_val,
          ct_polarity: r.polarity || null,

          test_requester_name: zone_dc || null,

          test_result: working,
          test_method: this.testMethod,
          test_status: this.testStatus,

          approver_id: this.approverId ?? null,
          approver_remark: null,

          details: JSON.stringify(detailsObj),

          report_type: this.report_type,
          created_by: String(this.currentUserId || '')
        };
      });
  }

  private doSubmit() {
    const payload = this.buildPayload();
    if (!payload.length) {
      this.setInlineMsg('warning', 'Nothing to submit', 'Please add at least one valid row.');
      return;
    }

    this.submitting = true;
    this.clearInlineMsg();

    this.api.postTestReports(payload).subscribe({
      next: async () => {
        this.submitting = false;
        this.setInlineMsg('success', 'Submitted', 'CT Testing report saved. Downloading PDF...');

        try {
          this.downloadPdfNow(true);
        } catch (e) {
          console.error('PDF generation failed:', e);
          this.setInlineMsg('warning', 'Saved', 'Saved, but PDF could not be generated.');
        }

        this.ctRows = [this.emptyCtRow()];
        this.header.no_of_ct = '1';
      },
      error: (err) => {
        this.submitting = false;
        console.error(err);
        this.setInlineMsg('error', 'Submission failed', 'Something went wrong while submitting the report.');
      }
    });
  }

  // ===================== PDF helpers =====================
  private toCtHeader(): CtHeader {
    return {
      location_code: this.header.location_code,
      location_name: this.header.location_name,
      consumer_name: this.header.consumer_name,
      address: this.header.address,
      no_of_ct: this.header.no_of_ct,
      city_class: this.header.city_class,
      ref_no: this.header.ref_no,
      ct_make: this.header.ct_make,
      mr_no: this.header.mr_no,
      mr_date: this.header.mr_date,
      amount_deposited: this.header.amount_deposited,
      date_of_testing: this.header.date_of_testing,
      primary_current: this.header.primary_current,
      secondary_current: this.header.secondary_current,

      testMethod: this.testMethod,
      testStatus: this.testStatus,

      testing_bench: this.testing_bench || '-',
      testing_user: this.testing_user || '-',
      approving_user: this.approving_user || '-',
      date: this.pdf_date || this.header.date_of_testing || null,

      lab_name: this.lab_name || null,
      lab_address: this.lab_address || null,
      lab_email: this.lab_email || null,
      lab_phone: this.lab_phone || null,

      leftLogoUrl: '/assets/icons/wzlogo.png',
      rightLogoUrl: '/assets/icons/wzlogo.png'
    };
  }

  private toCtRows(): CtPdfRow[] {
    return (this.ctRows || [])
      .filter(r => (r.serial_number || '').trim())
      .map(r => ({
        serial_number: r.serial_number || '-',
        make: r.make || '-',
        capacity: r.cap || '-',
        ct_ratio: r.ratio || '-',
        ct_class: r.class || '-',
        polarity: r.polarity || '-',
        remark: r.remark || '-'
      }));
  }

  downloadPdfNow(fromSubmit = false) {
    const header = this.toCtHeader();
    const rows = this.toCtRows();

    this.ctPdf.download(
      header,
      rows,
      `CT_TESTING_${header.date_of_testing || new Date().toISOString().slice(0, 10)}.pdf`
    );

    if (fromSubmit) {
      this.setInlineMsg('success', 'PDF Downloaded', 'Report submitted & PDF downloaded.');
    } else {
      this.setInlineMsg('success', 'PDF Ready', 'CT Testing PDF downloaded.');
    }
  }
}
