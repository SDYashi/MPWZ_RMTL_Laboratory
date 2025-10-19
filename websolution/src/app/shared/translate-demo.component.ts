import { Component } from '@angular/core';
import { TranslateService } from './translate.service';

@Component({
  selector: 'app-translate-demo',
  template: `
    <div class="p-3">
      <h4>English → Hindi Translator</h4>
      <textarea [(ngModel)]="sourceText" rows="4" class="form-control" placeholder="Type English text"></textarea>
      <div class="mt-2">
        <button class="btn btn-primary" (click)="translate()" [disabled]="loading">Translate</button>
      </div>

      <div *ngIf="loading" class="mt-2">Translating…</div>
      <div *ngIf="error" class="mt-2 text-danger">{{ error }}</div>

      <div *ngIf="translated" class="mt-3">
        <h5>Hindi</h5>
        <div class="card card-body">{{ translated }}</div>
      </div>
    </div>
  `
})
export class TranslateDemoComponent {
  sourceText = '';
  translated?: string;
  loading = false;
  error?: string;

  constructor(private translateService: TranslateService) {}

  translate() {
    this.error = undefined;
    this.translated = undefined;

    if (!this.sourceText.trim()) {
      this.error = 'Please enter text to translate.';
      return;
    }

    this.loading = true;
    this.translateService.translateEnToHi(this.sourceText)
      .subscribe({
        next: (res) => {
          this.translated = res;
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.message || 'Translation failed';
          this.loading = false;
        }
      });
  }
}
