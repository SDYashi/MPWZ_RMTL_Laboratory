import { PipeTransform } from "@angular/core";

export class FontSizePipe implements PipeTransform {
  transform(value: string): string {
    return value.toUpperCase();
  }
}
