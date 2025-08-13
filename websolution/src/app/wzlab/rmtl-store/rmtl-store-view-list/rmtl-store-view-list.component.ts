import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-store-view-list',
  templateUrl: './rmtl-store-view-list.component.html',
  styleUrls: ['./rmtl-store-view-list.component.css']
})
export class RmtlStoreViewListComponent {
  stores: any[] = [];
  loading = false;

  constructor(private api: ApiServicesService, private router: Router) {}

  ngOnInit(): void {
    this.loading = true;
    this.api.getStores().subscribe({
      next: (data) => {
        this.stores = data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching stores:', err);
        this.loading = false;
      }
    });
  }

  /** Only needed if you prefer programmatic navigation (Option B in HTML) */
  editStore(id: number): void {
    this.router.navigate(['/wzlab/store/edit-store', id]);
  }

  trackById(_: number, item: any) {
    return item?.id ?? _;
  }
}
