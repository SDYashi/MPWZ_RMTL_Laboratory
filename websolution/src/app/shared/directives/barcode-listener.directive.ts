import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[appBarcodeListener]'
})
export class BarcodeListenerDirective {
  @Output() barcodeScanned = new EventEmitter<string>();
  private buffer = '';
  private lastTime = 0;
  private readonly TIMEOUT = 100;

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const now = Date.now();
    if (now - this.lastTime > this.TIMEOUT) this.buffer = '';
    this.lastTime = now;

    if (event.key === 'Enter' || event.key === 'Tab') {
      if (this.buffer.length > 0) {
        this.barcodeScanned.emit(this.buffer);
        this.buffer = '';
      }
      return;
    }

    if (event.key.length === 1) this.buffer += event.key;
  }
}
