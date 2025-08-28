import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardTemporal } from './dashboard-temporal';

describe('DashboardTemporal', () => {
  let component: DashboardTemporal;
  let fixture: ComponentFixture<DashboardTemporal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardTemporal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardTemporal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
