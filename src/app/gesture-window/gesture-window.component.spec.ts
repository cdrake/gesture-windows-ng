import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestureWindowComponent } from './gesture-window.component';

describe('GestureWindowComponent', () => {
  let component: GestureWindowComponent;
  let fixture: ComponentFixture<GestureWindowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GestureWindowComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GestureWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
