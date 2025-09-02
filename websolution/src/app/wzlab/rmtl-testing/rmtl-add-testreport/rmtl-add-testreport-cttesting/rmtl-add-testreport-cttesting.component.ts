import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

// ⬇️ NEW: import the PDF service + types
import { CtReportPdfService, CtHeader, CtPdfRow } from 'src/app/shared/ct-report-pdf.service';

type TDocumentDefinitions = any;

interface DeviceLite {
  id: number;
  serial_number: string;   // CT No.
  make?: string;
  capacity?: string;       // Cap.
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
  action: 'reload' | 'removeRow' | 'clear' | 'submit' | null;
  payload?: any;
}

@Component({
  selector: 'app-rmtl-add-testreport-cttesting',
  templateUrl: './rmtl-add-testreport-cttesting.component.html',
  styleUrls: ['./rmtl-add-testreport-cttesting.component.css']
})
export class RmtlAddTestreportCttestingComponent implements OnInit {

  // ===== Header =====
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

  // ===== Rows + UI =====
  ctRows: CtRow[] = [ this.emptyCtRow() ];
  filterText = '';

  // Modal + submit state
  modal: ModalState = { open: false, title: '', message: '', action: null };
  submitting = false;
  alertSuccess: string | null = null;
  alertError: string | null = null;

  // Optional approver
  approverId: number | null = null;

  // Report type expected by backend
  report_type = 'CT_TESTING';
  test_results: any[] = [];
  office_types: any;
  selectedSourceType: any;
  selectedSourceName: string = '';
  filteredSources: any;
  commentby_testers: any;
  makes: any;
  ct_classes: any;

  // ⬇️ Inject the PDF service
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
      }
    });

    // Prebuild index
    this.reloadAssigned(false);
  }

  // ---------- Source fetch ----------
  fetchButtonData(): void {
    if (!this.selectedSourceType || !this.selectedSourceType) {
      alert('Missing Input');
      return;
    }
    this.api.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
      next: (data) => (this.filteredSources = data, 
        this.header.location_name = this.filteredSources.name,
        this.header.location_code = this.filteredSources.code ) ,
      error: () => alert('Failed to fetch source details. Check the code and try again.')
    });
  }

  onSourceTypeChange(): void {
    this.selectedSourceName = '';
    this.filteredSources = [];
  }

  // ===== Derived counts =====
  get matchedCount(){ return (this.ctRows ?? []).filter(r => !!r.ct_no && !r.notFound).length; }
  get unknownCount(){ return (this.ctRows ?? []).filter(r => !!r.notFound).length; }

  // ===== Row helpers =====
  emptyCtRow(seed?: Partial<CtRow>): CtRow {
    return { ct_no: '', make: '', cap: '', ratio: '', polarity: '', remark: '', ...seed };
  }
  addCtRow(){ this.ctRows.push(this.emptyCtRow()); }
  removeCtRow(i: number){ this.ctRows.splice(i,1); if (!this.ctRows.length) this.addCtRow(); }
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

  reloadAssigned(replaceRows: boolean = true) {
    this.loading = true;
    this.api.getAssignedMeterList(this.device_status, this.currentUserId, this.currentLabId).subscribe({
      next: (data:any) => {
        const asg:AssignmentItem[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        this.rebuildSerialIndex(asg);
        if (replaceRows){
          this.ctRows = asg.map(a=>{
            const d = a.device || ({} as DeviceLite);
            return this.emptyCtRow({
              ct_no: d.serial_number || '',
              make: d.make || '',
              cap: d.capacity || '',
              assignment_id: a.id ?? 0,
              device_id: d.id ?? a.device_id ?? 0,
              notFound:false
            });
          });
          if (!this.ctRows.length) this.ctRows.push(this.emptyCtRow());
          this.header.no_of_ct = this.ctRows.length.toString();
          this.header.ct_make = this.ctRows[0].make || '';
        }
        this.loading = false;
      },
      error: ()=>{ this.loading=false; }
    });
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
  }

  // ===== Submit + modal =====

  private isoOn(dateStr?: string){
    const d = dateStr ? new Date(dateStr+'T10:00:00') : new Date();
    return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString();
  }

  /** Compute test result from remark (OK/PASS -> PASS, DEF/FAIL -> FAIL), otherwise undefined */
  private inferResult(remark: string): 'PASS'|'FAIL'|undefined {
    const t = (remark || '').toLowerCase();
    if (!t) return undefined;
    if (/\bok\b|\bpass\b/.test(t)) return 'PASS';
    if (/\bfail\b|\bdef\b|\bdefective\b/.test(t)) return 'FAIL';
    return undefined;
  }

  /** Build payload; IMPORTANT: stringify `details` to avoid psycopg2 "can't adapt dict" */
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
          // row-specific
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

          // fields not used for CT → set neutral values
          physical_condition_of_device: '-',
          seal_status: '-',
          meter_glass_cover: '-',
          terminal_block: '-',
          meter_body: '-',
          other: r.remark || '-',         // carry remark as "other"
          is_burned: false,
          reading_before_test: 0,
          reading_after_test: 0,
          ref_start_reading: 0,
          ref_end_reading: 0,
          error_percentage: 0,

          // **** KEY FIX: string not dict ****
          details: JSON.stringify(detailsObj),

          test_result: this.inferResult(r.remark), // optional
          test_method: this.testMethod,
          test_status: this.testStatus,
          approver_id: this.approverId ?? null,
          report_type: this.report_type
        };
      });
  }

  openConfirm(action: ModalState['action'], payload?: any){
    if (action !== 'submit') { this.alertSuccess = null; this.alertError = null; }
    this.modal.action = action; this.modal.payload = payload;

    switch(action){
      case 'reload': this.modal.title = 'Reload Assigned Devices'; this.modal.message = 'Replace rows with the latest assigned devices?'; break;
      case 'removeRow': this.modal.title = 'Remove Row'; this.modal.message = `Remove row #${(payload?.index ?? 0)+1}?`; break;
      case 'clear': this.modal.title = 'Clear All Rows'; this.modal.message = 'Clear all rows and leave one empty row?'; break;
      case 'submit': this.modal.title = 'Submit CT Report — Preview'; this.modal.message = ''; break;
      default: this.modal.title=''; this.modal.message='';
    }
    this.modal.open = true;
  }
  closeModal(){ this.modal.open=false; this.modal.action=null; this.modal.payload=undefined; }

  confirmModal(){
    const a = this.modal.action, p = this.modal.payload;
    if (a !== 'submit') this.closeModal();
    if (a === 'reload') this.reloadAssigned(true);
    if (a === 'removeRow') this.removeCtRow(p?.index);
    if (a === 'clear') this.clearCtRows();
    if (a === 'submit') this.doSubmit();
  }

  private doSubmit(){
    const payload = this.buildPayload();
    if (!payload.length){
      this.alertError = 'No valid rows to submit.';
      this.alertSuccess = null;
      return;
    }

    this.submitting = true;
    this.alertSuccess = null;
    this.alertError = null;

    this.api.postTestReports(payload).subscribe({
      next: () => {
        this.submitting = false;
        // ⬇️ PDF only after success, via service
        try { this.downloadPdfNow(); } catch(e){ console.error('PDF generation failed:', e); }
        this.alertSuccess = 'CT Testing report submitted successfully!';
        this.alertError = null;
        this.ctRows = [ this.emptyCtRow() ];
        setTimeout(()=> this.closeModal(), 1200);
      },
      error: (err) => {
        this.submitting = false;
        this.alertSuccess = null;
        this.alertError = 'Error submitting CT report. Please verify rows and try again.';
        console.error(err);
      }
    });
  }

  // ===== PDF via service =====

  /** Map current form header + method/status into service header */
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
      testStatus: this.testStatus
    };
  }

  /** Filter & convert rows into service rows */
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

  /** Public action for toolbar button & submit-success */
  downloadPdfNow(){
    const header = this.toCtHeader();
    const rows = this.toCtRows();
    this.ctPdf.download(header, rows);
  }
}
