import { Component, OnInit } from '@angular/core';
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
  // Optional hints (if your API provides)
  testing_bench?: string | null;
  testing_user?: string | null;
  approving_user?: string | null;
}
interface AssignmentItem { id: number; device_id: number; device?: DeviceLite | null; }

interface CtRow {
  ct_no: string;
  make: string;
  cap: string;
  ratio: CTRatio | string;
  polarity: string;
  remark: string;
  working?: Working;                 // NEW: Working enum selection
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

@Component({
  selector: 'app-rmtl-add-testreport-cttesting',
  templateUrl: './rmtl-add-testreport-cttesting.component.html',
  styleUrls: ['./rmtl-add-testreport-cttesting.component.css']
})
export class RmtlAddTestreportCttestingComponent implements OnInit {

  // ===== Header fields =====
  header = {
    location_code: '', location_name: '',
    consumer_name: '', address: '',
    no_of_ct: '', city_class: '',
    ref_no: '', ct_make: '',
    mr_no: '', mr_date: '',
    amount_deposited: '',
    date_of_testing: '',
    primary_current: '',
    secondary_current: '',
    testing_user: '',
    approving_user: '',
    testing_bench: ''
  };

  // Non-null bench/user/approver (enforced non-null in validate / picker fill)
  testing_bench: string = '';
  testing_user: string = '';
  approving_user: string = '';

  // PDF date
  pdf_date: string = '';

  // Lab info fetched (read-only)
  lab_name: string = '';
  lab_address: string = '';
  lab_email: string = '';
  lab_phone: string = '';

  // enums
  test_methods: any[] = [];
  test_statuses: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;
  test_results: any[] = [];
  office_types: any;
  commentby_testers: any;
  makes: any;
  ct_classes: any;

  // NEW: row dropdown options
  workingOptions: Working[] = ['OK', 'FAST', 'SLOW', 'NOT WORKING'];
  ratioOptions: CTRatio[] = ['100/5', '200/5', '300/5', '400/5', '600/5'];

  // assignment / lab context
  device_status: 'ASSIGNED' = 'ASSIGNED';
  currentUserId = 0;
  currentLabId  = 0;
  report_type = 'CT_TESTING';
  device_testing_purpose: any;
  device_type: any;
  loading = false;

  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: number; assignment_id: number; }> = {};

  // rows
  ctRows: CtRow[] = [ this.emptyCtRow() ];
  filterText = '';

  // modals
  modal: ModalState = { open: false, title: '', message: '', action: null };
  submitting = false;

  // alert modal
  alert = {
    open: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
    autoCloseMs: 0 as number | 0,
    _t: 0 as any
  };

  approverId: number | null = null;

  // Assigned picker w/ search + sorting
  assignedPicker = {
    open: false,
    items: [] as Array<{
      id: number;
      device_id: number;
      serial_number: string;
      make?: string;
      capacity?: string;
      selected: boolean;
      // optional bench/user/approver hints if API provides
      testing_bench?: string | null;
      testing_user?: string | null;
      approving_user?: string | null;
    }>,
    query: '' // 🔍 search
  };

  constructor(private api: ApiServicesService, private ctPdf: CtReportPdfService) {}

  ngOnInit(): void {
    // Robust defaults to avoid null / 0 issues
    this.device_type = 'CT';
    this.device_testing_purpose = 'CT_TESTING';

    this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    this.currentLabId  = Number(localStorage.getItem('currentLabId') || 0);

    const userName = localStorage.getItem('currentUserName') || '';
    if (userName) {
      this.testing_user = userName;
      this.header.testing_user = userName;
    }

    this.api.getEnums().subscribe({
      next: (d) => {
        this.test_methods  = d?.test_methods || [];
        this.test_statuses = d?.test_statuses || [];
        this.report_type   = d?.test_report_types?.CT_TESTING || this.report_type;
        this.office_types  = d?.office_types || [];
        this.commentby_testers = d?.commentby_testers || [];
        this.test_results = d?.test_results || [];
        this.makes = d?.device_makes || [];
        this.ct_classes = d?.ct_classes || [];

        // purpose/type with robust fallback
        this.device_testing_purpose = d?.test_report_types?.CT_TESTING ?? 'CT_TESTING';
        this.device_type = d?.device_types?.CT ?? 'CT';
      }
    });

    this.loadLabInfo();
  }

  // ===== Validation guards =====
  private validateContext(): { ok: boolean; reason?: string } {
    if (!this.device_type)   return { ok:false, reason:'Missing device_type — refresh enums.' };
    if (!this.device_testing_purpose) return { ok:false, reason:'Missing device_testing_purpose — refresh enums.' };

    // User & lab must be present for assignment filtering
    if (!this.currentUserId || this.currentUserId <= 0) return { ok:false, reason:'Missing user_id — sign in again.' };
    if (!this.currentLabId  || this.currentLabId <= 0)  return { ok:false, reason:'Missing lab_id — select a lab.' };
    return { ok:true };
  }

  private validate(): { ok:boolean; reason?: string } {
    const ctx = this.validateContext();
    if (!ctx.ok) return ctx;

    if (!this.testMethod || !this.testStatus) {
      return { ok:false, reason:'Select Test Method and Test Status.' };
    }
    if (!this.header.date_of_testing) {
      return { ok:false, reason:'Date of testing is required.' };
    }
    const validRows = (this.ctRows||[]).filter(r => (r.ct_no||'').trim());
    if (!validRows.length) {
      return { ok:false, reason:'Add at least one CT row.' };
    }

    // Enforce non-null bench/user/approver (UI + header mirror)
    this.testing_bench   = (this.testing_bench   || '').trim() || '-';
    this.testing_user    = (this.testing_user    || '').trim() || '-';
    this.approving_user  = (this.approving_user  || '').trim() || '-';
    this.header.testing_bench = this.testing_bench;
    this.header.testing_user  = this.testing_user;
    this.header.approving_user = this.approving_user;

    // Small conveniences
    this.header.no_of_ct = validRows.length.toString();
    if (!this.header.ct_make && validRows[0]) this.header.ct_make = validRows[0].make || '';

    return { ok:true };
  }

  // ===== Lab info =====
  private loadLabInfo() {
    if (!this.currentLabId) return;
    this.api.getLabInfo?.(this.currentLabId)?.subscribe?.({
      next: (lab: any) => {
        this.lab_name    = lab?.lab_pdfheader_name || lab?.name || lab?.lab_name || this.lab_name;
        this.lab_address = lab?.address || lab?.lab_address || this.lab_address;
        this.lab_email   = lab?.email || lab?.lab_email || this.lab_email;
        this.lab_phone   = lab?.phone || lab?.lab_phone || this.lab_phone;
      },
      error: () => { /* keep defaults */ }
    });
  }

  // ===== Source lookups =====
  selectedSourceType: any;
  selectedSourceName: string = '';
  filteredSources: any;

  fetchButtonData(): void {
    if (!this.selectedSourceType || !this.selectedSourceName) {
      this.openAlert('warning', 'Missing Input', 'Select a source type and enter code.');
      return;
    }
    this.api.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
      next: (data) => {
        this.filteredSources = data;
        this.header.location_name = this.filteredSources?.name ?? '';
        this.header.location_code = this.filteredSources?.code ?? '';
        this.openAlert('success', 'Source loaded', 'Office/Store/Vendor fetched.', 1200);
      },
      error: () => this.openAlert('error', 'Lookup failed', 'Check the code and try again.')
    });
  }
  onSourceTypeChange(): void { this.selectedSourceName = ''; this.filteredSources = []; }

  // ===== Counts / rows =====
  get matchedCount(){ return (this.ctRows ?? []).filter(r => !!r.ct_no && !r.notFound).length; }
  get unknownCount(){ return (this.ctRows ?? []).filter(r => !!r.notFound).length; }

  emptyCtRow(seed?: Partial<CtRow>): CtRow {
    return { ct_no: '', make: '', cap: '', ratio: '', polarity: '', remark: '', working: undefined, ...seed };
  }
  addCtRow(){ this.ctRows.push(this.emptyCtRow()); }
  removeCtRow(i: number){
    if (i >= 0 && i < this.ctRows.length) {
      this.ctRows.splice(i, 1);
      if (!this.ctRows.length) this.addCtRow();
      this.header.no_of_ct = (this.ctRows.filter(r => (r.ct_no||'').trim()).length || 1).toString();
      if (!this.header.ct_make && this.ctRows[0]) this.header.ct_make = this.ctRows[0].make || '';
    }
  }
  clearCtRows(){ this.ctRows = [ this.emptyCtRow() ]; }

  trackByCtRow(i:number, r:CtRow){ return `${r.assignment_id || 0}_${r.device_id || 0}_${r.ct_no || ''}_${i}`; }

  displayRows(): CtRow[] {
    const q = (this.filterText||'').trim().toLowerCase();
    if (!q) return this.ctRows;
    return this.ctRows.filter(r =>
      (r.ct_no || '').toLowerCase().includes(q) ||
      (r.make  || '').toLowerCase().includes(q) ||
      (r.remark|| '').toLowerCase().includes(q)
    );
  }

  // ===== Assigned devices picker (sorted + search) =====
  openAssignPicker(){
    const v = this.validateContext();
    if (!v.ok){ this.openAlert('warning','Context Error',v.reason!); return; }

    this.loading = true;
    // Use robust param order: status, userId, labId, purpose, type
    this.api.getAssignedMeterList(
      this.device_status,
      this.currentUserId,
      this.currentLabId,
      this.device_testing_purpose,
      this.device_type
    ).subscribe({
      next: (data:any) => {
        const asg: AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        // build index
        this.serialIndex = {};
        const items = asg
          .map(a => {
            const d = a.device || ({} as DeviceLite);
            const key = (d.serial_number || '').toUpperCase().trim();
            if (key) {
              this.serialIndex[key] = {
                make: d?.make || '',
                capacity: d?.capacity || '',
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
              selected: false,
              testing_bench: d.testing_bench ?? null,
              testing_user: d.testing_user ?? null,
              approving_user: d.approving_user ?? null
            };
          })
          // sort by make → serial
          .sort((x,y) => {
            const ma=(x.make||'').toLowerCase(), mb=(y.make||'').toLowerCase();
            if (ma!==mb) return ma.localeCompare(mb);
            return (x.serial_number||'').localeCompare(y.serial_number||'');
          });

        this.assignedPicker.items = items;
        this.assignedPicker.query = '';
        this.assignedPicker.open = true;
        this.loading = false;
        // this.openAlert('info','Assignments loaded', `${items.length} device(s) ready to pick.`, 1200);
      },
      error: () => { this.loading = false; this.openAlert('error', 'Load failed', 'Could not fetch assigned devices.'); }
    });
  }

  get filteredAssigned(){
    const q=(this.assignedPicker.query||'').toLowerCase().trim();
    if(!q) return this.assignedPicker.items;
    return this.assignedPicker.items.filter(it =>
         (it.serial_number||'').toLowerCase().includes(q)
      || (it.make||'').toLowerCase().includes(q)
      || (it.capacity||'').toLowerCase().includes(q)
    );
  }

  toggleSelectAll(ev: any){
    const on = !!ev?.target?.checked;
    this.filteredAssigned.forEach(i => i.selected = on);
  }

  confirmAssignPicker(){
    const chosen = this.assignedPicker.items.filter(i => i.selected);
    if (!chosen.length){ this.assignedPicker.open = false; return; }

    const onlyOneEmpty = this.ctRows.length === 1 && !Object.values(this.ctRows[0]).some(v => (v ?? '').toString().trim());
    if (onlyOneEmpty) this.ctRows = [];

    const existing = new Set(this.ctRows.map(r => (r.ct_no || '').toUpperCase().trim()));
    let added = 0;
    for (const c of chosen){
      const ctno = (c.serial_number || '').trim();
      if (!ctno || existing.has(ctno.toUpperCase())) continue;
      this.ctRows.push(this.emptyCtRow({
        ct_no: ctno,
        make: c.make || '',
        cap: c.capacity || '',
        device_id: c.device_id || 0,
        assignment_id: c.id || 0,
        notFound: false
      }));
      existing.add(ctno.toUpperCase());
      added++;
    }
    if (!this.ctRows.length) this.ctRows.push(this.emptyCtRow());

    // Auto-fill bench/user/approver from FIRST selected device if empty
    const first = chosen[0];
    if (!this.testing_bench)   this.testing_bench   = (first.testing_bench || '') || '-';
    if (!this.testing_user)    this.testing_user    = (first.testing_user || this.testing_user || '') || '-';
    if (!this.approving_user)  this.approving_user  = (first.approving_user || '') || '-';
    this.header.testing_bench = this.testing_bench;
    this.header.testing_user  = this.testing_user;
    this.header.approving_user = this.approving_user;

    this.header.no_of_ct = this.ctRows.filter(r => (r.ct_no||'').trim()).length.toString();
    this.header.ct_make = this.ctRows[0]?.make || '';

    this.assignedPicker.open = false;
    // this.openAlert('success', 'Devices added', `${added} device(s) added to rows.`, 1200);
  }

  // ===== Field helpers =====
  onCtNoChanged(i:number, value:string){
    const key = (value || '').toUpperCase().trim();
    const row = this.ctRows[i];
    const hit = this.serialIndex[key];

    if (hit){
      row.make = hit.make || '';
      row.cap  = hit.capacity || '';
      row.device_id = hit.device_id || 0;
      row.assignment_id = hit.assignment_id || 0;
      row.notFound = false;
    } else {
      row.make = ''; row.cap = ''; row.device_id = 0; row.assignment_id = 0; row.notFound = key.length>0;
    }
    this.header.no_of_ct = this.ctRows.filter(r => (r.ct_no||'').trim()).length.toString();
    if (!this.header.ct_make) this.header.ct_make = row.make || '';
  }

  private isoOn(dateStr?: string){
    const d = dateStr ? new Date(dateStr+'T10:00:00') : new Date();
    return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString();
  }

  // Map remark → Working when user didn’t select explicitly
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
    const zone = (this.header.location_code ? this.header.location_code + ' - ' : '') + (this.header.location_name || '');

    return (this.ctRows || [])
      .filter(r => (r.ct_no || '').trim())
      .map(r => {
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
          zone_dc: zone,
          ct_no: r.ct_no || '',
          make: r.make || '',
          cap: r.cap || '',
          ratio: r.ratio || '',
          polarity: r.polarity || '',
          remark: r.remark || ''
        };

        // IMPORTANT: send Working enum, not PASS/FAIL
        const working: Working = r.working || this.inferWorkingFromRemark(r.remark) || 'OK';

        return {
          device_id: r.device_id ?? 0,
          assignment_id: r.assignment_id ?? 0,
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
          ref_start_reading: 0,
          ref_end_reading: 0,
          error_percentage: 0,

          details: JSON.stringify(detailsObj),
          test_result: working,                // <-- FIX: Working enum string
          test_method: this.testMethod,
          test_status: this.testStatus,

          approver_id: this.approverId ?? null,
          report_type: this.report_type,
          created_by: String(this.currentUserId || '')
        };
      });
  }

  // ===== Submit flow =====
  openConfirm(action: ModalState['action'], payload?: any){
    this.modal.action = action; this.modal.payload = payload;
    if (action === 'submit'){ this.modal.title = 'Submit CT Report — Preview'; this.modal.message = ''; }
    else if (action === 'clear'){ this.modal.title = 'Clear All Rows'; this.modal.message = 'Clear all rows and leave one empty row?'; }
    else { this.modal.title = ''; this.modal.message = ''; }
    this.modal.open = true;
  }
  closeModal(){ this.modal.open=false; this.modal.action=null; this.modal.payload=undefined; }

  confirmModal(){
    const a = this.modal.action;
    if (a !== 'submit') this.closeModal();
    if (a === 'clear') this.clearCtRows();
    if (a === 'submit') this.doSubmit();
  }

  private doSubmit(){
    const v = this.validate();
    if (!v.ok){
      this.openAlert('warning','Validation error', v.reason!);
      return;
    }

    const payload = this.buildPayload();
    if (!payload.length){
      this.openAlert('warning', 'Nothing to submit', 'Please add at least one valid row.');
      return;
    }

    this.submitting = true;
    this.api.postTestReports(payload).subscribe({
      next: async () => {
        this.submitting = false;
        this.openAlert('success', 'Submitted', 'CT Testing report saved.');
        try {
          // Immediate PDF download + alert
          this.downloadPdfNow(true);
        } catch(e){
          console.error('PDF generation failed:', e);
          this.openAlert('warning','PDF error','Saved, but PDF could not be generated.');
        }
        // reset
        this.ctRows = [ this.emptyCtRow() ];
        this.header.no_of_ct = '1';
        setTimeout(()=> this.closeModal(), 600);
      },
      error: (err) => {
        this.submitting = false;
        console.error(err);
        this.openAlert('error', 'Submission failed', 'Something went wrong while submitting the report.');
      }
    });
  }

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
      .filter(r => (r.ct_no || '').trim())
      .map(r => ({
        ct_no: r.ct_no || '-',
        make: r.make || '-',
        cap: r.cap || '-',
        ratio: r.ratio || '-',
        polarity: r.polarity || '-',
        remark: r.remark || '-'
      }));
  }

  downloadPdfNow(fromSubmit = false){
    const header = this.toCtHeader();
    const rows = this.toCtRows();
    this.ctPdf.download(header, rows, `CT_TESTING_${header.date_of_testing || new Date().toISOString().slice(0,10)}.pdf`);
    this.openAlert(
      'success',
      fromSubmit ? 'PDF downloaded' : 'PDF Ready',
      fromSubmit ? 'Report submitted & PDF downloaded.' : 'CT Testing PDF downloaded.',
      1500
    );
  }

  // ===== Alerts =====
  openAlert(type: 'success'|'error'|'warning'|'info', title: string, message: string, autoCloseMs: number = 0){
    if (this.alert._t){ clearTimeout(this.alert._t); }
    this.alert = { open: true, type, title, message, autoCloseMs, _t: 0 };
    if (autoCloseMs > 0){ this.alert._t = setTimeout(()=> this.closeAlert(), autoCloseMs); }
  }
  closeAlert(){
    if (this.alert._t){ clearTimeout(this.alert._t); }
    this.alert.open = false;
  }
}
