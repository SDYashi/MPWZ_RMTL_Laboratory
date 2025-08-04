import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';
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
getallUsers(): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}/users/`);
}

getUser(id: number): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}/users/${id}`);
}

updateUser(id: number, user: any): Observable<any> {
  return this.http.put<any>(`${this.baseUrl}/users/${id}`, user);
}

createLab(lab: any): Observable<any> {
  return this.http.post<any>(`${this.baseUrl}/labs`, lab);
}

getallLabs(): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}/labs`);
}
getLabWithBenches(labId: number): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}/labs/${labId}/benches`);
}
getLabById(labId: number): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}/labs/${labId}`);
}
updateLab(id: number, lab: any): Observable<any> {
  return this.http.put<any>(`${this.baseUrl}/labs/${id}`, lab);
}
createUser(user: any): Observable<any> {
  return this.http.post<any>(`${this.baseUrl}/users`, user);
}


}
