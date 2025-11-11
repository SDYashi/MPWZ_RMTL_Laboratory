import { Component, OnInit } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';

interface EnumGroup {
  key: string;
  label: string;
  values: (string | number)[];
}

@Component({
  selector: 'app-rmtl-admin-listenums',
  templateUrl: './rmtl-admin-listenums.component.html',
  styleUrls: ['./rmtl-admin-listenums.component.css']
})
export class RmtlAdminListenumsComponent implements OnInit {

constructor( private apiserivce: ApiServicesService) { }  
  rawConfig: Record<string, (string | number)[]> = {}
  enumGroups: EnumGroup[] = [];
  searchText = '';


  // Convert rawConfig into an array so we can *ngFor easily
  buildEnumGroups(): void {
    this.enumGroups = Object.entries(this.rawConfig).map(([key, values]) => ({
      key,
      label: this.formatKey(key),
      values
    }));
  }

  // Convert "device_types" -> "Device Types"
  formatKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  // Filter groups by search text (on title or values)
  get filteredGroups(): EnumGroup[] {
    if (!this.searchText.trim()) {
      return this.enumGroups;
    }
    const s = this.searchText.toLowerCase();
    return this.enumGroups.filter(group =>
      group.label.toLowerCase().includes(s) ||
      group.values.some(v => String(v).toLowerCase().includes(s))
    );
  }

  ngOnInit(): void { this.apiserivce.getEnums().subscribe((data) => {
    this.rawConfig = data;
    this.buildEnumGroups();  // UI automatically updates
  });
}

}

