import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-rmtl-home',
  templateUrl: './rmtl-home.component.html',
  styleUrls: ['./rmtl-home.component.css']
})
export class RmtlHomeComponent {

  @ViewChild('usageChart') usageChartRef!: ElementRef;

  ngAfterViewInit(): void {
    this.setupSidebarToggle();
    this.setupSubmenuToggle();
    this.setupProfileDropdown();
    this.initSubmenusState();
    this.initChart();
    this.animateCards();
  }

  setupSidebarToggle(): void {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const app = document.getElementById('app');

    sidebarToggle?.addEventListener('click', () => {
      sidebar?.classList.toggle('collapsed');
      app?.classList.toggle('sidebar-collapsed');
    });
  }

  setupSubmenuToggle(): void {
    const menuItems = document.querySelectorAll('#sidebar > .list-unstyled > li > a');
    menuItems.forEach(item => {
      const submenu = item.nextElementSibling as HTMLElement;
      const chevron = item.querySelector('.chevron');

      if (submenu && submenu.tagName === 'UL') {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const isVisible = submenu.style.display === 'block';
          submenu.style.display = isVisible ? 'none' : 'block';
          if (chevron) {
            chevron.classList.toggle('fa-chevron-down', isVisible);
            chevron.classList.toggle('fa-chevron-up', !isVisible);
          }
        });
      }
    });
  }

  setupProfileDropdown(): void {
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileDropdown) {
      profileDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('show');
      });

      document.addEventListener('click', (e) => {
        if (!profileDropdown.contains(e.target as Node)) {
          profileDropdown.classList.remove('show');
        }
      });
    }
  }

  initSubmenusState(): void {
    const submenus = document.querySelectorAll('#sidebar > .list-unstyled > li > ul');
    submenus.forEach(submenu => {
      (submenu as HTMLElement).style.display = 'none';
    });
  }

  initChart(): void {
    const ctx = this.usageChartRef?.nativeElement.getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
          {
            label: 'Energy Consumption (kWh)',
            data: [1200, 1900, 1500, 1800, 2200, 2500, 2800, 2600, 2300, 2000, 1800, 1500],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 3,
            pointRadius: 5,
            pointBackgroundColor: '#10b981',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Water Usage (m³)',
            data: [800, 1200, 1000, 1400, 1600, 1800, 2000, 1900, 1700, 1500, 1300, 1100],
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderWidth: 3,
            pointRadius: 5,
            pointBackgroundColor: '#6366f1',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#f8fafc',
              font: { size: 12 }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: '#94a3b8' }
          },
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  }

  animateCards(): void {
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
      (card as HTMLElement).style.animation = `fadeIn 0.5s ease forwards ${index * 0.1}s`;
      (card as HTMLElement).style.opacity = '0';
    });
  }
}
