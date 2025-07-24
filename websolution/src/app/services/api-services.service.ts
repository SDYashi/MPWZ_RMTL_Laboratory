import { Injectable } from '@angular/core';
import { environment } from 'src/environment/environment.prod';
@Injectable({
  providedIn: 'root'
})
export class ApiServicesService {

constructor() { } 
private baseUrl = environment.apiUrl;


}
