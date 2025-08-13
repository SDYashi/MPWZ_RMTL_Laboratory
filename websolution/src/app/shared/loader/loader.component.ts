import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LoadingService } from '../../services/loading.service'; // Adjust the import path as necessary

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoaderComponent {
  loading$: Observable<boolean>;

  constructor(private loading: LoadingService) {
    // Debounce to avoid flicker on very fast requests
    this.loading$ = this.loading.loading$.pipe(
      debounceTime(150),
      distinctUntilChanged()
    );
  }
}
