// translation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';

export interface TranslateRequest {
  text: string;
  mode: 'word' | 'text';
}

export interface TranslateResponse {
  input: string;
  output: string;
  mode: 'word' | 'text';
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  translate(req: TranslateRequest): Observable<TranslateResponse> {
    return this.http.post<TranslateResponse>(`${this.baseUrl}/translate-mbart`, req);
  }
}
