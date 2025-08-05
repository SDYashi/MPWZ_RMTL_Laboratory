import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';
import { Lab, UserPublic, UserCreate, UserUpdate, UserRoleLink, Device, TestingBench, Vendor, Assignment, Testing, GatePass } from '../interface/models';
@Injectable({
  providedIn: 'root'
})
export class ApiServicesService {

constructor( private  http: HttpClient) {} 
private baseUrl = environment.apiUrl;

getlogin(username: string, password: string): Observable<any> {
  const body = new HttpParams()
    .set('username', username)
    .set('password', password);

  const headers = new HttpHeaders({
    'Content-Type': 'application/x-www-form-urlencoded'
  });

  return this.http.post<any>(`${this.baseUrl}/token`, body.toString(), { headers });
}
  // Generic method to make authenticated requests
getallUsers(): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}/users/`);
}

// --- Lab Endpoints ---
getLabs(): Observable<Lab[]> {
  return this.http.get<Lab[]>(`${this.baseUrl}/labs/`);
}

getLab(id: number): Observable<Lab> {
  return this.http.get<Lab>(`${this.baseUrl}/labs/${id}`);
}
getlabstatus(): Observable<Lab[]> {
  return this.http.get<Lab[]>(`${this.baseUrl}/labs/`);
}

createLab(lab: Lab): Observable<Lab> {
  return this.http.post<Lab>(`${this.baseUrl}/labs/`, lab);
}

updateLab(lab_id: number, lab: Lab): Observable<Lab> {
  return this.http.put<Lab>(`${this.baseUrl}/labs/${lab_id}`, lab);
}

deleteLab(id: number): Observable<any> {
  return this.http.delete(`${this.baseUrl}/labs/${id}`);
}

// --- User Endpoints ---
getUsers(): Observable<UserPublic[]> {
  return this.http.get<UserPublic[]>(`${this.baseUrl}/users`);
}

getUser(id: number): Observable<UserPublic> {
  return this.http.get<UserPublic>(`${this.baseUrl}/users/${id}`);
}

createUser(user: UserCreate): Observable<UserPublic> {
  return this.http.post<UserPublic>(`${this.baseUrl}/users/`, user);
}

updateUser(id: number, user: UserUpdate): Observable<UserPublic> {
  return this.http.put<UserPublic>(`${this.baseUrl}/users/${id}`, user);
}

deleteUser(id: number): Observable<any> {
  return this.http.delete(`${this.baseUrl}/users/${id}`);
}

// --- User Role Endpoints ---
getUserRoles(): Observable<UserRoleLink[]> {
  return this.http.get<UserRoleLink[]>(`${this.baseUrl}/user-roles`);
}

getUserRole(id: number): Observable<UserRoleLink> {
  return this.http.get<UserRoleLink>(`${this.baseUrl}/user-roles/${id}`);
}

createUserRole(userRole: UserRoleLink): Observable<UserRoleLink> {
  return this.http.post<UserRoleLink>(`${this.baseUrl}/user-roles`, userRole);
}

updateUserRole(id: number, userRole: UserRoleLink): Observable<UserRoleLink> {
  return this.http.put<UserRoleLink>(`${this.baseUrl}/user-roles/${id}`, userRole);
}

deleteUserRole(id: number): Observable<any> {
  return this.http.delete(`${this.baseUrl}/user-roles/${id}`);
}

// --- Device Endpoints ---
getDevices(): Observable<Device[]> {
  return this.http.get<Device[]>(`${this.baseUrl}/devices`);
}

getDevice(id: number): Observable<Device> {
  return this.http.get<Device>(`${this.baseUrl}/devices/${id}`);
}

createDevice(device: Device): Observable<Device> {
  return this.http.post<Device>(`${this.baseUrl}/devices`, device);
}

updateDevice(id: number, device: Device): Observable<Device> {
  return this.http.put<Device>(`${this.baseUrl}/devices/${id}`, device);
}

deleteDevice(id: number): Observable<any> {
  return this.http.delete(`${this.baseUrl}/devices/${id}`);
}

// --- Testing Bench Endpoints ---
getTestingBenches(): Observable<TestingBench[]> {
  return this.http.get<TestingBench[]>(`${this.baseUrl}/testing-benches`);
}

getTestingBench(id: number): Observable<TestingBench> {
  return this.http.get<TestingBench>(`${this.baseUrl}/testing-benches/${id}`);
}

createTestingBench(testingBench: TestingBench): Observable<TestingBench> {
  return this.http.post<TestingBench>(`${this.baseUrl}/testing-benches`, testingBench);
}

updateTestingBench(id: number, testingBench: TestingBench): Observable<TestingBench> {
  return this.http.put<TestingBench>(`${this.baseUrl}/testing-benches/${id}`, testingBench);
}

deleteTestingBench(id: number): Observable<any> {
  return this.http.delete(`${this.baseUrl}/testing-benches/${id}`);
}

// --- Vendor Endpoints ---
getVendors(): Observable<Vendor[]> {
  return this.http.get<Vendor[]>(`${this.baseUrl}/vendors`);
}

getVendor(id: number): Observable<Vendor> {
  return this.http.get<Vendor>(`${this.baseUrl}/vendors/${id}`);
}

createVendor(vendor: Vendor): Observable<Vendor> {
  return this.http.post<Vendor>(`${this.baseUrl}/vendors`, vendor);
}

updateVendor(id: number, vendor: Vendor): Observable<Vendor> {
  return this.http.put<Vendor>(`${this.baseUrl}/vendors/${id}`, vendor);
}

deleteVendor(id: number): Observable<any> {
  return this.http.delete(`${this.baseUrl}/vendors/${id}`);
}

// --- Store Endpoints ---
getStores(): Observable<Store[]> {
  return this.http.get<Store[]>(`${this.baseUrl}/stores`);
}

getStore(id: number): Observable<Store> {
  return this.http.get<Store>(`${this.baseUrl}/stores/${id}`);
}

createStore(store: Store): Observable<Store> {
  return this.http.post<Store>(`${this.baseUrl}/stores`, store);
}

updateStore(id: number, store: Store): Observable<Store> {
  return this.http.put<Store>(`${this.baseUrl}/stores/${id}`, store);
}

deleteStore(id: number): Observable<any> {
  return this.http.delete(`${this.baseUrl}/stores/${id}`);
}

// --- Assignment Endpoints ---
getAssignments(): Observable<Assignment[]> {
  return this.http.get<Assignment[]>(`${this.baseUrl}/assignments`);
}

getAssignment(id: number): Observable<Assignment> {
  return this.http.get<Assignment>(`${this.baseUrl}/assignments/${id}`);
}

createAssignment(assignment: Assignment): Observable<Assignment> {
  return this.http.post<Assignment>(`${this.baseUrl}/assignments`, assignment);
}

updateAssignment(id: number, assignment: Assignment): Observable<Assignment> {
  return this.http.put<Assignment>(`${this.baseUrl}/assignments/${id}`, assignment);
}

deleteAssignment(id: number): Observable<any> {
  return this.http.delete(`${this.baseUrl}/assignments/${id}`);
}

// --- Testing Endpoints ---
getTestingRecords(): Observable<Testing[]> {
  return this.http.get<Testing[]>(`${this.baseUrl}/testing`);
}

getTesting(id: number): Observable<Testing> {
  return this.http.get<Testing>(`${this.baseUrl}/testing/${id}`);
}

createTesting(testing: Testing): Observable<Testing> {
  return this.http.post<Testing>(`${this.baseUrl}/testing`, testing);
}

updateTesting(id: number, testing: Testing): Observable<Testing> {
  return this.http.put<Testing>(`${this.baseUrl}/testing/${id}`, testing);
}

deleteTesting(id: number): Observable<any> {
  return this.http.delete(`${this.baseUrl}/testing/${id}`);
}

// --- GatePass Endpoints ---
getGatePasses(): Observable<GatePass[]> {
  return this.http.get<GatePass[]>(`${this.baseUrl}/gatepasses`);
}

getGatePass(id: number): Observable<GatePass> {
  return this.http.get<GatePass>(`${this.baseUrl}/gatepasses/${id}`);
}

createGatePass(gatepass: GatePass): Observable<GatePass> {
  return this.http.post<GatePass>(`${this.baseUrl}/gatepasses`, gatepass);
}

updateGatePass(id: number, gatepass: GatePass): Observable<GatePass> {
  return this.http.put<GatePass>(`${this.baseUrl}/gatepasses/${id}`, gatepass);
}

deleteGatePass(id: number): Observable<any> {
  return this.http.delete(`${this.baseUrl}/gatepasses/${id}`);
}
// --- Enums Endpoints ---
getEnums(): Observable<any> {
  return this.http.get(`${this.baseUrl}/enums/all`);
}

}
