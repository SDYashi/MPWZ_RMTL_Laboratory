export interface Lab {
  id?: number;
  lab_name: string;
  lab_location: string;
  status?: 'operational' | 'non_operational';
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface UserPublic {
  id: number;
  username: string;
  name: string;
  email: string;
  designation: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  mobile: string;
  lab_id?: number;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  roles: string[];
}

export interface UserCreate {
  lab_id?: number;
  username: string;
  password: string;
  name: string;
  email: string;
  designation: string;
  status?: 'active' | 'inactive';
  mobile: string;
}

export interface UserUpdate {
  lab_id?: number;
  username?: string;
  password?: string;
  name?: string;
  email?: string;
  last_login_at?: string;
  designation?: string;
  status?: 'active' | 'inactive';
  mobile?: string;
  updated_by?: number;
}

export interface UserRoleLink {
  id?: number;
  user_id: number;
  role: 'Admin' | 'Executive' | 'oic' | 'TA' | 'store manager';
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface Device {
  office_type: undefined;
  location_name: any;
  _date: any;
  device_status: string;
  created_at: any;
  inward_date: string | null;
  user: any;
  assigned_to: number;
  status: string;
  inward_no: string;
  id?: number;
  inward_number: string;
  device_type: 'meter' | 'ct';
  serial_number: string;
  make: string;
  capacity?: string;
  date_of_entry: string; // YYYY-MM-DD
  phase?: string;
  manufacturing_month_year?: string;
  lab_id?: number;
  consumer_no?: string;
  zone?: string;
  location_code?: string;
  consumer_name?: string;
  initiator?: 'cis' | 'bis';
  transaction_type?: string;
  transaction_amount?: number;
  transaction_number?: string;
  transaction_datetime?: string; // ISO 8601 string
  payment_remarks?: string;
  meter_category?: string;
  meter_type?: string;
  remark?: string;
  box_number?: string;
  assignment_status?: 'open' | 'complete' | 'cancelled';
  warranty_period?: string;
  connection_type?: 'HT' | 'LT';
  voltage_rating?: string;
  current_rating?: string;
  class?: string; // Note: 'class' is a reserved keyword in TS, use 'class' for JSON, but access as device['class']
  ct_ratio?: string;
  standard?: string;
  communication_protocol?: string;
  testing_for?: string;
}

export interface TestingBench {
  id?: number;
  bench_name: string;
  type: 'NABL' | 'Non NABL';
  status?: 'working' | 'non working';
  operation_type: 'Manual' | 'Auto';
  phase: '1p' | '3p' | 'all';
  last_calibration_date?: string; // YYYY-MM-DD
  next_calibration_due?: string; // YYYY-MM-DD
  lab_id: number;
  maintenance_status?: 'Scheduled' | 'Completed' | 'Overdue';
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface Vendor {
  id?: number;
  name: string;
  project_no?: string;
  contact_person?: string;
  contact_no?: string;
  email?: string;
  address?: string;
}

export interface Store {
  id?: number;
  code: string;
  name: string;
  division_code: number;
  division_name: string;
  circle_code: number;
  circle_name: string;
  region_code: number;
  region_name: string;
  org_code: number;
  org_name: string;
}

export interface Assignment {
  all_devices: any;
  device_ids: number[];
  assigned_to: string;
  device_status: string;
  id?: number;
  inward_no: string;
  devices?: Device[];
  device_id: number;
  user_id: number;
  bench_id?: number;
  assignment_type?: string;
  assigned_by: number;
  assigned_datetime?: string; // ISO 8601 string
  assignment_status?: 'open' | 'complete' | 'cancelled';
  device_statusts?: string[];
  status?: string;
  assigned_devices?: string[];
}

export interface Testing {
  id?: number;
  device_id: number;
  assignment_id?: number;
  start_datetime?: string; // ISO 8601 string
  end_datetime?: string; // ISO 8601 string
  physical_condition_of_device?: string;
  seal_status?: string;
  meter_glass_cover?: string;
  terminal_block?: string;
  meter_body?: string;
  other?: string;
  is_burned?: boolean;
  reading_before_test?: number;
  reading_after_test?: number;
  details?: string;
  test_result?: 'Pass' | 'Fail';
  test_method?: 'manual' | 'automatic';
  ref_start_reading?: number;
  ref_end_reading?: number;
  test_status?: 'Pending' | 'Tested' | 'Failed' | 'Passed';
  error_percentage?: number;
  approver_id?: number;
}

export interface GatePass {
  id?: number;
  dispatch_number: string;
  dispatch_to: string;
  receiver_name: string;
  receiver_designation?: string;
  receiver_mobile?: string;
  vehicle?: string;
  created_at?: string;
  created_by?: number;
  updated_at?: string;
  updated_by?: number;
  serial_numbers: string[];
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface TestReportPayload {
  device_id: number;
  assignment_id: number;
  start_datetime: string;   // ISO
  end_datetime: string;     // ISO
  physical_condition_of_device: string;
  seal_status: string;
  meter_glass_cover: string;
  terminal_block: string;
  meter_body: string;
  other: string;
  is_burned: boolean;
  reading_before_test: number;
  reading_after_test: number;
  details: string;
  test_result: 'PASS' | 'FAIL';
  test_method: 'MANUAL' | 'AUTOMATED';
  ref_start_reading: number;
  ref_end_reading: number;
  test_status: 'COMPLETED' | 'PENDING';
  error_percentage: number;
  approver_id: number;
}
export type Working = 'OK' | 'FAST' | 'SLOW' | 'NOT WORKING';
export type TestStatus = 'COMPLETED' | 'PENDING';
export type TestMethod = string;     // use enum strings from getEnums()
export type TestReportType = string; // e.g. 'CT_TESTING'
export interface CtTestReportPayload {
  device_id: number;
  assignment_id: number;
  start_datetime: string;
  end_datetime: string;
  report_type: TestReportType;
  test_result: Working;
  test_method: TestMethod;
  test_status: TestStatus;
  lab_id?: number | null;
  testshifts?: string | null;
  consumer_name?: string | null;
  consumer_address?: string | null;
  testing_fees?: string | null;
  fees_mr_no?: string | null;
  fees_mr_date?: string | null; // 'YYYY-MM-DD' string
  ref_no?: string | null;
  ct_class?: string | null;
  ct_primary_current?: number | null;
  ct_secondary_current?: number | null;
  ct_ratio?: number | null;
  ct_polarity?: string | null;
  final_remarks?: string | null;
  test_requester_name?: string | null;
  approver_id?: number | null;
  approver_remark?: string | null;
  details?: string | null; 
  created_by?: string | null;
}

export interface DashboardCounts {
  labs: number;
  users: number;
  benches: number;
  stores: number;
  vendors: number;
  offices: number;
  gatepasses: number;
  assignments: number;
  testings: number;
  inwards: number;
  dispatcheds: number;
  approved_statuses: number;
  pending_approvals: number;
}

export interface TestingStatusAgg {
  status: string;
  total: number;
  test_status: TestingStatusAgg;
}


export interface OfficeReport {
  id: number;
  code: string;
  name: string;

  org_code: string | null;
  org_name: string | null;

  region_code: string | null;
  region_name: string | null;

  circle_code: string | null;
  circle_name: string | null;

  division_code: string | null;
  division_name: string | null;

  created_at: string;
  created_by: number;
  updated_at: string;
  updated_by: number;
}

export interface BarChartItem {
  device_type: string;
  count: number;
}

export interface TestingBarChartItem {
  device_type: string;
  total: number;
  completed: number;
}

export interface AssignmentBarItem {
  device_type: string;
  total: number;
  count: number; // filtered count, e.g. APPROVED / ASSIGNED etc.
}

export interface AssignmentPercentageItem {
  device_type: string;
  total: number;
  assigned: number;
  percentage: string; // "85.00%"
}

export interface LineChartItem {
  date: string; // ISO date string
  count: number;
}

export interface TestingDashboardData {
  total_devices: number;
  assigned_devices: number;
  completed_devices: number;
  inwarded_devices: number;
  dispatched_devices: number;
  approved_devices: number;
}

export interface AssignmentDashboardData {
  total_devices: number;
  assigned_devices: number;
  approved_devices: number;
  completed_devices: number;
  inward_devices: number;
  dispatched_devices: number;
  inwarded_devices : number;
}

export interface DailySummaryRow {
  meter_type: string;

  shift_1: { single: number; three: number };
  shift_2: { single: number; three: number };
  shift_3: { single: number; three: number };

  today_progress: { single: number; three: number };

  progressive_month: { single: number; three: number };
  month_ok: { single: number; three: number };
  month_defective: { single: number; three: number };

  meter_received_at_lab: { single: number; three: number };
  meter_issued_from_lab: { single: number; three: number };
  balance_meter_for_testing_at_lab: { single: number; three: number };
}

export interface DailySummaryResponse {
  filters: { report_date?: string; from_date: string; to_date: string; lab_id?: number | null };
  generated_at: string;
  month_start: string;
  no_working_shift: number;
  rows: DailySummaryRow[];
  total: {
    shift_1: { single: number; three: number };
    shift_2: { single: number; three: number };
    shift_3: { single: number; three: number };
    today_progress: { single: number; three: number };
    progressive_month: { single: number; three: number };
    month_ok: { single: number; three: number };
    month_defective: { single: number; three: number };
    meter_received_at_lab: { single: number; three: number };
    meter_issued_from_lab: { single: number; three: number };
    balance_meter_for_testing_at_lab: { single: number; three: number };
  };
}

export interface MonthlySummaryRow {
  circle_id: number | null;
  division_id: number | null;
  dc_id: number | null;
  installed_smart: number;
  received_non_smart: number;
  tested: number;
  not_tested: number;
}

export interface MonthlySummaryResponse {
  filters: {
    from_date?: string | null;
    to_date?: string | null;
    circle_id?: number | null;
    division_id?: number | null;
    dc_id?: number | null;
    group_level: 'circle' | 'division' | 'dc';
  };
  generated_at: string;
  rows: MonthlySummaryRow[];
  totals: { installed_smart: number; received_non_smart: number; tested: number; not_tested: number };
}

