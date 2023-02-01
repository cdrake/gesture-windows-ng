import { TestBed } from '@angular/core/testing';

import { GestureService } from './gesture.service';

describe('GestureServiceService', () => {
  let service: GestureService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GestureService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
