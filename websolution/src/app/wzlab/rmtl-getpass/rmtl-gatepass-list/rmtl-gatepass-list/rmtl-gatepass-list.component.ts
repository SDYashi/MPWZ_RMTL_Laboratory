import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
// import * as html2pdf from './html2pdf.js';
// const html2pdf = require('html2pdf.js')

@Component({
  selector: 'app-rmtl-gatepass-list',
  templateUrl: './rmtl-gatepass-list.component.html',
  styleUrls: ['./rmtl-gatepass-list.component.css']
})
export class RmtlGatepassListComponent implements OnInit {

  // Filters
  startDate: string = '';
  endDate: string = '';
  selectedInward: string = '';

  // Sample Inward No list
  inwardNos: string[] = ['INW001', 'INW002', 'INW003'];

  // Sample Data
  allDevices = [
    {
      inward_no: 'INW001',
      serial_number: 'SN1001',
      make: 'Genus',
      meter_category: 'Category A',
      phase: '1P',
      meter_type: 'DLMS',
      dispatch_date: '2025-08-01'
    },
    {
      inward_no: 'INW002',
      serial_number: 'SN1002',
      make: 'Secure',
      meter_category: 'Category B',
      phase: '3P',
      meter_type: 'Modbus',
      dispatch_date: '2025-08-03'
    },
    {
      inward_no: 'INW003',
      serial_number: 'SN1003',
      make: 'HPL',
      meter_category: 'Category A',
      phase: '1P',
      meter_type: 'DLMS',
      dispatch_date: '2025-08-04'
    }
  ];

  // Filtered Data
  filteredDevices: any[] = [];

  ngOnInit(): void {
    this.filteredDevices = [...this.allDevices];
  }

  applyFilters(): void {
    this.filteredDevices = this.allDevices.filter(device => {
      const matchInward = this.selectedInward ? device.inward_no === this.selectedInward : true;

      const deviceDate = new Date(device.dispatch_date).getTime();
      const from = this.startDate ? new Date(this.startDate).getTime() : null;
      const to = this.endDate ? new Date(this.endDate).getTime() : null;

      const matchDate =
        (!from || deviceDate >= from) &&
        (!to || deviceDate <= to);

      return matchInward && matchDate;
    });
  }

  resetFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.selectedInward = '';
    this.filteredDevices = [...this.allDevices];
  }

  exportToExcel(): void {
  const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredDevices);
  const workbook: XLSX.WorkBook = {
    Sheets: { 'Dispatched Devices': worksheet },
    SheetNames: ['Dispatched Devices']
  };
  const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  FileSaver.saveAs(blob, `DispatchedDevices_${new Date().toISOString().slice(0,10)}.xlsx`);
}

exportToPDF(): void {
  const element = document.getElementById('printSection');
  const opt = {
    margin:       0.5,
    filename:     `DispatchedDevices_${new Date().toISOString().slice(0,10)}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
  };
  if (element) {
    // html2pdf().from(element).set(opt).save();
  }
}

}
