import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NiivueDetailComponent } from './niivue-detail.component';

describe('NiivueDetailComponent', () => {
  let component: NiivueDetailComponent;
  let fixture: ComponentFixture<NiivueDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NiivueDetailComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NiivueDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
