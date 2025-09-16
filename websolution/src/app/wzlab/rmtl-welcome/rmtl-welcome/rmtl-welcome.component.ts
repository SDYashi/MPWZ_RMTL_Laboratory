import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface ModuleCard {
  title: string;
  description: string;
  route: string;
  emoji: string;
}

@Component({
  selector: 'app-rmtl-welcome',
  templateUrl: './rmtl-welcome.component.html',
  styleUrls: ['./rmtl-welcome.component.css']
})
export class RmtlWelcomeComponent {
  devicesCards: ModuleCard[] = [
    { title: 'Device Type: Meter', emoji: '🔌', route: '/meter',
      description: 'Manage single/three-phase meters, categories & attributes.' },
    { title: 'Device Type: CT', emoji: '🔌', route: '/ct',
      description: 'Configure CT class, ratio, burden and related specs.' },
  ];
  assigmentCards: ModuleCard[] = [
    { title: 'Assignment', emoji: '🧾', route: '/assignment',
      description: 'Assign devices to users/offices and manage accountability.' },
    { title: 'Inward', emoji: '📥', route: '/inward',
      description: 'Register incoming lots, vendors, challans & gate entries.' },
    { title: 'Dispatch', emoji: '🚚', route: '/dispatch',
      description: 'Plan and record device dispatches with gatepass generation.' },
    { title: 'Testing', emoji: '🧪', route: '/testing',
      description: 'Execute test sequences, capture results & attach reports.' },
    { title: 'Reports', emoji: '📊', route: '/reports',
      description: 'Usage, stock, activity & performance analytics.' },
    { title: 'Approval', emoji: '✅', route: '/approval',
      description: 'Review and approve test results and workflow actions.' }
  ];

  constructor(private router: Router) {}

  open(card: ModuleCard) {
    this.router.navigateByUrl(card.route);
  }
}
