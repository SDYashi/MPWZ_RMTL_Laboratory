import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { P4VigReportPdfService, VigHeader, VigRow } from 'src/app/shared/p4vig-report-pdf.service';

interface MeterDevice {
  id: number;
  serial_number: string;
  make?: string;
  capacity?: string;
  location_code?: string | null;
  location_name?: string | null;
  phase?: any;
}
interface AssignmentItem { id: number; device_id: number; device?: MeterDevice | null; }

interface Row {
  serial: string;
  make: string;
  capacity: string;

  removal_reading?: number;
  test_result?: string;
  consumer_name?: string;
  address?: string;
  account_number?: string;
  division_zone?: string;

  panchanama_no?: string;
  panchanama_date?: string;
  condition_at_removal?: string;

  testing_date?: string;

  is_burned: boolean;
  seal_status: string;
  meter_glass_cover: string;
  terminal_block: string;
  meter_body: string;
  other: string;

  reading_before_test?: number;
  reading_after_test?: number;
  rsm_kwh?: number;
  meter_kwh?: number;
  error_percentage?: number;
  starting_current_test?: string;
  creep_test?: string;
  remark?: string;

  assignment_id?: number;
  device_id?: number;
  notFound?: boolean;
  _open?: boolean;
}

@Component({
  selector: 'app-rmtl-add-testreport-p4vig',
  templateUrl: './rmtl-add-testreport-p4vig.component.html',
  styleUrls: ['./rmtl-add-testreport-p4vig.component.css']
})
export class RmtlAddTestreportP4vigComponent implements OnInit {

  // ===== batch header (like P4_ONM) =====
  header = {
    location_code: '',
    location_name: '',
    testing_bench: '-',
    testing_user: '-',
    approving_user: '-',
    phase: ''
  };

  // enums
  test_methods: any[] = [];
  test_statuses: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;

  seal_statuses: any[] = [];
  glass_covers: any[] = [];
  terminal_blocks: any[] = [];
  meter_bodies: any[] = [];
  office_types: any;
  testResults: any;
  commentby_testers: any;

  // assignment context
  device_status: 'ASSIGNED' = 'ASSIGNED';
  currentUserId = 0;
  currentLabId  = 0;

  report_type: any;
  device_testing_purpose: any;
  device_type: any;

  private serialIndex: Record<string, {
    phase: string; make?: string; capacity?: string; device_id: number; assignment_id: number;
  }> = {};

  loading = false;

  // lab info (used for PDF header)
  labInfo: any = null;

  // table
  filterText = '';
  rows: Row[] = [ this.emptyRow() ];

  // device picker (sorted + searchable)
  devicePicker = {
    open: false,
    items: [] as AssignmentItem[],
    selected: new Set<number>(),
    loading: false,
    selectAll: false,
    query: ''   // 🔍 search by serial/make/capacity
  };

  // alert modal
  alert = {
    open: false,
    type: 'info' as 'success'|'error'|'warning'|'info',
    title: '',
    message: ''
  };

  // keep payload for debugging if needed
  payload: any;

  constructor(
    private api: ApiServicesService,
    private pdfSvc: P4VigReportPdfService
  ) {}

  ngOnInit(): void {
    this.device_type = 'METER';
    this.device_testing_purpose = 'VIGILENCE_CHECKING';
    this.currentUserId = Number(localStorage.getItem('currentUserId') || 0);
    this.currentLabId  = Number(localStorage.getItem('currentLabId') || 0);

    const currentUserName = localStorage.getItem('currentUserName') || '';
    if (currentUserName) this.header.testing_user = currentUserName;

    // enums
    this.api.getEnums().subscribe({
      next: (d) => {
        this.test_methods     = d?.test_methods || [];
        this.test_statuses    = d?.test_statuses || [];
        this.seal_statuses    = d?.seal_statuses || [];
        this.glass_covers     = d?.glass_covers || [];
        this.terminal_blocks  = d?.terminal_blocks || [];
        this.meter_bodies     = d?.meter_bodies || [];
        this.office_types     = d?.office_types || [];
        this.testResults      = d?.test_results || [];
        this.commentby_testers= d?.commentby_testers || [];

        // purpose/type with robust fallbacks (prevents nulls)
        this.report_type = d?.test_report_types?.VIGILENCE_CHECKING
                        ?? d?.test_report_types?.VIGILANCE_CHECKING
                        ?? 'VIGILENCE_CHECKING';

        this.device_testing_purpose = this.report_type;
        this.device_type = d?.device_types?.METER ?? 'METER';
      }
    });

    // lab
    if (this.currentLabId) {
      this.api.getLabInfo(this.currentLabId).subscribe({ next: (info: any) => this.labInfo = info });
    }

    // warm index
    this.loadAssignedIndexOnly();
  }

  // ===== validation guards =====
  private validateContext(): { ok: boolean; reason?: string } {
    if (!this.currentUserId)                return { ok:false, reason:'Missing user_id — sign in again.' };
    if (!this.currentLabId)                 return { ok:false, reason:'Missing lab_id — select a lab.' };
    if (!this.device_type)                  return { ok:false, reason:'Missing device_type — refresh enums.' };
    if (!this.device_testing_purpose)       return { ok:false, reason:'Missing device_testing_purpose — refresh enums.' };
    return { ok:true };
  }

  private validate(): { ok: boolean; reason?: string } {
    const ctx = this.validateContext();
    if (!ctx.ok) return ctx;

    if (!this.testMethod || !this.testStatus) {
      return { ok:false, reason:'Select Test Method and Test Status.' };
    }

    const validRows = (this.rows || []).filter(r => (r.serial || '').trim());
    if (!validRows.length) {
      return { ok:false, reason:'Add at least one row with meter serial.' };
    }

    // keep header display fields not-null (like P4_ONM)
    this.header.testing_bench  = (this.header.testing_bench  || '').trim() || '-';
    this.header.testing_user   = (this.header.testing_user   || '').trim() || '-';
    this.header.approving_user = (this.header.approving_user || '').trim() || '-';

    return { ok:true };
  }

  // ===== serial lookup =====
  onSerialChanged(i: number, serial: string){
    const key = (serial || '').toUpperCase().trim();
    const row = this.rows[i];
    const hit = this.serialIndex[key];

    if (hit){
      row.make = hit.make || '';
      row.capacity = hit.capacity || '';
      row.device_id = hit.device_id || 0;
      row.assignment_id = hit.assignment_id || 0;
      row.notFound = false;

      if (!this.header.phase && hit?.phase){
        this.header.phase = (hit.phase || '').toString().toUpperCase();
      }
    } else {
      row.make = '';
      row.capacity = '';
      row.device_id = 0;
      row.assignment_id = 0;
      row.notFound = key.length > 0;
    }
  }

  // ===== helpers =====
  private emptyRow(seed?: Partial<Row>): Row {
    return {
      serial: '',
      make: '',
      capacity: '',
      is_burned: false,
      seal_status: '',
      meter_glass_cover: '',
      terminal_block: '',
      meter_body: '',
      other: '',
      _open: false,
      ...seed
    };
  }

  get matchedCount(){ return (this.rows || []).filter(r => !!r.serial && !r.notFound).length; }
  get unknownCount(){ return (this.rows || []).filter(r => !!r.notFound).length; }

  displayRows(): Row[] {
    const q = (this.filterText || '').toLowerCase().trim();
    if (!q) return this.rows;
    return this.rows.filter(r =>
      (r.serial||'').toLowerCase().includes(q) ||
      (r.make||'').toLowerCase().includes(q)   ||
      (r.capacity||'').toLowerCase().includes(q)
    );
  }

  // ===== assignment index only =====
  private loadAssignedIndexOnly() {
    const v = this.validateContext();
    if (!v.ok){ this.openAlert('warning','Context Error',v.reason!); return; }

    this.loading = true;

    // ARG ORDER FIXED: (status, userId, labId, testing_purpose, device_type)
    this.api.getAssignedMeterList(
      this.device_status,
      this.currentUserId,
      this.currentLabId,
      this.device_testing_purpose,
      this.device_type
    ).subscribe({
      next:(d:any)=>{
        const asg:AssignmentItem[] = Array.isArray(d) ? d : (Array.isArray(d?.results) ? d.results : []);
        this.serialIndex = {};
        asg.forEach(a=>{
          const s=(a.device?.serial_number||'').toUpperCase().trim();
          if(!s) return;
          this.serialIndex[s] = {
            make:a.device?.make||'',
            capacity:a.device?.capacity||'',
            device_id:a.device?.id||a.device_id,
            assignment_id:a.id,
            phase:a.device?.phase||''
          };
        });

        this.loading=false;
        this.openAlert('info','Assignments loaded', `${asg.length} device(s) indexed.`);
      },
      error:()=>{ this.loading=false; this.openAlert('error','Load Failed','Could not load assignments.'); }
    });
  }

  // ===== device picker =====
  openDevicePicker(){
    const v = this.validateContext();
    if (!v.ok){ this.openAlert('warning','Context Error',v.reason!); return; }

    this.devicePicker.loading=true;
    this.api.getAssignedMeterList(
      this.device_status,
      this.currentUserId,
      this.currentLabId,
      this.device_testing_purpose,
      this.device_type
    ).subscribe({
      next:(d:any)=>{
        let asg:AssignmentItem[] = Array.isArray(d)? d : (Array.isArray(d?.results) ? d.results : []);
        // sort by make → serial
        asg = asg.sort((a,b)=>{
          const ma=(a.device?.make||'').toLowerCase(), mb=(b.device?.make||'').toLowerCase();
          if (ma!==mb) return ma.localeCompare(mb);
          return (a.device?.serial_number||'').localeCompare(b.device?.serial_number||'');
        });

        this.devicePicker.items = asg;
        this.devicePicker.open  = true;
        this.devicePicker.loading=false;
        this.devicePicker.query = '';
        this.devicePicker.selected.clear();
        this.devicePicker.selectAll = false;
      },
      error:()=>{ this.devicePicker.loading=false; this.openAlert('error','Load Failed','Could not open device picker.'); }
    });
  }

  get pickerFiltered(): AssignmentItem[]{
    const q=(this.devicePicker.query||'').toLowerCase().trim();
    if(!q) return this.devicePicker.items;
    return this.devicePicker.items.filter(a=>{
      const d = a.device;
      return (d?.serial_number||'').toLowerCase().includes(q)
          || (d?.make||'').toLowerCase().includes(q)
          || (d?.capacity||'').toLowerCase().includes(q);
    });
  }

  toggleSelectOne(id:number){
    this.devicePicker.selected.has(id)
      ? this.devicePicker.selected.delete(id)
      : this.devicePicker.selected.add(id);
  }

  toggleSelectAll(){
    this.devicePicker.selectAll = !this.devicePicker.selectAll;
    this.devicePicker.selected.clear();
    if (this.devicePicker.selectAll){
      this.pickerFiltered.forEach(a => this.devicePicker.selected.add(a.id));
    }
  }

  addSelectedDevices(){
    if (!this.devicePicker.selected.size){
      this.openAlert('warning','No selection','Select at least one device.');
      return;
    }

    const added: Row[] = [];
    this.devicePicker.selected.forEach(id=>{
      const a=this.devicePicker.items.find(x=>x.id===id);
      if(!a || !a.device) return;

      const already = this.rows.some(r => (r.serial||'').toUpperCase() === (a.device!.serial_number||'').toUpperCase());
      if (already) return;

      added.push(
        this.emptyRow({
          serial: a.device.serial_number,
          make: a.device.make || '',
          capacity: a.device.capacity || '',
          assignment_id: a.id,
          device_id: a.device.id,
          _open: true
        })
      );
    });

    if (added.length) {
      this.rows.push(...added);
      this.openAlert('success','Devices added', `${added.length} device(s) added to table.`);
    } else {
      this.openAlert('info','Nothing added','Selected devices were already in the table.');
    }

    this.devicePicker.open=false;
  }

  // ===== submit =====
  async doSubmit(){
    const v = this.validate();
    if (!v.ok){ this.openAlert('warning','Validation Error', v.reason!); return; }

    // Build minimal payload required by your API (keep parity with “P4_ONM like”)
    this.payload = (this.rows || [])
      .filter(r => (r.serial || '').trim())
      .map(r => ({
        device_id: r.device_id || 0,
        assignment_id: r.assignment_id || 0,

        // dates: if testing_date present pass-through, else omit/null (server may set default)
        testing_date: r.testing_date || null,

        // basic physical/inspection fields
        is_burned: !!r.is_burned,
        seal_status: r.seal_status || null,
        meter_glass_cover: r.meter_glass_cover || null,
        terminal_block: r.terminal_block || null,
        meter_body: r.meter_body || null,
        other: r.other || null,

        // readings & tests (optional on this screen)
        reading_before_test: r.reading_before_test ?? null,
        reading_after_test:  r.reading_after_test ?? null,
        rsm_kwh: r.rsm_kwh ?? null,
        meter_kwh: r.meter_kwh ?? null,
        error_percentage: r.error_percentage ?? null,
        starting_current_test: r.starting_current_test || null,
        creep_test: r.creep_test || null,

        // result & comments
        test_result: r.test_result || null,
        remark: r.remark || null,

        // meta
        test_method: this.testMethod,
        test_status: this.testStatus,
        report_type: this.report_type,
        created_by: String(this.currentUserId || '')
      }));

    if (!this.payload.length){
      this.openAlert('warning','No Data','Add at least one valid row.');
      return;
    }

    this.loading = true;

    this.api.postTestReports(this.payload).subscribe({
      next: async () => {
        this.loading = false;

        // Build PDF header aligned with P4_ONM styling
        const header: VigHeader = {
          location_code: this.header.location_code || '',
          location_name: this.header.location_name || '',
          testMethod: this.testMethod || '-',
          testStatus: this.testStatus || '-',
          date: new Date().toISOString().slice(0,10),
          testing_bench: this.header.testing_bench || '-',
          testing_user: this.header.testing_user || '-',
          approving_user: this.header.approving_user || '-',
          phase: (this.header.phase || '').toString().toUpperCase() || '-',
          lab_name: this.labInfo?.lab_pdfheader_name || this.labInfo?.lab_name || null,
          lab_address: this.labInfo?.address || this.labInfo?.address_line || null,
          lab_email: this.labInfo?.email || null,
          lab_phone: this.labInfo?.phone || null
        };

        const rows: any[] = (this.rows || []).filter(r => (r.serial||'').trim()).map(r => ({
          serial: r.serial,
          make: r.make,
          capacity: r.capacity,
          test_result: r.test_result || null,
          remark: r.remark || null
        }));

        this.openAlert('success','Submitted','Batch saved successfully.');

        try {
          await this.pdfSvc.download(header, rows, `P4_VIG_${header.date}.pdf`);
          this.openAlert('success','PDF downloaded','Vigilance report PDF has been downloaded.');
        } catch {
          this.openAlert('warning','PDF error','Saved, but PDF could not be generated.');
        }

        // reset form
        this.rows = [ this.emptyRow() ];
      },
      error: () => {
        this.loading = false;
        this.openAlert('error','Submit Failed','Could not submit test reports.');
      }
    });
  }

  // ===== alert helpers =====
  openAlert(type:'success'|'error'|'warning'|'info', title:string, message:string){
    this.alert = { open:true, type, title, message };
  }
  closeAlert(){ this.alert.open=false; }
}
