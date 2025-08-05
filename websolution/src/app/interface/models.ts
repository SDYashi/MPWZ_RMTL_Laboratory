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
  name: string;
  location: string;
}

export interface Assignment {
  id?: number;
  device_id: number;
  user_id: number;
  bench_id?: number;
  assignment_type?: string;
  assigned_by: number;
  assigned_datetime?: string; // ISO 8601 string
  assignment_status?: 'open' | 'complete' | 'cancelled';
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