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
private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }
getallUsers(): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}/users/`);
}


// --- Lab Endpoints ---
  getLabs(): Observable<Lab[]> {
    return this.http.get<Lab[]>(`${this.baseUrl}/labs`, { headers: this.getHeaders() });
  }

  getLab(id: number): Observable<Lab> {
    return this.http.get<Lab>(`${this.baseUrl}/labs/${id}`, { headers: this.getHeaders() });
  }

  createLab(lab: Lab): Observable<Lab> {
    return this.http.post<Lab>(`${this.baseUrl}/labs`, lab, { headers: this.getHeaders() });
  }

  updateLab(id: number, lab: Lab): Observable<Lab> {
    return this.http.put<Lab>(`${this.baseUrl}/labs/${id}`, lab, { headers: this.getHeaders() });
  }

  deleteLab(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/labs/${id}`, { headers: this.getHeaders() });
  }

  // --- User Endpoints ---
  getUsers(): Observable<UserPublic[]> {
    return this.http.get<UserPublic[]>(`${this.baseUrl}/users`, { headers: this.getHeaders() });
  }

  getUser(id: number): Observable<UserPublic> {
    return this.http.get<UserPublic>(`${this.baseUrl}/users/${id}`, { headers: this.getHeaders() });
  }

  createUser(user: UserCreate): Observable<UserPublic> {
    return this.http.post<UserPublic>(`${this.baseUrl}/users`, user, { headers: this.getHeaders() });
  }

  updateUser(id: number, user: UserUpdate): Observable<UserPublic> {
    return this.http.put<UserPublic>(`${this.baseUrl}/users/${id}`, user, { headers: this.getHeaders() });
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/users/${id}`, { headers: this.getHeaders() });
  }

  // --- User Role Endpoints ---
  getUserRoles(): Observable<UserRoleLink[]> {
    return this.http.get<UserRoleLink[]>(`${this.baseUrl}/user-roles`, { headers: this.getHeaders() });
  }

  getUserRole(id: number): Observable<UserRoleLink> {
    return this.http.get<UserRoleLink>(`${this.baseUrl}/user-roles/${id}`, { headers: this.getHeaders() });
  }

  createUserRole(userRole: UserRoleLink): Observable<UserRoleLink> {
    return this.http.post<UserRoleLink>(`${this.baseUrl}/user-roles`, userRole, { headers: this.getHeaders() });
  }

  updateUserRole(id: number, userRole: UserRoleLink): Observable<UserRoleLink> {
    return this.http.put<UserRoleLink>(`${this.baseUrl}/user-roles/${id}`, userRole, { headers: this.getHeaders() });
  }

  deleteUserRole(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/user-roles/${id}`, { headers: this.getHeaders() });
  }

  // --- Device Endpoints ---
  getDevices(): Observable<Device[]> {
    return this.http.get<Device[]>(`${this.baseUrl}/devices`, { headers: this.getHeaders() });
  }

  getDevice(id: number): Observable<Device> {
    return this.http.get<Device>(`${this.baseUrl}/devices/${id}`, { headers: this.getHeaders() });
  }

  createDevice(device: Device): Observable<Device> {
    return this.http.post<Device>(`${this.baseUrl}/devices`, device, { headers: this.getHeaders() });
  }

  updateDevice(id: number, device: Device): Observable<Device> {
    return this.http.put<Device>(`${this.baseUrl}/devices/${id}`, device, { headers: this.getHeaders() });
  }

  deleteDevice(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/devices/${id}`, { headers: this.getHeaders() });
  }

  // --- Testing Bench Endpoints ---
  getTestingBenches(): Observable<TestingBench[]> {
    return this.http.get<TestingBench[]>(`${this.baseUrl}/testing-benches`, { headers: this.getHeaders() });
  }

  getTestingBench(id: number): Observable<TestingBench> {
    return this.http.get<TestingBench>(`${this.baseUrl}/testing-benches/${id}`, { headers: this.getHeaders() });
  }

  createTestingBench(testingBench: TestingBench): Observable<TestingBench> {
    return this.http.post<TestingBench>(`${this.baseUrl}/testing-benches`, testingBench, { headers: this.getHeaders() });
  }

  updateTestingBench(id: number, testingBench: TestingBench): Observable<TestingBench> {
    return this.http.put<TestingBench>(`${this.baseUrl}/testing-benches/${id}`, testingBench, { headers: this.getHeaders() });
  }

  deleteTestingBench(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/testing-benches/${id}`, { headers: this.getHeaders() });
  }

  // --- Vendor Endpoints ---
  getVendors(): Observable<Vendor[]> {
    return this.http.get<Vendor[]>(`${this.baseUrl}/vendors`, { headers: this.getHeaders() });
  }

  getVendor(id: number): Observable<Vendor> {
    return this.http.get<Vendor>(`${this.baseUrl}/vendors/${id}`, { headers: this.getHeaders() });
  }

  createVendor(vendor: Vendor): Observable<Vendor> {
    return this.http.post<Vendor>(`${this.baseUrl}/vendors`, vendor, { headers: this.getHeaders() });
  }

  updateVendor(id: number, vendor: Vendor): Observable<Vendor> {
    return this.http.put<Vendor>(`${this.baseUrl}/vendors/${id}`, vendor, { headers: this.getHeaders() });
  }

  deleteVendor(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/vendors/${id}`, { headers: this.getHeaders() });
  }

  // --- Store Endpoints ---
  getStores(): Observable<Store[]> {
    return this.http.get<Store[]>(`${this.baseUrl}/stores`, { headers: this.getHeaders() });
  }

  getStore(id: number): Observable<Store> {
    return this.http.get<Store>(`${this.baseUrl}/stores/${id}`, { headers: this.getHeaders() });
  }

  createStore(store: Store): Observable<Store> {
    return this.http.post<Store>(`${this.baseUrl}/stores`, store, { headers: this.getHeaders() });
  }

  updateStore(id: number, store: Store): Observable<Store> {
    return this.http.put<Store>(`${this.baseUrl}/stores/${id}`, store, { headers: this.getHeaders() });
  }

  deleteStore(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/stores/${id}`, { headers: this.getHeaders() });
  }

  // --- Assignment Endpoints ---
  getAssignments(): Observable<Assignment[]> {
    return this.http.get<Assignment[]>(`${this.baseUrl}/assignments`, { headers: this.getHeaders() });
  }

  getAssignment(id: number): Observable<Assignment> {
    return this.http.get<Assignment>(`${this.baseUrl}/assignments/${id}`, { headers: this.getHeaders() });
  }

  createAssignment(assignment: Assignment): Observable<Assignment> {
    return this.http.post<Assignment>(`${this.baseUrl}/assignments`, assignment, { headers: this.getHeaders() });
  }

  updateAssignment(id: number, assignment: Assignment): Observable<Assignment> {
    return this.http.put<Assignment>(`${this.baseUrl}/assignments/${id}`, assignment, { headers: this.getHeaders() });
  }

  deleteAssignment(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/assignments/${id}`, { headers: this.getHeaders() });
  }

  // --- Testing Endpoints ---
  getTestingRecords(): Observable<Testing[]> {
    return this.http.get<Testing[]>(`${this.baseUrl}/testing`, { headers: this.getHeaders() });
  }

  getTesting(id: number): Observable<Testing> {
    return this.http.get<Testing>(`${this.baseUrl}/testing/${id}`, { headers: this.getHeaders() });
  }

  createTesting(testing: Testing): Observable<Testing> {
    return this.http.post<Testing>(`${this.baseUrl}/testing`, testing, { headers: this.getHeaders() });
  }

  updateTesting(id: number, testing: Testing): Observable<Testing> {
    return this.http.put<Testing>(`${this.baseUrl}/testing/${id}`, testing, { headers: this.getHeaders() });
  }

  deleteTesting(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/testing/${id}`, { headers: this.getHeaders() });
  }

  // --- GatePass Endpoints ---
  getGatePasses(): Observable<GatePass[]> {
    return this.http.get<GatePass[]>(`${this.baseUrl}/gatepasses`, { headers: this.getHeaders() });
  }

  getGatePass(id: number): Observable<GatePass> {
    return this.http.get<GatePass>(`${this.baseUrl}/gatepasses/${id}`, { headers: this.getHeaders() });
  }

  createGatePass(gatepass: GatePass): Observable<GatePass> {
    return this.http.post<GatePass>(`${this.baseUrl}/gatepasses`, gatepass, { headers: this.getHeaders() });
  }

  updateGatePass(id: number, gatepass: GatePass): Observable<GatePass> {
    return this.http.put<GatePass>(`${this.baseUrl}/gatepasses/${id}`, gatepass, { headers: this.getHeaders() });
  }

  deleteGatePass(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/gatepasses/${id}`, { headers: this.getHeaders() });
  }


}
