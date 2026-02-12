import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RmtlTestingDashboardComponent } from './rmtl-testing-dashboard.component';

describe('RmtlTestingDashboardComponent', () => {
  let component: RmtlTestingDashboardComponent;
  let fixture: ComponentFixture<RmtlTestingDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RmtlTestingDashboardComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RmtlTestingDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
