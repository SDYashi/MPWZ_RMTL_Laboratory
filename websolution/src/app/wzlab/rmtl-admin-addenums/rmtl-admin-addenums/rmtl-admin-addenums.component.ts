import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ApiServicesService } from 'src/app/services/api-services.service';
interface EnumEntry {
  key: string;
  value: string;
}
@Component({
  selector: 'app-rmtl-admin-addenums',
  templateUrl: './rmtl-admin-addenums.component.html',
  styleUrls: ['./rmtl-admin-addenums.component.css']
})
export class RmtlAdminAddenumsComponent {

  // 🔹 Dropdown enum types
  enumTypes: string[] = [
    "assignmentstatus",
    "capacity",
    "communicationprotocol",
    "connectiontype",
    "ctclass",
    "ctratio",
    "devicestatus",
    "devicetestingpurpose",
    "devicetype",
    "initiator",
    "labstatus",
    "labtype",
    "maintenancestatus",
    "make",
    "metercategory",
    "meterclass",
    "metertype",
    "officetype",
    "operationtype",
    "phase",
    "standard",
    "testingbenchstatus",
    "testingbenchtype",
    "testmethod",
    "testreporttype",
    "teststatus",
    "userstatus",
    "vendorcategory",
    "voltagerating",
    "warrantyperiod",
    "working"
  ];

  // 🔹 bound by ngModel in template
  selectedEnumType: string = '';
  enumKey: string = '';
  enumValue: string = '';

  // list from API
  enumEntries: EnumEntry[] = [];

  loading = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(private enumService: ApiServicesService) {}

  // On change enum type (select)
  onEnumTypeChange(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.enumEntries = [];

    if (!this.selectedEnumType) {
      return;
    }

    this.loading = true;

    this.enumService.getenunsbynames(this.selectedEnumType).subscribe({
      next: (data) => {
        this.enumEntries = Object.entries(data).map(([key, value]) => ({
          key,
          value: String(value)
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading enum values', err);
        this.errorMessage = 'Failed to load enum values.';
        this.loading = false;
      }
    });
  }

  // JSON preview { "ELMEAS": "ELMEAS" }
  get previewPayload(): any {
    const key = (this.enumKey || '').trim();
    const valueRaw = (this.enumValue || '').trim();
    const value = valueRaw || key;
    if (!key) {
      return {};
    }
    return { [key]: value };
  }

  // Handle submit (template-driven)
  onSubmit(form: NgForm): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!form.valid) {
      return;
    }

    const key = (this.enumKey || '').trim();
    const valueRaw = (this.enumValue || '').trim();
    const value = valueRaw || key;

    if (!this.selectedEnumType) {
      this.errorMessage = 'Please select an enum type.';
      return;
    }

    const payload: Record<string, string> = { [key]: value };

    this.submitting = true;

    this.enumService.addEnumValue(this.selectedEnumType, payload).subscribe({
      next: () => {
        this.successMessage = 'Enum value added successfully.';
        this.submitting = false;
        this.enumKey = '';
        this.enumValue = '';

        // reload values
        this.onEnumTypeChange();
        form.form.markAsPristine();
        form.form.markAsUntouched();
      },
      error: (err) => {
        console.error('Error adding enum value', err);
        this.errorMessage = 'Failed to add enum value.';
        this.submitting = false;
      }
    });
  }
}
