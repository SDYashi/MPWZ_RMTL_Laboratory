import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment.prod';
@Injectable({
  providedIn: 'root'
})
export class ApiServicesService {

constructor( private  http: HttpClient) {} 
private baseUrl = environment.apiUrl;
getlogin(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/token`, { username, password });
}

}
