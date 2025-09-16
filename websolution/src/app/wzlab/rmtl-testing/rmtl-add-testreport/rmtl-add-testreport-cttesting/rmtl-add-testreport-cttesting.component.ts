import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { CtReportPdfService, CtHeader, CtPdfRow } from 'src/app/shared/ct-report-pdf.service';

interface DeviceLite {
  id: number;
  serial_number: string;
  make?: string;
  capacity?: string;
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

  testing_bench: string = '';
  testing_user: string = '';
  pdf_date: string = '';

  // lab info fetched from API (no inputs in HTML)
  lab_name: string = '';
  lab_address: string = '';
  lab_email: string = '';
  lab_phone: string = '';

  test_methods: any[] = [];
  test_statuses: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;

  device_status: 'ASSIGNED' = 'ASSIGNED';
  currentUserId = 0;
  currentLabId  = 0;
  loading = false;

  private serialIndex: Record<string, { make?: string; capacity?: string; device_id: number; assignment_id: number; }> = {};

  ctRows: CtRow[] = [ this.emptyCtRow() ];
  filterText = '';

  modal: ModalState = { open: false, title: '', message: '', action: null };
  submitting = false;

  alert = {
    open: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
    autoCloseMs: 0 as number | 0,
    _t: 0 as any
  };

  approverId: number | null = null;
  report_type = 'CT_TESTING';
  test_results: any[] = [];
  office_types: any;
  selectedSourceType: any;
  selectedSourceName: string = '';
  filteredSources: any;
  commentby_testers: any;
  makes: any;
  ct_classes: any;

  assignedPicker = {
    open: false,
    items: [] as Array<{ id: number; device_id: number; serial_number: string; make?: string; capacity?: string; selected: boolean }>
  };
  device_testing_purpose: any;
  device_type: any;

  constructor(private api: ApiServicesService, private ctPdf: CtReportPdfService) {}

  ngOnInit(): void {
    this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    this.currentLabId  = Number(localStorage.getItem('currentLabId') || 0);

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
        this.device_testing_purpose = d?.test_report_types?.CT_TESTING;
        this.device_type = d.device_types?.CT;
      }
    });

    this.loadLabInfo(); // fetch lab info once
  }

  // fetch lab information (adjust method name if your service differs)
  private loadLabInfo() {
    this.api.getLabInfo?.(this.currentLabId)?.subscribe?.({
      next: (lab: any) => {
        this.lab_name = lab?.name || lab?.lab_name || this.lab_name;
        this.lab_address = lab?.address || lab?.lab_address || this.lab_address;
        this.lab_email = lab?.email || lab?.lab_email || this.lab_email;
        this.lab_phone = lab?.phone || lab?.lab_phone || this.lab_phone;
      },
      error: () => { /* keep defaults if unavailable */ }
    });
  }

  // ---------- Source fetch ----------
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

  onSourceTypeChange(): void {
    this.selectedSourceName = '';
    this.filteredSources = [];
  }

  get matchedCount(){ return (this.ctRows ?? []).filter(r => !!r.ct_no && !r.notFound).length; }
  get unknownCount(){ return (this.ctRows ?? []).filter(r => !!r.notFound).length; }

  emptyCtRow(seed?: Partial<CtRow>): CtRow {
    return { ct_no: '', make: '', cap: '', ratio: '', polarity: '', remark: '', ...seed };
  }
  addCtRow(){ this.ctRows.push(this.emptyCtRow()); }
  removeCtRow(i: number){
    if (i >= 0 && i < this.ctRows.length) {
      this.ctRows.splice(i, 1);
      if (!this.ctRows.length) this.addCtRow();
      this.header.no_of_ct = this.ctRows.filter(r => (r.ct_no||'').trim()).length.toString();
      if (!this.header.ct_make && this.ctRows[0]) this.header.ct_make = this.ctRows[0].make || '';
    }
  }
  clearCtRows(){ this.ctRows = [ this.emptyCtRow() ]; }
  trackByCtRow(i:number, r:CtRow){ return `${r.assignment_id || 0}_${r.device_id || 0}_${r.ct_no || ''}_${i}`; }

  displayRows(): CtRow[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.ctRows;
    return this.ctRows.filter(r =>
      (r.ct_no || '').toLowerCase().includes(q) ||
      (r.make || '').toLowerCase().includes(q) ||
      (r.remark || '').toLowerCase().includes(q)
    );
  }

  // Assigned devices picker
  openAssignPicker(){
    this.loading = true;
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId, this.device_type, this.device_testing_purpose).subscribe({
      next: (data:any) => {
        const asg: AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        this.serialIndex = {};
        this.assignedPicker.items = asg.map(a => {
          const d = a.device || ({} as DeviceLite);
          const key = (d.serial_number || '').toUpperCase().trim();
          if (key) this.serialIndex[key] = {
            make: d?.make || '',
            capacity: d?.capacity || '',
            device_id: d?.id ?? a.device_id ?? 0,
            assignment_id: a?.id ?? 0
          };
          return {
            id: a.id ?? 0,
            device_id: d.id ?? a.device_id ?? 0,
            serial_number: d.serial_number || '',
            make: d.make || '',
            capacity: d.capacity || '',
            selected: false
          };
        });
        this.assignedPicker.open = true;
        this.loading = false;
      },
      error: () => { this.loading = false; this.openAlert('error', 'Load failed', 'Could not fetch assigned devices.'); }
    });
  }
  toggleSelectAll(ev: any){
    const on = !!ev?.target?.checked;
    this.assignedPicker.items.forEach(i => i.selected = on);
  }
  confirmAssignPicker(){
    const chosen = this.assignedPicker.items.filter(i => i.selected);
    if (!chosen.length){ this.assignedPicker.open = false; return; }

    const onlyOneEmpty = this.ctRows.length === 1 && !Object.values(this.ctRows[0]).some(v => (v ?? '').toString().trim());
    if (onlyOneEmpty) this.ctRows = [];

    const existing = new Set(this.ctRows.map(r => (r.ct_no || '').toUpperCase().trim()));
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
    }
    if (!this.ctRows.length) this.ctRows.push(this.emptyCtRow());

    this.header.no_of_ct = this.ctRows.filter(r => (r.ct_no||'').trim()).length.toString();
    this.header.ct_make = this.ctRows[0]?.make || '';

    this.assignedPicker.open = false;
    this.openAlert('success', 'Devices added', 'Selected devices added to rows.', 1200);
  }

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

  private inferResult(remark: string): 'PASS'|'FAIL'|undefined {
    const t = (remark || '').toLowerCase();
    if (!t) return undefined;
    if (/\bok\b|\bpass\b/.test(t)) return 'PASS';
    if (/\bfail\b|\bdef\b|\bdefective\b/.test(t)) return 'FAIL';
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
          remark: r.remark || '',
        };

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
          test_result: this.inferResult(r.remark),
          test_method: this.testMethod,
          test_status: this.testStatus,
          approver_id: this.approverId ?? null,
          report_type: this.report_type
        };
      });
  }

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
    const payload = this.buildPayload();
    if (!payload.length){
      this.openAlert('warning', 'Nothing to submit', 'Please add at least one valid row.');
      return;
    }
    if (!this.header.date_of_testing){
      this.openAlert('warning', 'Validation error', 'Date of testing is required.');
      return;
    }

    this.submitting = true;
    this.api.postTestReports(payload).subscribe({
      next: () => {
        this.submitting = false;
        try { this.downloadPdfNow(true); } catch(e){ console.error('PDF generation failed:', e); }
        this.ctRows = [ this.emptyCtRow() ];
        this.header.no_of_ct = '1';
        setTimeout(()=> this.closeModal(), 800);
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
      testing_bench: this.testing_bench || null,
      testing_user: this.testing_user || null,
      date: this.pdf_date || this.header.date_of_testing || null,
      // Lab info from API:
      lab_name: this.lab_name || null,
      lab_address: this.lab_address || null,
      lab_email: this.lab_email || null,
      lab_phone: this.lab_phone || null,
      // Fixed logo URLs passed while generating PDF:
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
    this.ctPdf.download(header, rows);
    this.openAlert('success', fromSubmit ? 'Submitted' : 'PDF Ready', fromSubmit ? 'CT Testing report submitted & PDF downloaded.' : 'CT Testing PDF downloaded.', 1500);
  }

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
