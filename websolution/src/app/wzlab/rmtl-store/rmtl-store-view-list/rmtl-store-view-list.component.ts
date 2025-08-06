import { Component } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

@Component({
  selector: 'app-rmtl-store-view-list',
  templateUrl: './rmtl-store-view-list.component.html',
  styleUrls: ['./rmtl-store-view-list.component.css']
})
export class RmtlStoreViewListComponent {

 stores: any[] = [];

  constructor(private api: ApiServicesService) {}

  ngOnInit(): void {
    this.api.getStores().subscribe({
      next: (data) => this.stores = data,
      error: (err) => console.error('Error fetching stores:', err)
    });
  }

  editStore(id: number): void {
    window.location.href = `/stores/edit/${id}`;
  }
}
