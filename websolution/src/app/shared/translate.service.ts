import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface LibreTranslateResponse {
  translatedText: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslateService {
  // Public instance (official demo). For production it's recommended to self-host.
  // You may replace this with your own LibreTranslate endpoint (e.g. http://localhost:5000).
  private readonly baseUrl = 'https://libretranslate.com';
  private readonly translatePath = '/translate';
  constructor(private http: HttpClient) {}

  /**
   * Translate text from English to Hindi using LibreTranslate.
   * @param text - source text (English)
   * @param source - source language code (default 'en')
   * @param target - target language code (default 'hi')
   * @param format - 'text' or 'html' (default 'text')
   * @param apiKey - optional API key for hosted instances
   */
  translateEnToHi(
    text: string,
    source = 'en',
    target = 'hi',
    format: 'text' | 'html' = 'text',
    apiKey?: string
  ): Observable<string> {
    if (!text || !text.trim()) {
      return throwError(() => new Error('Text to translate is empty'));
    }

    const url = `${this.baseUrl}${this.translatePath}`;
    const body = {
      q: text,
      source,
      target,
      format,
      api_key: apiKey ?? undefined
    };

    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<LibreTranslateResponse>(url, body, { headers })
      .pipe(
        map(res => {
          return res.translatedText;
        }),
        catchError(err => {
          const msg = (err?.error && err.error.error) ? err.error.error
                    : (err?.message || 'Translation failed');
          return throwError(() => new Error(`LibreTranslate error: ${msg}`));
        })
      );
  }
}
