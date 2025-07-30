import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WzlabhomeComponent } from './wzlabhome.component';

describe('WzlabhomeComponent', () => {
  let component: WzlabhomeComponent;
  let fixture: ComponentFixture<WzlabhomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WzlabhomeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WzlabhomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
